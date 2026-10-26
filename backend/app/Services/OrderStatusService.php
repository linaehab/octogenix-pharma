<?php

namespace App\Services;

use App\Enums\InventoryReason;
use App\Enums\OrderActor;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only code that changes an order's status or payment status (design v0.3 §7.2).
 * Every change locks the order row, checks the allowed transitions, keeps stock in step,
 * and writes an order_status_histories row.
 */
class OrderStatusService
{
    public function __construct(private readonly InventoryService $inventory) {}

    /** @throws ValidationException when the transition is not allowed */
    public function transition(
        Order $order,
        OrderStatus $to,
        OrderActor $actor,
        ?AdminUser $admin = null,
        ?string $note = null,
    ): Order {
        DB::transaction(function () use ($order, $to, $actor, $admin, $note) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $locked->status;

            if (! $from->canBecome($to)) {
                throw ValidationException::withMessages([
                    'status' => "An order cannot go from {$from->value} to {$to->value}.",
                ]);
            }
            if ($to === OrderStatus::Cancelled && $locked->payment_method === PaymentMethod::Card
                && $locked->payment_status === OrderPaymentStatus::Paid) {
                // Needs the refund policy and refunds feature (decision D-05).
                throw ValidationException::withMessages([
                    'status' => 'A paid card order cannot be cancelled until refunds are supported.',
                ]);
            }

            $changes = ['status' => $to];
            if ($column = $to->timestampColumn()) {
                $changes[$column] = now();
            }
            if ($to === OrderStatus::Cancelled || $to === OrderStatus::Expired) {
                $changes['cancelled_by'] = $actor === OrderActor::Admin ? 'admin'
                    : ($actor === OrderActor::System ? 'system' : 'customer');
                $changes['cancellation_reason'] = $note;
            }
            $locked->forceFill($changes)->save();

            if ($to->releasesStock()) {
                $this->releaseStock($locked, $admin, $note);
                $locked->payments()
                    ->whereIn('status', [PaymentStatus::Initiated, PaymentStatus::Pending])
                    ->update(['status' => $to === OrderStatus::Expired ? PaymentStatus::Expired : PaymentStatus::Cancelled]);
            }

            $this->record($locked, 'status', $from->value, $to->value, $actor, $admin, $note);
            $order->setRawAttributes($locked->getAttributes(), sync: true);
        });

        return $order;
    }

    /** Admin confirms the cash for a delivered COD order was received. */
    public function markCodCollected(Order $order, AdminUser $admin, ?string $note = null): Order
    {
        DB::transaction(function () use ($order, $admin, $note) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($locked->payment_method !== PaymentMethod::Cod) {
                throw ValidationException::withMessages(['payment' => 'Only cash-on-delivery orders are collected.']);
            }
            if ($locked->status !== OrderStatus::Delivered) {
                throw ValidationException::withMessages(['payment' => 'Cash can be recorded only after delivery.']);
            }
            if ($locked->payment_status === OrderPaymentStatus::Paid) {
                throw ValidationException::withMessages(['payment' => 'The cash for this order was already recorded.']);
            }

            $locked->payments()->where('status', PaymentStatus::Pending)->update([
                'status' => PaymentStatus::Succeeded,
                'verified_at' => now(),
                'paid_at' => now(),
                'collected_by_admin_id' => $admin->id,
            ]);
            $locked->forceFill(['payment_status' => OrderPaymentStatus::Paid, 'paid_at' => now()])->save();

            $this->record($locked, 'payment_status', OrderPaymentStatus::Unpaid->value, OrderPaymentStatus::Paid->value,
                OrderActor::Admin, $admin, $note);
            $order->setRawAttributes($locked->getAttributes(), sync: true);
        });

        return $order;
    }

    /** Puts returned goods back into stock after an admin checked they are sellable. Once per order. */
    public function restockReturned(Order $order, AdminUser $admin, string $note): void
    {
        DB::transaction(function () use ($order, $admin, $note) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== OrderStatus::Returned) {
                throw ValidationException::withMessages(['order' => 'Only returned orders can be restocked.']);
            }
            if (InventoryMovement::query()->where('order_id', $locked->id)->where('reason', InventoryReason::ReturnRestock)->exists()) {
                throw ValidationException::withMessages(['order' => 'This order was already restocked.']);
            }

            foreach ($locked->items()->with('variant')->get() as $item) {
                $this->inventory->adjust($item->variant, $item->quantity, InventoryReason::ReturnRestock, $admin, $note, $locked->id);
            }
        });
    }

    public function record(
        Order $order,
        string $field,
        ?string $from,
        string $to,
        OrderActor $actor,
        ?AdminUser $admin = null,
        ?string $note = null,
        bool $customerVisible = true,
    ): void {
        $order->histories()->create([
            'field' => $field,
            'from_value' => $from,
            'to_value' => $to,
            'actor_type' => $actor,
            'admin_user_id' => $admin?->id,
            'note' => $note,
            'is_customer_visible' => $customerVisible,
        ]);
    }

    private function releaseStock(Order $order, ?AdminUser $admin, ?string $note): void
    {
        /** @var OrderItem $item */
        foreach ($order->items()->with('variant')->orderBy('product_variant_id')->get() as $item) {
            $this->inventory->adjust($item->variant, $item->quantity, InventoryReason::OrderReleased, $admin, $note, $order->id);
        }
    }
}
