<?php

namespace App\Enums;

use App\Enums\AdminPermission as P;

/**
 * Fixed admin roles (design v0.3 §5.A); changing them needs no migration (the role is stored as
 * text). The first four are the original set and keep their permissions; product_manager,
 * order_manager and content_manager were approved for the Admin Users phase.
 */
enum AdminRole: string
{
    case SuperAdmin = 'super_admin';
    case ContentEditor = 'content_editor';
    case StoreManager = 'store_manager';
    case Support = 'support';
    case ProductManager = 'product_manager';
    case OrderManager = 'order_manager';
    case ContentManager = 'content_manager';

    /** @return list<P> */
    public function permissions(): array
    {
        return match ($this) {
            self::SuperAdmin => P::cases(),
            self::ContentEditor => [P::ManageContent, P::ViewMessages, P::ManageReviews],
            self::StoreManager => [
                P::ManageCatalog, P::ManageInventory, P::ViewOrders, P::ManageOrders,
                P::ManagePayments, P::ViewCustomers, P::ManageShipping, P::ManageReviews,
            ],
            self::Support => [P::ViewMessages, P::ManageMessages, P::ViewOrders, P::ViewCustomers],
            // Products, discounts, stock and reviews; no orders, payments or financial reports.
            self::ProductManager => [P::ManageCatalog, P::ManageInventory, P::ManageReviews],
            // Orders and customers, and recording COD cash only (no payments.manage: no reports or exports).
            self::OrderManager => [P::ViewOrders, P::ManageOrders, P::ViewCustomers, P::RecordCodPayments],
            // Contact messages and reviews; content.manage is left out until a content page exists.
            self::ContentManager => [P::ViewMessages, P::ManageMessages, P::ManageReviews],
        };
    }

    public function can(P $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }
}
