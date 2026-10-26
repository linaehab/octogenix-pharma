<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\OrderResource as CustomerOrderResource;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Support\Money;
use Illuminate\Http\Request;

/** Dashboard view: the customer view plus internal fields, payments and the full history. @mixin Order */
class OrderResource extends CustomerOrderResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            ...parent::toArray($request),
            'customer_id' => $this->customer_id,
            'is_guest' => $this->isGuestOrder(),
            'admin_note' => $this->admin_note,
            'cancelled_by' => $this->cancelled_by,
            'cancellation_reason' => $this->cancellation_reason,
            'timestamps' => [
                'confirmed_at' => $this->confirmed_at?->toIso8601String(),
                'paid_at' => $this->paid_at?->toIso8601String(),
                'shipped_at' => $this->shipped_at?->toIso8601String(),
                'delivered_at' => $this->delivered_at?->toIso8601String(),
                'cancelled_at' => $this->cancelled_at?->toIso8601String(),
                'returned_at' => $this->returned_at?->toIso8601String(),
            ],
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn (Payment $p) => [
                'id' => $p->id,
                'provider' => $p->provider,
                'method' => $p->method->value,
                'status' => $p->status->value,
                'amount' => Money::of($p->amount_piastres),
                'paid_at' => $p->paid_at?->toIso8601String(),
                'collected_by_admin_id' => $p->collected_by_admin_id,
            ])->all()),
            'history' => $this->whenLoaded('histories', fn () => $this->histories->map(fn (OrderStatusHistory $h) => [
                'field' => $h->field,
                'from' => $h->from_value,
                'to' => $h->to_value,
                'actor' => $h->actor_type->value,
                'admin' => $h->admin ? ['id' => $h->admin->id, 'name' => $h->admin->name] : null,
                'note' => $h->note,
                'at' => $h->created_at->toIso8601String(),
            ])->all()),
        ];
    }
}
