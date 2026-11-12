<?php

namespace App\Http\Resources\Admin;

use App\Enums\OrderPaymentStatus;
use App\Models\AdminUser;
use App\Models\Order;
use App\Support\Money;
use App\Support\OrderActions;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * One row of the dashboard order list. Only what the list shows: no email, address, notes or
 * payment details (those are on the order page, behind the same permission).
 *
 * @mixin Order
 */
class OrderListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status->value,
            'payment_status' => $this->payment_status->value,
            'payment_method' => $this->payment_method->value,
            'customer' => [
                'first_name' => $this->customer_first_name,
                'last_name' => $this->customer_last_name,
                'phone' => $this->customer_phone,
            ],
            // Units ordered (sum of quantities) and order lines.
            'items_count' => (int) ($this->items_sum_quantity ?? 0),
            'lines_count' => (int) ($this->items_count ?? 0),
            'total' => Money::of($this->total_piastres),
            'governorate' => ['id' => $this->shipping_governorate_id, 'en' => $this->shipping_governorate_name_en, 'ar' => $this->shipping_governorate_name_ar],
            // Money was received for an order that is no longer going ahead.
            'refund_review' => $this->payment_status === OrderPaymentStatus::Paid && in_array($this->status->value, OrderResource::REFUND_REVIEW_STATUSES, true),
            'placed_at' => $this->placed_at->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            // When the fulfillment stage last changed (from the status history), if loaded.
            'last_status_at' => $this->last_status_at ? Carbon::parse($this->last_status_at, 'UTC')->toIso8601String() : null,
            // Row actions for this admin (null without orders.manage).
            'actions' => ($admin = $request->user('admin')) instanceof AdminUser ? OrderActions::quick($this->resource, $admin) : null,
        ];
    }
}
