<?php

namespace App\Services;

use App\Enums\InventoryReason;
use App\Enums\OrderActor;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\OrderStateChangedException;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The only code that changes an order's status or payment status (design v0.3 §7.2).
 * Every change locks the order row, checks the allowed transitions, keeps stock in step,
 * and writes an order_status_histories row.
 */
class OrderStatusService
{
    public function __construct(
        private readonly InventoryService $inventory,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param  OrderStatus|null  $expected  the status the admin saw; when given and the order has
     *                                      moved on meanwhile, nothing changes (409)
     *
     * @throws ValidationException when the transition is not allowed
     * @throws OrderStateChangedException when $expected no longer matches
     */
    public function transition(
        Order $order,
        OrderStatus $to,
        OrderActor $actor,
        ?AdminUser $admin = null,
        ?string $note = null,
        ?OrderStatus $expected = null,
    ): Order {
        DB::transaction(function () use ($order, $to, $actor, $admin, $note, $expected) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $locked->status;

            if ($expected !== null && $expected !== $from) {
                throw new OrderStateChangedException($expected->value, $from->value);
            }

            // Admins may also correct a stage (adminTargets); customers and the system follow the normal flow.
            $isAdmin = $actor === OrderActor::Admin;
            $allowed = $isAdmin ? $from->adminCanChangeTo($to) : $from->canBecome($to);
            if ($isAdmin && $to === OrderStatus::PendingConfirmation && $locked->payment_method !== PaymentMethod::Cod) {
                $allowed = false; // a card order's "new" stage is waiting for its payment
            }
            if (! $allowed) {
                throw ValidationException::withMessages([
                    'status' => "An order cannot go from {$from->value} to {$to->value}.",
                ]);
            }
            $correction = $isAdmin && $from->isCorrection($to);
            if ($correction && blank($note)) {
                throw ValidationException::withMessages([
                    'note' => 'Add a note explaining this change: it is not the normal next step.',
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
            // Moving back to an earlier working stage: the later stages' times no longer apply
            // (the timeline keeps when they happened).
            if ($to->stageIndex() !== null && $from->stageIndex() !== null && $to->stageIndex() < $from->stageIndex()) {
                foreach (array_slice(OrderStatus::WORKING_STAGES, $to->stageIndex() + 1) as $later) {
                    if ($later->timestampColumn() !== null) {
                        $changes[$later->timestampColumn()] = null;
                    }
                }
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
            if ($actor === OrderActor::Admin && $admin !== null) {
                $changes = ['status' => ['from' => $from->value, 'to' => $to->value]];
                // The admin's note or reason (required for cancellations and corrections).
                if ($note !== null && trim($note) !== '') {
                    $changes['reason'] = ['from' => null, 'to' => Str::limit($note, 200)];
                }
                $action = match (true) {
                    $to === OrderStatus::Cancelled => 'orders.cancelled',
                    $correction => 'orders.status_corrected',
                    default => 'orders.status_changed',
                };
                $this->audit->record($action, 'order', $locked->id, $locked->order_number, $changes, $admin);
            }
            $order->setRawAttributes($locked->getAttributes(), sync: true);
        });

        return $order;
    }

    /** Admin confirms the cash for a delivered COD order was received. */
    public function markCodCollected(Order $order, AdminUser $admin, ?string $note = null, ?OrderPaymentStatus $expected = null): Order
    {
        DB::transaction(function () use ($order, $admin, $note, $expected) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($expected !== null && $expected !== $locked->payment_status) {
                throw new OrderStateChangedException($expected->value, $locked->payment_status->value);
            }

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
            $this->audit->record('orders.cod_collected', 'order', $locked->id, $locked->order_number, [
                'payment_status' => ['from' => OrderPaymentStatus::Unpaid->value, 'to' => OrderPaymentStatus::Paid->value],
                'amount_piastres' => ['from' => null, 'to' => $locked->total_piastres],
            ], $admin);
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

            $units = 0;
            foreach ($locked->items()->with('variant')->get() as $item) {
                $this->inventory->adjust($item->variant, $item->quantity, InventoryReason::ReturnRestock, $admin, $note, $locked->id);
                $units += $item->quantity;
            }
            $this->audit->record('orders.returned_restocked', 'order', $locked->id, $locked->order_number, [
                'units_restocked' => ['from' => null, 'to' => $units],
            ], $admin);
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
