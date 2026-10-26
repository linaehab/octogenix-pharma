<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderActor;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\OrderResource;
use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * index/show need orders.view; status and note changes need orders.manage; recording COD cash
 * needs payments.manage (enforced on the routes).
 */
class OrderController extends Controller
{
    private const RELATIONS = ['items', 'payments', 'histories.admin'];

    /** Statuses an admin may set. pending_* and expired are set by checkout / the system. */
    private const ADMIN_STATUSES = [
        OrderStatus::Confirmed, OrderStatus::Processing, OrderStatus::Shipped,
        OrderStatus::Delivered, OrderStatus::Cancelled, OrderStatus::Returned,
    ];

    public function __construct(private readonly OrderStatusService $statuses) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::enum(OrderStatus::class)],
            'payment_status' => ['sometimes', Rule::enum(OrderPaymentStatus::class)],
            'payment_method' => ['sometimes', Rule::enum(PaymentMethod::class)],
            'search' => ['sometimes', 'string', 'max:100'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return OrderResource::collection(
            Order::query()
                ->with('items')
                ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('status', $v))
                ->when($filters['payment_status'] ?? null, fn (Builder $q, $v) => $q->where('payment_status', $v))
                ->when($filters['payment_method'] ?? null, fn (Builder $q, $v) => $q->where('payment_method', $v))
                ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->where('placed_at', '>=', $v))
                ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->where('placed_at', '<=', $v))
                ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                    $like = '%'.addcslashes($search, '%_\\').'%';
                    $q->where(fn (Builder $q) => $q->where('order_number', 'like', $like)
                        ->orWhere('customer_email', 'like', $like)
                        ->orWhere('customer_phone', 'like', $like)
                        ->orWhere('customer_last_name', 'like', $like));
                })
                ->latest('placed_at')->latest('id')
                ->paginate($filters['per_page'] ?? 25)
        );
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order->load(self::RELATIONS));
    }

    /** Body: { status, note? } */
    public function updateStatus(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_map(fn (OrderStatus $s) => $s->value, self::ADMIN_STATUSES))],
            'note' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        $to = OrderStatus::from($data['status']);

        if ($to === OrderStatus::Confirmed && $order->payment_method === PaymentMethod::Card
            && $order->payment_status !== OrderPaymentStatus::Paid) {
            throw ValidationException::withMessages([
                'status' => 'Card orders are confirmed automatically once the payment is verified.',
            ]);
        }

        $this->statuses->transition($order, $to, OrderActor::Admin, $request->user('admin'), $data['note'] ?? null);

        return new OrderResource($order->load(self::RELATIONS));
    }

    /** Internal note; never shown to the customer. */
    public function updateNote(Request $request, Order $order): OrderResource
    {
        $order->forceFill($request->validate(['admin_note' => ['present', 'nullable', 'string', 'max:5000']]))->save();

        return new OrderResource($order->load(self::RELATIONS));
    }

    public function codCollected(Request $request, Order $order): OrderResource
    {
        $this->statuses->markCodCollected($order, $request->user('admin'),
            $request->validate(['note' => ['sometimes', 'nullable', 'string', 'max:1000']])['note'] ?? null);

        return new OrderResource($order->load(self::RELATIONS));
    }

    public function restockReturned(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:500']]);

        $this->statuses->restockReturned($order, $request->user('admin'), $data['note']);

        return response()->json(['message' => 'The returned items are back in stock.']);
    }
}
