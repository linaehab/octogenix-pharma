<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderActor;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Notifications\OrderAccessLinkNotification;
use App\Services\OrderStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Guest orders (decision C6), opened with the private token from the confirmation email.
 * A wrong token and an unknown order number give the same 404.
 */
class GuestOrderController extends Controller
{
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

        $statuses->transition($order, OrderStatus::Cancelled, OrderActor::Guest,
            note: $request->validate(['reason' => ['sometimes', 'nullable', 'string', 'max:500']])['reason'] ?? null);

        return new OrderResource($order->load(['items', 'histories']));
    }

    /**
     * "Find my order": emails a fresh link to the order's email address. Always the same answer,
     * so it cannot be used to discover orders or emails. Issuing a new link invalidates the old one.
     */
    public function lookup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_number' => ['required', 'string', 'max:20'],
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $order = Order::query()
            ->whereNull('customer_id')
            ->where('order_number', $data['order_number'])
            ->where('customer_email', Str::lower(trim($data['email'])))
            ->first();

        if ($order) {
            $token = Str::random(48);
            DB::table('orders')->where('id', $order->id)->update(['guest_access_token_hash' => hash('sha256', $token)]);
            Notification::route('mail', $order->customer_email)->notify(new OrderAccessLinkNotification($order, $token));
        }

        return response()->json(['message' => 'If the details match an order, we have emailed a link to it.'], 202);
    }

    private function find(Request $request, string $orderNumber): Order
    {
        $token = (string) $request->query('token', $request->input('token', ''));
        $order = Order::query()->whereNull('customer_id')->where('order_number', $orderNumber)->first();

        abort_unless($order !== null && $token !== '' && $order->hasGuestToken($token), 404);

        return $order;
    }
}
