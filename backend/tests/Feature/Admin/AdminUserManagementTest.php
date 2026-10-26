<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Notifications\AdminPasswordLinkNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private const INDEX = '/api/v1/admin/admin-users';

    /** @return array<string, array{AdminRole}> */
    public static function nonSuperAdminRoles(): array
    {
        return [
            'content editor' => [AdminRole::ContentEditor],
            'store manager' => [AdminRole::StoreManager],
            'support' => [AdminRole::Support],
        ];
    }

    #[DataProvider('nonSuperAdminRoles')]
    public function test_only_super_admins_can_manage_admin_accounts(AdminRole $role): void
    {
        $admin = AdminUser::factory()->role($role)->create();
        $other = AdminUser::factory()->create();

        $this->actingAs($admin, 'admin')->fromFrontend();

        $this->getJson(self::INDEX)->assertForbidden();
        $this->postJson(self::INDEX, [
            'name' => 'New Admin', 'email' => 'new@example.com', 'role' => 'super_admin',
        ])->assertForbidden();
        $this->patchJson(self::INDEX."/{$other->id}", ['role' => 'super_admin'])->assertForbidden();

        $this->assertDatabaseMissing('admin_users', ['email' => 'new@example.com']);
        $this->assertSame(AdminRole::ContentEditor, $other->refresh()->role);
    }

    public function test_super_admin_lists_admins_without_secrets(): void
    {
        $super = AdminUser::factory()->superAdmin()->create();
        AdminUser::factory()->count(2)->create();

        $this->actingAs($super, 'admin')->fromFrontend()->getJson(self::INDEX)
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonMissingPath('data.0.password')
            ->assertJsonMissingPath('data.0.remember_token');
    }

    public function test_super_admin_creates_an_admin_who_is_invited_by_email(): void
    {
        Notification::fake();
        $super = AdminUser::factory()->superAdmin()->create();

        $this->actingAs($super, 'admin')->fromFrontend()->postJson(self::INDEX, [
            'name' => 'Content Person',
            'email' => ' Content@Example.com ',
            'role' => 'content_editor',
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'content@example.com')
            ->assertJsonPath('data.permissions', ['content.manage', 'messages.view']);

        $created = AdminUser::where('email', 'content@example.com')->firstOrFail();
        Notification::assertSentTo($created, AdminPasswordLinkNotification::class, fn ($n) => $n->isInvitation);
    }

    public function test_create_validates_role_and_unique_email(): void
    {
        $super = AdminUser::factory()->superAdmin()->create(['email' => 'taken@example.com']);

        $this->actingAs($super, 'admin')->fromFrontend()->postJson(self::INDEX, [
            'name' => 'X', 'email' => 'TAKEN@example.com', 'role' => 'owner',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'role']);
    }

    public function test_super_admin_can_change_role_and_deactivate_another_admin(): void
    {
        $super = AdminUser::factory()->superAdmin()->create();
        $editor = AdminUser::factory()->create();

        $this->actingAs($super, 'admin')->fromFrontend()
            ->patchJson(self::INDEX."/{$editor->id}", ['role' => 'store_manager', 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.role', 'store_manager')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.permissions', []);
    }

    public function test_the_last_active_super_admin_cannot_be_demoted(): void
    {
        $super = AdminUser::factory()->superAdmin()->create();
        AdminUser::factory()->superAdmin()->inactive()->create();

        $this->actingAs($super, 'admin')->fromFrontend()
            ->patchJson(self::INDEX."/{$super->id}", ['role' => 'support'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertTrue($super->refresh()->isSuperAdmin());
    }

    public function test_super_admin_can_be_demoted_when_another_active_super_admin_exists(): void
    {
        $super = AdminUser::factory()->superAdmin()->create();
        $second = AdminUser::factory()->superAdmin()->create();

        $this->actingAs($super, 'admin')->fromFrontend()
            ->patchJson(self::INDEX."/{$second->id}", ['role' => 'support'])
            ->assertOk();

        $this->assertSame(AdminRole::Support, $second->refresh()->role);
    }

    public function test_admins_cannot_deactivate_themselves(): void
    {
        $super = AdminUser::factory()->superAdmin()->create();
        AdminUser::factory()->superAdmin()->create();

        $this->actingAs($super, 'admin')->fromFrontend()
            ->patchJson(self::INDEX."/{$super->id}", ['is_active' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_active');

        $this->assertTrue($super->refresh()->is_active);
    }
}
