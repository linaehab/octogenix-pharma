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
    case ManagePayments = 'payments.manage';
    case ViewCustomers = 'customers.view';
    case ManageShipping = 'shipping.manage';
}
