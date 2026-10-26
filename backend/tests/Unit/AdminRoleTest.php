<?php

namespace Tests\Unit;

use App\Enums\AdminPermission as P;
use App\Enums\AdminRole;
use PHPUnit\Framework\TestCase;

/** Locks the proposed role → permission matrix (decision D-09) so changes are deliberate. */
class AdminRoleTest extends TestCase
{
    public function test_super_admin_has_every_permission(): void
    {
        $this->assertSame(P::cases(), AdminRole::SuperAdmin->permissions());
    }

    public function test_role_permission_matrix(): void
    {
        $this->assertSame([P::ManageContent, P::ViewMessages], AdminRole::ContentEditor->permissions());
        $this->assertSame(
            [P::ManageCatalog, P::ManageInventory, P::ViewOrders, P::ManageOrders, P::ManagePayments, P::ViewCustomers, P::ManageShipping],
            AdminRole::StoreManager->permissions()
        );
        $this->assertSame(
            [P::ViewMessages, P::ManageMessages, P::ViewOrders, P::ViewCustomers],
            AdminRole::Support->permissions()
        );
    }

    public function test_only_super_admin_can_manage_admins_and_settings(): void
    {
        foreach (AdminRole::cases() as $role) {
            $expected = $role === AdminRole::SuperAdmin;
            $this->assertSame($expected, $role->can(P::ManageAdmins), $role->value);
            $this->assertSame($expected, $role->can(P::ManageSettings), $role->value);
        }
    }
}
