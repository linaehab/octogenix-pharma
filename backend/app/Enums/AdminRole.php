<?php

namespace App\Enums;

use App\Enums\AdminPermission as P;

/**
 * Fixed admin roles (design v0.3 §5.A). The role set and its permissions are a proposal
 * pending client confirmation (decision D-09); changing them needs no migration.
 */
enum AdminRole: string
{
    case SuperAdmin = 'super_admin';
    case ContentEditor = 'content_editor';
    case StoreManager = 'store_manager';
    case Support = 'support';

    /** @return list<AdminPermission> */
    public function permissions(): array
    {
        return match ($this) {
            self::SuperAdmin => P::cases(),
            self::ContentEditor => [P::ManageContent, P::ViewMessages],
            self::StoreManager => [
                P::ManageCatalog, P::ManageInventory, P::ViewOrders, P::ManageOrders,
                P::ManagePayments, P::ViewCustomers,
            ],
            self::Support => [P::ViewMessages, P::ManageMessages, P::ViewOrders, P::ViewCustomers],
        };
    }

    public function can(AdminPermission $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }
}
