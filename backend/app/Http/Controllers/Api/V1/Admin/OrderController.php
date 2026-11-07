<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderActor;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\OrderListResource;
use App\Http\Resources\Admin\OrderResource;
use App\Models\Order;
use App\Services\DashboardSummaryService;
use App\Services\OrderStatusService;
use App\Support\OrderActions;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * index/show need orders.view; status and note changes need orders.manage; recording COD cash
 * needs payments.manage; restocking returns also needs inventory.manage (enforced on the routes).
 * The order rules themselves live in OrderStatus and OrderStatusService.
 */
class OrderController extends Controller
{
    private const RELATIONS = ['items', 'payments.collectedBy', 'histories.admin'];

    public function __construct(private readonly OrderStatusService $statuses) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::enum(OrderStatus::class)],
            'payment_status' => ['sometimes', Rule::enum(OrderPaymentStatus::class)],
            'payment_method' => ['sometimes', Rule::enum(PaymentMethod::class)],
            'governorate_id' => ['sometimes', 'integer'],
            'search' => ['sometimes', 'string', 'max:100'],
            // Calendar days in Egyptian time (as on the dashboard), inclusive.
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $day = fn (string $date) => CarbonImmutable::createFromFormat('Y-m-d', $date, DashboardSummaryService::TIMEZONE);

        $page = Order::query()
            ->withCount('items')
            ->withSum('items', 'quantity')
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('status', $v))
            ->when($filters['payment_status'] ?? null, fn (Builder $q, $v) => $q->where('payment_status', $v))
            ->when($filters['payment_method'] ?? null, fn (Builder $q, $v) => $q->where('payment_method', $v))
            ->when($filters['governorate_id'] ?? null, fn (Builder $q, $v) => $q->where('shipping_governorate_id', $v))
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->where('placed_at', '>=', $day($v)->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->where('placed_at', '<=', $day($v)->endOfDay()->utc()))
            ->when($filters['search'] ?? null, fn (Builder $q, string $search) => $this->search($q, $search))
            ->latest('placed_at')->latest('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => OrderListResource::collection($page->getCollection())->resolve($request),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
            'options' => [
                // Governorates that appear on orders (names as stored on the orders).
                'governorates' => Order::query()
                    ->select('shipping_governorate_id as id', 'shipping_governorate_name_en as en', 'shipping_governorate_name_ar as ar')
                    ->distinct()->orderBy('shipping_governorate_name_en')->get(),
            ],
        ]);
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order->load(self::RELATIONS));
    }

    /**
     * Body: { status, note?, expected_status? }. A cancellation needs a reason. With
     * expected_status, the change is refused (409) if the order moved on meanwhile.
     */
    public function updateStatus(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_map(fn (OrderStatus $s) => $s->value, OrderActions::ADMIN_STATUSES))],
            'note' => [
                Rule::requiredIf(in_array($request->input('status'), array_map(fn (OrderStatus $s) => $s->value, OrderActions::REASON_REQUIRED), true)),
                'nullable', 'string', 'max:1000',
            ],
            'expected_status' => ['sometimes', Rule::enum(OrderStatus::class)],
        ]);
        $to = OrderStatus::from($data['status']);

        if ($to === OrderStatus::Confirmed && $order->payment_method === PaymentMethod::Card
            && $order->payment_status !== OrderPaymentStatus::Paid) {
            throw ValidationException::withMessages([
                'status' => 'Card orders are confirmed automatically once the payment is verified.',
            ]);
        }

        $this->statuses->transition($order, $to, OrderActor::Admin, $request->user('admin'), $data['note'] ?? null,
            isset($data['expected_status']) ? OrderStatus::from($data['expected_status']) : null);

        return new OrderResource($order->load(self::RELATIONS));
    }

    /** Internal note; never shown to the customer. */
    public function updateNote(Request $request, Order $order): OrderResource
    {
        $order->forceFill($request->validate(['admin_note' => ['present', 'nullable', 'string', 'max:5000']]))->save();

        return new OrderResource($order->load(self::RELATIONS));
    }

    /** Body: { note?, expected_payment_status? }. Refused once the cash is already recorded. */
    public function codCollected(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'note' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'expected_payment_status' => ['sometimes', Rule::enum(OrderPaymentStatus::class)],
        ]);

        $this->statuses->markCodCollected($order, $request->user('admin'), $data['note'] ?? null,
            isset($data['expected_payment_status']) ? OrderPaymentStatus::from($data['expected_payment_status']) : null);

        return new OrderResource($order->load(self::RELATIONS));
    }

    public function restockReturned(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:500']]);

        $this->statuses->restockReturned($order, $request->user('admin'), $data['note']);

        return response()->json(['message' => 'The returned items are back in stock.']);
    }

    /** Order number, customer name (first, last or both) or phone (010… matches +2010…). */
    private function search(Builder $query, string $search): void
    {
        $term = trim($search);
        $like = '%'.addcslashes($term, '%_\\').'%';
        $digits = ltrim(preg_replace('/\D/', '', $term), '0');

        $query->where(function (Builder $q) use ($like, $digits) {
            $q->where('order_number', 'like', $like)
                ->orWhere('customer_first_name', 'like', $like)
                ->orWhere('customer_last_name', 'like', $like)
                ->orWhereRaw("CONCAT(customer_first_name, ' ', customer_last_name) LIKE ?", [$like])
                ->orWhere('customer_email', 'like', $like);
            if (strlen($digits) >= 4) {
                $q->orWhere('customer_phone', 'like', '%'.$digits.'%')->orWhere('shipping_phone', 'like', '%'.$digits.'%');
            }
        });
    }
}
