<?php

namespace App\Enums;

/**
 * Dashboard abilities. Each case is registered as a Gate ability with the same name,
 * so routes can use `can:content.manage` and controllers `Gate::authorize(...)`.
 */
enum AdminPermission: string
{
    case ManageAdmins = 'admins.manage';
    case ManageSettings = 'settings.manage';
    case ManageContent = 'content.manage';
    case ViewMessages = 'messages.view';
    case ManageMessages = 'messages.manage';
    case ManageCatalog = 'catalog.manage';
    case ManageInventory = 'inventory.manage';
    case ViewOrders = 'orders.view';
    case ManageOrders = 'orders.manage';
    /**
     * Download the orders list as Excel (with orders.view). The order totals in the file are
     * the order values already shown on the orders pages; no payment records or reports.
     */
    case ExportOrders = 'orders.export';
    case ManagePayments = 'payments.manage';
    /**
     * Record that cash on delivery was received for a delivered order, and nothing else: no
     * reports, exports, payment events or money figures (those stay with payments.manage).
     */
    case RecordCodPayments = 'payments.record_cod';
    case ViewCustomers = 'customers.view';
    case ManageShipping = 'shipping.manage';
    case ManageReviews = 'reviews.manage';
}
