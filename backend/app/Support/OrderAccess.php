<?php

namespace App\Support;

use App\Models\Order;
use Illuminate\Http\Request;

/** Opens an order for its signed-in customer (session) or for a guest with its private token. */
final class OrderAccess
{
    /** The signed-in customer's own order, or a guest order opened with its token; otherwise 404. */
    public static function resolve(Request $request, string $orderNumber): Order
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
