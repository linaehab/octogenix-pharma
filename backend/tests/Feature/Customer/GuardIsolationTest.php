<?php

namespace Tests\Feature\Customer;

use App\Models\AdminUser;
use App\Models\Customer;
use Database\Factories\CustomerFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Admins and customers are separate tables, guards and permissions (design v0.3 §7.6). */
class GuardIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_customer_session_cannot_reach_admin_routes(): void
    {
        $this->actingAs(Customer::factory()->create(), 'customer')->fromFrontend();

        $this->getJson('/api/v1/admin/auth/me')->assertUnauthorized();
        $this->getJson('/api/v1/admin/products')->assertUnauthorized();
        $this->getJson('/api/v1/admin/customers')->assertUnauthorized();
        $this->patchJson('/api/v1/admin/settings', ['settings' => ['store.enabled' => true]])->assertUnauthorized();
    }

    public function test_an_admin_session_cannot_reach_customer_routes(): void
    {
        $this->actingAs(AdminUser::factory()->superAdmin()->create(), 'admin')->fromFrontend();

        $this->getJson('/api/v1/customer/me')->assertUnauthorized();
        $this->getJson('/api/v1/customer/cart')->assertUnauthorized();
        $this->getJson('/api/v1/customer/addresses')->assertUnauthorized();
    }

    public function test_customer_logout_keeps_an_admin_signed_in_in_the_same_browser(): void
    {
        $admin = AdminUser::factory()->create();
        $customer = Customer::factory()->create(['email' => 'shopper@example.com']);
        $this->actingAs($admin, 'admin')->fromFrontend();

        $this->postJson('/api/v1/customer/auth/login', ['email' => 'shopper@example.com', 'password' => CustomerFactory::PASSWORD])
            ->assertOk();
        $this->assertAuthenticatedAs($customer, 'customer');

        $this->postJson('/api/v1/customer/auth/logout')->assertNoContent();

        $this->assertGuest('customer');
        $this->assertAuthenticatedAs($admin, 'admin');
    }

    public function test_an_admin_email_and_password_do_not_work_on_the_store(): void
    {
        AdminUser::factory()->create(['email' => 'staff@example.com']);

        $this->fromFrontend()->postJson('/api/v1/customer/auth/login', [
            'email' => 'staff@example.com', 'password' => \Database\Factories\AdminUserFactory::PASSWORD,
        ])->assertUnprocessable();
        $this->assertGuest('customer');
    }
}
