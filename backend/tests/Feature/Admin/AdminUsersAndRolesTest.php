<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminPermission as P;
use App\Enums\AdminRole;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Models\AdminAuditLog;
use App\Models\AdminUser;
use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\PaymentWebhookEvent;
use App\Notifications\AdminPasswordLinkNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/** Admin users and roles: the approved role matrix, payments.record_cod and account management. */
class AdminUsersAndRolesTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private const URL = '/api/v1/admin/admin-users';

    private function signIn(AdminRole $role, array $attributes = []): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create($attributes);
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    /** @return list<string> */
    private static function names(array $permissions): array
    {
        $names = array_map(fn (P $p) => $p->value, $permissions);
        sort($names);

        return $names;
    }

    public function test_the_role_matrix_is_exactly_as_approved_and_the_original_roles_are_unchanged(): void
    {
        $expected = [
            'super_admin' => array_map(fn (P $p) => $p->value, P::cases()),
            'content_editor' => ['content.manage', 'messages.view', 'reviews.manage'],
            'store_manager' => ['catalog.manage', 'customers.view', 'inventory.manage', 'orders.export', 'orders.manage', 'orders.view', 'payments.manage', 'reviews.manage', 'shipping.manage'],
            'support' => ['customers.view', 'messages.manage', 'messages.view', 'orders.view'],
            'product_manager' => ['catalog.manage', 'inventory.manage', 'reviews.manage'],
            // orders.export (approved): the orders Excel export without payments.manage.
            'order_manager' => ['customers.view', 'orders.export', 'orders.manage', 'orders.view', 'payments.record_cod'],
            // Phase 11.6 (approved): content managers also manage the corporate website content.
            'content_manager' => ['content.manage', 'messages.manage', 'messages.view', 'reviews.manage'],
        ];
        foreach (AdminRole::cases() as $role) {
            $want = $expected[$role->value];
            sort($want);
            $this->assertSame($want, self::names($role->permissions()), $role->value);
        }
        $this->assertNotContains(P::ManagePayments, AdminRole::OrderManager->permissions());
        $this->assertNotContains(P::ManageSettings, AdminRole::ContentManager->permissions());
    }

    public function test_order_managers_record_cod_cash_but_never_see_financial_reports_exports_or_payment_events(): void
    {
        $this->openStore(codFee: 1000);
        $variant = $this->variant(stock: 5, price: 45000);
        $number = $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated()->json('data.order_number');
        Order::where('order_number', $number)->update(['status' => OrderStatus::Delivered->value]);

        $this->signIn(AdminRole::OrderManager);
        $this->getJson('/api/v1/admin/orders')->assertOk();
        $this->getJson('/api/v1/admin/customers')->assertOk();
        $this->getJson("/api/v1/admin/orders/{$number}")->assertOk()->assertJsonPath('data.actions.cod_collect', true);

        $period = 'from=2026-11-01&to=2026-11-08';
        foreach ([
            "/api/v1/admin/reports/sales?{$period}", "/api/v1/admin/reports/orders?{$period}", "/api/v1/admin/reports/products?{$period}",
            "/api/v1/admin/reports/inventory?{$period}", "/api/v1/admin/reports/sales/export?{$period}", "/api/v1/admin/reports/orders/export?{$period}&format=xlsx",
            '/api/v1/admin/payment-webhook-events', '/api/v1/admin/governorates', '/api/v1/admin/settings',
            '/api/v1/admin/products', '/api/v1/admin/inventory', self::URL, '/api/v1/admin/audit-logs',
        ] as $url) {
            $this->getJson($url)->assertForbidden();
        }
        $event = PaymentWebhookEvent::create(['provider' => 'fake', 'event_key' => 'evt_1', 'event_type' => 'payment.updated',
            'signature_valid' => true, 'payload' => [], 'processing_status' => 'failed', 'attempts' => 1, 'received_at' => now()]);
        $this->postJson("/api/v1/admin/payment-webhook-events/{$event->id}/reprocess")->assertForbidden();
        $this->assertArrayNotHasKey('sales', $this->getJson('/api/v1/admin/dashboard/summary')->assertOk()->json('data'));

        $this->postJson("/api/v1/admin/orders/{$number}/cod-collected", ['expected_payment_status' => 'unpaid'])
            ->assertOk()->assertJsonPath('data.payment_status', 'paid');
        $this->assertSame(OrderPaymentStatus::Paid, Order::where('order_number', $number)->value('payment_status'));

        // Roles without either payment permission cannot record cash.
        $this->signIn(AdminRole::Support);
        $this->postJson("/api/v1/admin/orders/{$number}/cod-collected")->assertForbidden();
    }

    public function test_product_and_content_managers_reach_only_their_sections(): void
    {
        $this->signIn(AdminRole::ProductManager);
        foreach (['/api/v1/admin/products', '/api/v1/admin/inventory', '/api/v1/admin/reviews', '/api/v1/admin/promo-codes', '/api/v1/admin/discounts/products'] as $url) {
            $this->getJson($url)->assertOk();
        }
        foreach (['/api/v1/admin/orders', '/api/v1/admin/customers', '/api/v1/admin/reports/products?from=2026-11-01&to=2026-11-08',
            '/api/v1/admin/contact-messages', '/api/v1/admin/governorates', self::URL] as $url) {
            $this->getJson($url)->assertForbidden();
        }

        $message = ContactMessage::factory()->create();
        $this->signIn(AdminRole::ContentManager);
        $this->getJson('/api/v1/admin/contact-messages')->assertOk();
        $this->getJson('/api/v1/admin/reviews')->assertOk();
        $this->getJson("/api/v1/admin/contact-messages/{$message->id}")->assertJsonPath('data.status', 'read');
        $this->patchJson("/api/v1/admin/contact-messages/{$message->id}", ['status' => 'replied'])->assertOk();
        foreach (['/api/v1/admin/content/corporate', '/api/v1/admin/brands', '/api/v1/admin/services', '/api/v1/admin/company-info'] as $url) {
            $this->getJson($url)->assertOk();
        }
        foreach (['/api/v1/admin/settings', '/api/v1/admin/orders', '/api/v1/admin/products', '/api/v1/admin/reports/sales?from=2026-11-01&to=2026-11-08', self::URL] as $url) {
            $this->getJson($url)->assertForbidden();
        }
    }

    public function test_the_list_is_searched_filtered_sorted_and_paged_without_secrets(): void
    {
        $me = $this->signIn(AdminRole::SuperAdmin, ['name' => 'Lina', 'email' => 'lina@example.com']);
        AdminUser::factory()->role(AdminRole::OrderManager)->create(['name' => 'Omar', 'email' => 'omar@example.com', 'created_at' => now()->subDays(3)]);
        AdminUser::factory()->role(AdminRole::ProductManager)->inactive()->create(['name' => 'Pola', 'email' => 'pola@example.com', 'created_at' => now()->subDays(5)]);

        $list = $this->getJson(self::URL.'?per_page=2')->assertOk()
            ->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 2)->assertJsonPath('meta.active_super_admins', 1)
            ->assertJsonPath('data.0.name', 'Lina');
        $this->assertContains('order_manager', $list->json('meta.roles'));
        foreach (['password', 'remember_token'] as $secret) {
            $this->assertStringNotContainsString($secret, $list->getContent());
        }

        $this->getJson(self::URL.'?search=omar@')->assertJsonCount(1, 'data')->assertJsonPath('data.0.role', 'order_manager');
        $this->getJson(self::URL.'?role=product_manager')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Pola');
        $this->getJson(self::URL.'?status=inactive')->assertJsonCount(1, 'data')->assertJsonPath('data.0.is_active', false);
        $this->getJson(self::URL.'?sort=oldest')->assertJsonPath('data.0.name', 'Pola');
        $this->getJson(self::URL.'?sort=newest')->assertJsonPath('data.0.id', $me->id);
        $this->getJson(self::URL.'?role=owner')->assertUnprocessable();
        $this->getJson(self::URL.'?sort=random')->assertUnprocessable();
    }

    public function test_creating_an_admin_queues_an_invitation_and_says_honestly_that_email_is_not_delivered_here(): void
    {
        Notification::fake();
        $this->signIn(AdminRole::SuperAdmin);

        $response = $this->postJson(self::URL, ['name' => 'Nour', 'email' => 'Nour@Example.com', 'role' => 'content_manager'])
            ->assertCreated()
            ->assertJsonPath('data.role', 'content_manager')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('meta.invitation', 'not_delivered');
        $this->assertStringNotContainsStringIgnoringCase('token', $response->getContent());
        $this->assertStringNotContainsString('reset-password', $response->getContent());

        $nour = AdminUser::where('email', 'nour@example.com')->sole();
        Notification::assertSentTo($nour, AdminPasswordLinkNotification::class);
        $this->assertSame(1, DB::table('admin_password_reset_tokens')->where('email', 'nour@example.com')->count());

        $this->postJson(self::URL, ['name' => 'Again', 'email' => 'nour@example.com', 'role' => 'support'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson(self::URL, ['name' => 'X', 'email' => 'x@example.com', 'role' => 'owner'])
            ->assertUnprocessable()->assertJsonValidationErrors('role');
        $this->postJson(self::URL, ['name' => 'X', 'email' => 'x@example.com', 'role' => 'support', 'password' => 'Chosen123456', 'is_active' => false])
            ->assertCreated();
        $this->assertTrue(AdminUser::where('email', 'x@example.com')->value('is_active'), 'Extra fields are ignored.');

        $log = AdminAuditLog::where('action', 'admin_users.created')->first();
        $this->assertSame('content_manager', $log->changes['role']['to']);
        $this->assertStringNotContainsString('password', json_encode(AdminAuditLog::all()->toArray()));
    }

    public function test_role_and_status_changes_follow_the_safeguards_and_are_audited(): void
    {
        $me = $this->signIn(AdminRole::SuperAdmin);
        $other = AdminUser::factory()->role(AdminRole::Support)->create();

        $this->patchJson(self::URL."/{$me->id}", ['role' => 'support'])->assertUnprocessable()->assertJsonPath('errors.role.0', 'You cannot change your own role.');
        $this->patchJson(self::URL."/{$me->id}", ['is_active' => false])->assertUnprocessable()->assertJsonValidationErrors('is_active');

        $seen = $other->updated_at->toIso8601String();
        $this->travel(1)->seconds();
        $this->patchJson(self::URL."/{$other->id}", ['role' => 'order_manager', 'expected_updated_at' => $seen])
            ->assertOk()->assertJsonPath('data.role', 'order_manager')
            ->assertJsonPath('data.permissions', ['orders.view', 'orders.manage', 'orders.export', 'customers.view', 'payments.record_cod']);
        $this->patchJson(self::URL."/{$other->id}", ['name' => 'Renamed', 'expected_updated_at' => $seen])
            ->assertStatus(409)->assertJsonPath('current.role', 'order_manager');

        $this->travel(1)->seconds();
        $this->patchJson(self::URL."/{$other->id}", ['is_active' => false])->assertOk()->assertJsonPath('data.permissions', []);
        $this->travel(1)->seconds();
        $this->patchJson(self::URL."/{$other->id}", ['is_active' => true])->assertOk();
        $this->travel(1)->seconds();
        $this->patchJson(self::URL."/{$other->id}", ['name' => 'Sara N.', 'locale' => 'ar'])->assertOk();

        // The last active super admin cannot be demoted or deactivated by another super admin either.
        $second = AdminUser::factory()->role(AdminRole::SuperAdmin)->create();
        $this->actingAs($second, 'admin');
        $me->forceFill(['is_active' => false])->save();
        $this->patchJson(self::URL."/{$second->id}", ['role' => 'support'])->assertUnprocessable();
        $me->forceFill(['is_active' => true])->save();
        $this->patchJson(self::URL."/{$me->id}", ['role' => 'store_manager'])->assertOk();
        $this->patchJson(self::URL."/{$me->id}", ['role' => 'super_admin'])->assertOk();

        $logs = AdminAuditLog::where('subject_id', (string) $other->id)->orderBy('id')->get();
        $this->assertSame(['admin_users.role_changed', 'admin_users.deactivated', 'admin_users.activated', 'admin_users.updated'], $logs->pluck('action')->all());
        $this->assertEquals(['role' => ['from' => 'support', 'to' => 'order_manager']], $logs[0]->changes);
        $this->assertEquals(['is_active' => ['from' => true, 'to' => false]], $logs[1]->changes);
        $this->assertSame($me->id, $logs[0]->admin_user_id);
        $this->assertStringNotContainsString('password', json_encode($logs->toArray()));
    }

    public function test_only_super_admins_manage_accounts_so_nobody_else_can_grant_super_admin(): void
    {
        $target = AdminUser::factory()->role(AdminRole::Support)->create();

        foreach ([AdminRole::StoreManager, AdminRole::OrderManager, AdminRole::ProductManager, AdminRole::ContentManager, AdminRole::ContentEditor, AdminRole::Support] as $role) {
            $me = $this->signIn($role);
            $this->getJson(self::URL)->assertForbidden();
            $this->postJson(self::URL, ['name' => 'X', 'email' => "x-{$role->value}@example.com", 'role' => 'super_admin'])->assertForbidden();
            $this->patchJson(self::URL."/{$target->id}", ['role' => 'super_admin'])->assertForbidden();
            $this->patchJson(self::URL."/{$me->id}", ['role' => 'super_admin'])->assertForbidden();
            $this->assertSame($role, $me->refresh()->role);
        }
        $this->assertSame(AdminRole::Support, $target->refresh()->role);
        $this->assertSame(0, AdminUser::where('role', 'super_admin')->count());
        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_a_deactivated_admin_loses_access_and_their_sessions_are_removed(): void
    {
        $super = AdminUser::factory()->role(AdminRole::SuperAdmin)->create();
        $manager = AdminUser::factory()->role(AdminRole::OrderManager)->create();
        config(['session.driver' => 'database']);
        DB::table('sessions')->insert([
            ['id' => 'manager-session', 'user_id' => $manager->id, 'ip_address' => null, 'user_agent' => null, 'payload' => '', 'last_activity' => time()],
            ['id' => 'other-session', 'user_id' => $super->id, 'ip_address' => null, 'user_agent' => null, 'payload' => '', 'last_activity' => time()],
        ]);

        $this->actingAs($manager, 'admin')->fromFrontend();
        $this->getJson('/api/v1/admin/orders')->assertOk();

        $this->actingAs($super, 'admin');
        $this->patchJson(self::URL."/{$manager->id}", ['is_active' => false])->assertOk();
        $this->assertSame(['other-session'], DB::table('sessions')->pluck('id')->all(), 'Only the deactivated admin\'s sessions are removed.');

        $this->actingAs($manager->refresh(), 'admin');
        $this->getJson('/api/v1/admin/orders')->assertForbidden()->assertJsonPath('message', 'This account has been deactivated.');
        $this->getJson('/api/v1/admin/auth/me')->assertUnauthorized();
    }
}
