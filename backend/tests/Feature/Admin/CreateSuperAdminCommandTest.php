<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateSuperAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD_PROMPT = 'Password (min. 12 characters, upper and lower case letters and a number)';

    public function test_creates_an_active_super_admin(): void
    {
        $this->artisan('admin:create-super-admin', ['--name' => 'Owner', '--email' => 'Owner@Example.com'])
            ->expectsQuestion(self::PASSWORD_PROMPT, 'Strong-Password-1')
            ->expectsQuestion('Confirm password', 'Strong-Password-1')
            ->assertSuccessful();

        $admin = AdminUser::where('email', 'owner@example.com')->firstOrFail();
        $this->assertSame(AdminRole::SuperAdmin, $admin->role);
        $this->assertTrue($admin->is_active);
        $this->assertTrue(Hash::check('Strong-Password-1', $admin->password));
    }

    public function test_rejects_weak_or_mismatched_passwords_and_duplicate_emails(): void
    {
        AdminUser::factory()->create(['email' => 'taken@example.com']);

        $this->artisan('admin:create-super-admin', ['--name' => 'A', '--email' => 'new@example.com'])
            ->expectsQuestion(self::PASSWORD_PROMPT, 'weak')
            ->expectsQuestion('Confirm password', 'weak')
            ->assertFailed();

        $this->artisan('admin:create-super-admin', ['--name' => 'A', '--email' => 'new@example.com'])
            ->expectsQuestion(self::PASSWORD_PROMPT, 'Strong-Password-1')
            ->expectsQuestion('Confirm password', 'Strong-Password-2')
            ->assertFailed();

        $this->artisan('admin:create-super-admin', ['--name' => 'A', '--email' => 'taken@example.com'])
            ->expectsQuestion(self::PASSWORD_PROMPT, 'Strong-Password-1')
            ->expectsQuestion('Confirm password', 'Strong-Password-1')
            ->assertFailed();

        $this->assertDatabaseMissing('admin_users', ['email' => 'new@example.com']);
        $this->assertSame(1, AdminUser::count());
    }
}
