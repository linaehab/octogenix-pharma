<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use Database\Factories\AdminUserFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    private const LOGIN = '/api/v1/admin/auth/login';

    private const ME = '/api/v1/admin/auth/me';

    public function test_admin_can_log_in_and_receives_profile_and_permissions(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create(['email' => 'boss@example.com']);

        $this->fromFrontend()->postJson(self::LOGIN, [
            'email' => 'BOSS@example.com',
            'password' => AdminUserFactory::PASSWORD,
        ])
            ->assertOk()
            ->assertJsonPath('data.email', 'boss@example.com')
            ->assertJsonPath('data.role', 'super_admin')
            ->assertJsonFragment(['admins.manage'])
            ->assertJsonMissingPath('data.password');

        $this->assertAuthenticatedAs($admin, 'admin');
        $this->assertNotNull($admin->refresh()->last_login_at);
        $this->assertSame('127.0.0.1', $admin->last_login_ip);

        $this->fromFrontend()->getJson(self::ME)->assertOk()->assertJsonPath('data.id', $admin->id);
    }

    public function test_wrong_password_unknown_email_and_inactive_account_get_the_same_error(): void
    {
        AdminUser::factory()->create(['email' => 'active@example.com']);
        AdminUser::factory()->inactive()->create(['email' => 'inactive@example.com']);

        $attempts = [
            ['email' => 'active@example.com', 'password' => 'Wrong-Password-123'],
            ['email' => 'nobody@example.com', 'password' => AdminUserFactory::PASSWORD],
            ['email' => 'inactive@example.com', 'password' => AdminUserFactory::PASSWORD],
        ];

        foreach ($attempts as $credentials) {
            $this->fromFrontend()->postJson(self::LOGIN, $credentials)
                ->assertUnprocessable()
                ->assertJsonPath('errors.email.0', __('auth.failed'));
        }

        $this->assertGuest('admin');
    }

    public function test_login_is_rate_limited_per_email_and_ip(): void
    {
        AdminUser::factory()->create(['email' => 'admin@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->fromFrontend()->postJson(self::LOGIN, [
                'email' => 'admin@example.com',
                'password' => 'Wrong-Password-123',
            ])->assertUnprocessable();
        }

        $this->fromFrontend()->postJson(self::LOGIN, [
            'email' => 'admin@example.com',
            'password' => AdminUserFactory::PASSWORD,
        ])->assertTooManyRequests();
    }

    public function test_login_validates_input(): void
    {
        $this->fromFrontend()->postJson(self::LOGIN, ['email' => 'not-an-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_protected_routes_require_an_admin_session(): void
    {
        $this->fromFrontend()->getJson(self::ME)->assertUnauthorized();
        $this->fromFrontend()->postJson('/api/v1/admin/auth/logout')->assertUnauthorized();
        $this->fromFrontend()->getJson('/api/v1/admin/admin-users')->assertUnauthorized();
    }

    public function test_requests_from_outside_the_spa_get_no_session_and_cannot_log_in(): void
    {
        AdminUser::factory()->create(['email' => 'admin@example.com']);

        // No Origin/Referer from a stateful domain: Sanctum does not start a session.
        $this->postJson(self::LOGIN, [
            'email' => 'admin@example.com',
            'password' => AdminUserFactory::PASSWORD,
        ])->assertStatus(400);

        $this->assertGuest('admin');
    }

    public function test_admin_can_log_out(): void
    {
        $admin = AdminUser::factory()->create();

        $this->actingAs($admin, 'admin')->fromFrontend()
            ->postJson('/api/v1/admin/auth/logout')
            ->assertNoContent();

        $this->assertGuest('admin');
    }

    public function test_deactivated_admin_is_logged_out_on_next_request(): void
    {
        $admin = AdminUser::factory()->create();
        $this->actingAs($admin, 'admin');

        $admin->update(['is_active' => false]);

        $this->fromFrontend()->getJson(self::ME)
            ->assertForbidden()
            ->assertJsonPath('message', 'This account has been deactivated.');

        $this->assertGuest('admin');
    }
}
