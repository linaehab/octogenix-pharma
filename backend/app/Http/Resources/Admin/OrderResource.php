<?php

namespace App\Http\Resources\Admin;

use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Resources\OrderResource as CustomerOrderResource;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Support\Money;
use App\Support\OrderActions;
use Illuminate\Http\Request;

/**
 * Dashboard view: the customer view (historical snapshots: items, prices, address and totals as
 * placed) plus internal fields, payments, the full history, the order's stock movements, what
 * was received, warnings and the actions this admin may take now. @mixin Order
 */
class OrderResource extends CustomerOrderResource
{
    /** Order states in which money already received may have to be returned. */
    public const REFUND_REVIEW_STATUSES = ['cancelled', 'expired', 'returned'];

    public function toArray(Request $request): array
    {
        $succeeded = $this->relationLoaded('payments')
            ? $this->payments->where('status', PaymentStatus::Succeeded)
            : collect();
        $received = (int) $succeeded->sum('amount_piastres');
        $closed = in_array($this->status, [OrderStatus::Cancelled, OrderStatus::Expired], true);

        return [
            'id' => $this->id,
            ...parent::toArray($request),
            'customer_id' => $this->customer_id,
            'is_guest' => $this->isGuestOrder(),
            'admin_note' => $this->admin_note,
            'cancelled_by' => $this->cancelled_by,
            'cancellation_reason' => $this->cancellation_reason,
            'governorate_id' => $this->shipping_governorate_id,
            'updated_at' => $this->updated_at?->toIso8601String(),
            'timestamps' => [
                'confirmed_at' => $this->confirmed_at?->toIso8601String(),
                'paid_at' => $this->paid_at?->toIso8601String(),
                'shipped_at' => $this->shipped_at?->toIso8601String(),
                'delivered_at' => $this->delivered_at?->toIso8601String(),
                'cancelled_at' => $this->cancelled_at?->toIso8601String(),
                'returned_at' => $this->returned_at?->toIso8601String(),
            ],
            // From the payment records: what was actually received, and what is still to come.
            'amounts' => [
                'received' => Money::of($received),
                'outstanding' => Money::of($closed ? 0 : max(0, $this->total_piastres - $received)),
            ],
            'warnings' => array_values(array_filter([
                $this->payment_status === OrderPaymentStatus::Paid && in_array($this->status->value, self::REFUND_REVIEW_STATUSES, true)
                    ? 'refund_may_be_due' : null,
                $succeeded->count() > 1 || $received > $this->total_piastres ? 'duplicate_payment' : null,
                $this->relationLoaded('payments') && $this->payments->contains('is_test', true) ? 'test_payment' : null,
            ])),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn (Payment $p) => [
                'id' => $p->id,
                'provider' => $p->provider,
                'method' => $p->method->value,
                'status' => $p->status->value,
                'amount' => Money::of($p->amount_piastres),
                'merchant_reference' => $p->merchant_reference,
                'provider_transaction_id' => $p->provider_transaction_id,
                'provider_reference' => $p->provider_reference,
                'card_brand' => $p->card_brand,
                'card_last4' => $p->card_last4,
                'failure_message' => $p->failure_message,
                'is_test' => $p->is_test,
                'created_at' => $p->created_at?->toIso8601String(),
                'paid_at' => $p->paid_at?->toIso8601String(),
                'collected_by_admin_id' => $p->collected_by_admin_id,
                'collected_by' => $p->collectedBy ? ['id' => $p->collectedBy->id, 'name' => $p->collectedBy->name] : null,
            ])->all()),
            'history' => $this->whenLoaded('histories', fn () => $this->histories->map(fn (OrderStatusHistory $h) => [
                'field' => $h->field,
                'from' => $h->from_value,
                'to' => $h->to_value,
                'actor' => $h->actor_type->value,
                'admin' => $h->admin ? ['id' => $h->admin->id, 'name' => $h->admin->name] : null,
                'note' => $h->note,
                'customer_visible' => $h->is_customer_visible,
                'at' => $h->created_at->toIso8601String(),
            ])->all()),
            'stock_movements' => InventoryMovement::query()
                ->where('order_id', $this->id)
                ->with(['admin', 'variant' => fn ($q) => $q->withTrashed()])
                ->orderBy('id')->get()
                ->map(fn (InventoryMovement $m) => [
                    'reason' => $m->reason->value,
                    'quantity_change' => $m->quantity_change,
                    'sku' => $m->variant?->sku,
                    'admin' => $m->admin ? ['id' => $m->admin->id, 'name' => $m->admin->name] : null,
                    'at' => $m->created_at->toIso8601String(),
                ])->all(),
            'actions' => $request->user('admin') instanceof AdminUser ? OrderActions::for($this->resource, $request->user('admin')) : null,
        ];
    }
}
