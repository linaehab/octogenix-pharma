<?php

namespace Tests\Feature;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\Setting;
use Database\Seeders\SettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN_URL = '/api/v1/admin/settings';

    private function actingAsSuperAdmin(): AdminUser
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    public function test_public_endpoint_exposes_only_public_settings(): void
    {
        $this->seed(SettingsSeeder::class);

        $data = $this->getJson('/api/v1/settings')->assertOk()->json('data');

        $this->assertSame(['+201090075087', '+201018302408', '+20572070371'], $data['contact.phones']);
        $this->assertSame('info@octogenixpharma.com', $data['contact.email']);
        $this->assertFalse($data['store.enabled']);
        $this->assertNull($data['store.cod_fee_piastres']);
        $this->assertArrayNotHasKey('contact.notification_recipients', $data);
        $this->assertArrayNotHasKey('store.card_provider', $data);
        $this->assertArrayNotHasKey('store.pending_payment_ttl_minutes', $data);
    }

    public function test_seeder_is_idempotent_and_never_overwrites_saved_values(): void
    {
        $this->seed(SettingsSeeder::class);
        Setting::where('key', 'contact.email')->update(['value' => json_encode('sales@example.com')]);

        $this->seed(SettingsSeeder::class);

        $this->assertSame(count(config('settings')), Setting::count());
        $this->assertSame('sales@example.com', Setting::where('key', 'contact.email')->value('value'));
    }

    public function test_only_super_admins_manage_settings(): void
    {
        foreach ([AdminRole::ContentEditor, AdminRole::StoreManager, AdminRole::Support] as $role) {
            $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();

            $this->getJson(self::ADMIN_URL)->assertForbidden();
            $this->patchJson(self::ADMIN_URL, ['settings' => ['contact.email' => 'x@example.com']])->assertForbidden();
        }
    }

    public function test_super_admin_updates_settings_and_the_public_cache_is_refreshed(): void
    {
        $admin = $this->actingAsSuperAdmin();
        // Setting keys contain dots, so read them as array keys rather than JSON paths.
        $this->assertSame('info@octogenixpharma.com', $this->getJson('/api/v1/settings')->json('data')['contact.email']);

        $this->patchJson(self::ADMIN_URL, ['settings' => [
            'contact.email' => ' Sales@Example.com ',
            'contact.phones' => ['010-1234-5678', '+20 2 1234 5678'],
            'contact.notification_recipients' => ['Team@Example.com', 'team@example.com'],
            'store.cod_fee_piastres' => 0,
            'store.cod_enabled' => true,
        ]])->assertOk();

        $public = $this->getJson('/api/v1/settings')->json('data');
        $this->assertSame('sales@example.com', $public['contact.email']);
        $this->assertSame(['+201012345678', '+20212345678'], $public['contact.phones']);
        $this->assertTrue($public['store.cod_enabled']);
        $this->assertSame(0, $public['store.cod_fee_piastres']);

        $recipients = Setting::where('key', 'contact.notification_recipients')->sole();
        $this->assertSame(['team@example.com'], $recipients->value);
        $this->assertSame($admin->id, $recipients->updated_by_admin_id);
    }

    public function test_invalid_values_and_unknown_keys_are_rejected_without_saving_anything(): void
    {
        $this->actingAsSuperAdmin();

        $this->patchJson(self::ADMIN_URL, ['settings' => [
            'contact.email' => 'valid@example.com',
            'contact.notification_recipients' => ['not-an-email'],
            'contact.phones' => ['123'],
            'store.cod_fee_piastres' => -5,
            'store.pending_payment_ttl_minutes' => 1,
            'store.enabled' => 'maybe',
            'store.unknown' => true,
        ]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'settings.contact.notification_recipients',
                'settings.contact.phones',
                'settings.store.cod_fee_piastres',
                'settings.store.pending_payment_ttl_minutes',
                'settings.store.enabled',
                'settings.store.unknown',
            ]);

        $this->assertSame(0, Setting::count());
    }

    public function test_cod_cannot_be_enabled_without_a_fee(): void
    {
        $this->actingAsSuperAdmin();

        $this->patchJson(self::ADMIN_URL, ['settings' => ['store.cod_enabled' => true]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('settings.store.cod_enabled');
    }

    public function test_card_payments_cannot_be_enabled_until_a_provider_is_implemented(): void
    {
        $this->actingAsSuperAdmin();

        $this->patchJson(self::ADMIN_URL, ['settings' => ['store.card_payments_enabled' => true]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('settings.store.card_payments_enabled');

        $this->patchJson(self::ADMIN_URL, ['settings' => ['store.card_provider' => 'some-gateway']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('settings.store.card_provider');
    }
}
