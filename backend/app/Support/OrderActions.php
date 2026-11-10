<?php

namespace App\Support;

use App\Enums\AdminPermission;
use App\Enums\InventoryReason;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\Order;

/**
 * What an admin may do with an order right now, from the existing rules (OrderStatus state
 * machine, OrderStatusService and the admin order routes) and the admin's permissions. The
 * dashboard shows only these actions; the API still checks every request on its own.
 */
final class OrderActions
{
    /** Statuses an admin may set. pending_* and expired are set by checkout / the system. */
    public const ADMIN_STATUSES = [
        OrderStatus::Confirmed, OrderStatus::Processing, OrderStatus::Shipped,
        OrderStatus::Delivered, OrderStatus::Cancelled, OrderStatus::Returned,
    ];

    /** Statuses that need a reason from the admin (stored as the cancellation reason). */
    public const REASON_REQUIRED = [OrderStatus::Cancelled];

    /**
     * @return array{statuses: list<string>, reason_required: list<string>, cod_collect: bool, restock_returned: bool, edit_note: bool}
     */
    public static function for(Order $order, AdminUser $admin): array
    {
        $manage = $admin->hasPermission(AdminPermission::ManageOrders);

        return [
            'statuses' => $manage ? array_map(fn (OrderStatus $s) => $s->value, self::nextStatuses($order)) : [],
            'reason_required' => array_map(fn (OrderStatus $s) => $s->value, self::REASON_REQUIRED),
            'cod_collect' => $admin->canRecordCodCash()
                && $order->payment_method === PaymentMethod::Cod
                && $order->status === OrderStatus::Delivered
                && $order->payment_status === OrderPaymentStatus::Unpaid,
            'restock_returned' => $manage && $admin->hasPermission(AdminPermission::ManageInventory)
                && $order->status === OrderStatus::Returned
                && ! InventoryMovement::query()->where('order_id', $order->id)->where('reason', InventoryReason::ReturnRestock)->exists(),
            'edit_note' => $manage,
        ];
    }

    /** @return list<OrderStatus> */
    public static function nextStatuses(Order $order): array
    {
        $card = $order->payment_method === PaymentMethod::Card;
        $paid = $order->payment_status === OrderPaymentStatus::Paid;

        return array_values(array_filter(
            $order->status->allowedNext(),
            fn (OrderStatus $to) => in_array($to, self::ADMIN_STATUSES, true)
                // Card orders are confirmed by the verified payment, not by an admin.
                && ! ($to === OrderStatus::Confirmed && $card && ! $paid)
                // A paid card order cannot be cancelled until refunds exist (decision D-05).
                && ! ($to === OrderStatus::Cancelled && $card && $paid),
        ));
    }
}
