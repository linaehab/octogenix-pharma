<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Customer;
use Database\Factories\AdminUserFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Mockery;
use Tests\TestCase;

class AdminSecurityLogTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<array{0: string, 1: array<string, mixed>}> */
    private array $entries = [];

    protected function setUp(): void
    {
        parent::setUp();

        $channel = Mockery::mock();
        $channel->shouldReceive('info')->andReturnUsing(function (string $message, array $context) {
            $this->entries[] = [$message, $context];
        });
        Log::shouldReceive('channel')->with('security')->andReturn($channel);
    }

    public function test_sign_in_failed_sign_in_and_sign_out_are_logged_without_passwords(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create(['email' => 'boss@example.com']);

        $this->fromFrontend()->postJson('/api/v1/admin/auth/login', ['email' => 'boss@example.com', 'password' => 'Wrong-Password-123'])
            ->assertUnprocessable();
        $this->fromFrontend()->postJson('/api/v1/admin/auth/login', ['email' => 'nobody@example.com', 'password' => 'Wrong-Password-123'])
            ->assertUnprocessable();
        $this->fromFrontend()->postJson('/api/v1/admin/auth/login', ['email' => 'boss@example.com', 'password' => AdminUserFactory::PASSWORD])
            ->assertOk();
        $this->fromFrontend()->postJson('/api/v1/admin/auth/logout')->assertNoContent();

        $this->assertSame(['admin.login_failed', 'admin.login_failed', 'admin.login', 'admin.logout'], array_column($this->entries, 0));
        $this->assertSame($admin->id, $this->entries[0][1]['admin_id']);
        $this->assertNull($this->entries[1][1]['admin_id']);
        $this->assertSame('nobody@example.com', $this->entries[1][1]['email']);
        $this->assertStringNotContainsString('Wrong-Password-123', json_encode($this->entries));
        $this->assertStringNotContainsString(AdminUserFactory::PASSWORD, json_encode($this->entries));
    }

    public function test_password_reset_is_logged(): void
    {
        $admin = AdminUser::factory()->create(['email' => 'editor@example.com']);
        $token = Password::broker('admin_users')->createToken($admin);

        $this->postJson('/api/v1/admin/auth/reset-password', [
            'token' => $token,
            'email' => 'editor@example.com',
            'password' => 'New-Strong-Password-9',
            'password_confirmation' => 'New-Strong-Password-9',
        ])->assertOk();

        $this->assertSame(['admin.password_reset'], array_column($this->entries, 0));
        $this->assertSame($admin->id, $this->entries[0][1]['admin_id']);
    }

    public function test_customer_sign_ins_are_not_logged_here(): void
    {
        Customer::factory()->create(['email' => 'mona@example.com', 'password' => 'goatmilk2026']);

        $this->fromFrontend()->postJson('/api/v1/customer/auth/login', ['email' => 'mona@example.com', 'password' => 'goatmilk2026'])
            ->assertOk();

        $this->assertSame([], $this->entries);
    }
}
