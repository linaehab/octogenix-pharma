<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Enums\OrderActor;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

/** The signed-in customer's order history. Other customers' order numbers return 404. */
class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection(
            Order::query()->where('customer_id', $request->user('customer')->id)
                ->with('items')->latest('placed_at')->latest('id')->paginate(20)
        );
    }

    public function show(Request $request, string $orderNumber): OrderResource
    {
        return new OrderResource($this->find($request, $orderNumber)->load(['items', 'histories']));
    }

    public function cancel(Request $request, string $orderNumber, OrderStatusService $statuses): OrderResource
    {
        $order = $this->find($request, $orderNumber);

        if (! $order->status->isCancellableByCustomer()) {
            throw ValidationException::withMessages(['status' => 'This order can no longer be cancelled online. Please contact us.']);
        }

        $statuses->transition($order, OrderStatus::Cancelled, OrderActor::Customer,
            note: $request->validate(['reason' => ['sometimes', 'nullable', 'string', 'max:500']])['reason'] ?? null);

        return new OrderResource($order->load(['items', 'histories']));
    }

    private function find(Request $request, string $orderNumber): Order
    {
        return Order::query()
            ->where('customer_id', $request->user('customer')->id)
            ->where('order_number', $orderNumber)
            ->firstOrFail();
    }
}
