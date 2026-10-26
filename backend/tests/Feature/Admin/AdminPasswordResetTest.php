<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Notifications\AdminPasswordLinkNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AdminPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const FORGOT = '/api/v1/admin/auth/forgot-password';

    private const RESET = '/api/v1/admin/auth/reset-password';

    public function test_forgot_password_sends_a_link_to_the_angular_reset_page(): void
    {
        Notification::fake();
        $admin = AdminUser::factory()->create(['email' => 'admin@example.com']);

        $this->postJson(self::FORGOT, ['email' => 'Admin@Example.com'])->assertOk();

        Notification::assertSentTo($admin, AdminPasswordLinkNotification::class, function ($notification) use ($admin) {
            $url = $notification->url($admin);

            return ! $notification->isInvitation
                && str_starts_with($url, config('app.frontend_url').'/admin/reset-password?token=')
                && str_contains($url, 'email=admin%40example.com');
        });
    }

    public function test_forgot_password_answers_identically_for_unknown_and_inactive_accounts(): void
    {
        Notification::fake();
        $inactive = AdminUser::factory()->inactive()->create(['email' => 'inactive@example.com']);

        $known = $this->postJson(self::FORGOT, ['email' => 'inactive@example.com'])->assertOk()->json();
        $unknown = $this->postJson(self::FORGOT, ['email' => 'nobody@example.com'])->assertOk()->json();

        $this->assertSame($known, $unknown);
        Notification::assertNotSentTo($inactive, AdminPasswordLinkNotification::class);
        Notification::assertNothingSent();
    }

    public function test_valid_token_resets_the_password(): void
    {
        $admin = AdminUser::factory()->create(['email' => 'admin@example.com']);
        $token = Password::broker('admin_users')->createToken($admin);

        $this->postJson(self::RESET, [
            'token' => $token,
            'email' => 'admin@example.com',
            'password' => 'New-Password-456',
            'password_confirmation' => 'New-Password-456',
        ])->assertOk();

        $this->assertTrue(Hash::check('New-Password-456', $admin->refresh()->password));
    }

    public function test_invalid_token_and_weak_password_are_rejected(): void
    {
        $admin = AdminUser::factory()->create(['email' => 'admin@example.com']);
        $original = $admin->password;

        $this->postJson(self::RESET, [
            'token' => 'not-a-real-token',
            'email' => 'admin@example.com',
            'password' => 'New-Password-456',
            'password_confirmation' => 'New-Password-456',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->postJson(self::RESET, [
            'token' => Password::broker('admin_users')->createToken($admin),
            'email' => 'admin@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertSame($original, $admin->refresh()->password);
    }
}
