<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Card payment for a pending order, for its customer (session) or guest (private token).
 * - POST .../pay           → { redirect_url } to the provider's hosted payment page
 * - POST .../payment-status → asks the provider directly, then returns the order (for the
 *                            return page, which never trusts the redirect itself)
 */
class OrderPaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    public function pay(Request $request, string $orderNumber): JsonResponse
    {
        $result = $this->payments->startCardPayment($this->order($request, $orderNumber));

        return response()->json(['data' => [
            'redirect_url' => $result['redirect_url'],
            'merchant_reference' => $result['payment']->merchant_reference,
        ]], 201);
    }

    public function status(Request $request, string $orderNumber): OrderResource
    {
        $order = $this->order($request, $orderNumber);
        $this->payments->syncLatest($order);

        return new OrderResource($order->refresh()->load(['items', 'histories']));
    }

    /** The signed-in customer's own order, or a guest order opened with its token; otherwise 404. */
    private function order(Request $request, string $orderNumber): Order
    {
        $customer = $request->user('customer');
        $query = Order::query()->where('order_number', $orderNumber);

        if ($customer !== null && $customer->is_active) {
            $order = (clone $query)->where('customer_id', $customer->id)->first();
            if ($order) {
                return $order;
            }
        }

        $order = $query->whereNull('customer_id')->first();
        $token = (string) $request->input('token', '');
        abort_unless($order !== null && $token !== '' && $order->hasGuestToken($token), 404);

        return $order;
    }
}
