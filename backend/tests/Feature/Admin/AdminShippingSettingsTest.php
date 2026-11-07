<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\Governorate;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/** Phase 5: shipping fees per governorate and the store settings, as the dashboard uses them. */
class AdminShippingSettingsTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private const SHIPPING_URL = '/api/v1/admin/governorates';

    private const SETTINGS_URL = '/api/v1/admin/settings';

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore(codFee: 1000);
    }

    private function signIn(AdminRole $role = AdminRole::SuperAdmin): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function feeUrl(Governorate $governorate): string
    {
        return self::SHIPPING_URL.'/'.$governorate->id;
    }

    // --- Shipping ---------------------------------------------------------------------------------

    public function test_lists_every_governorate_with_both_names_fee_switch_and_last_update(): void
    {
        Governorate::factory()->create(['code' => 'EG-X1', 'name_en' => 'Aswan', 'name_ar' => 'أسوان', 'sort_order' => 9]);
        $this->signIn(AdminRole::StoreManager);

        $rows = collect($this->getJson(self::SHIPPING_URL)->assertOk()->json('data'))->keyBy('name_en');

        $this->assertCount(2, $rows);
        $this->assertSame(['القاهرة', 5000, true], [$rows['Cairo']['name_ar'], $rows['Cairo']['shipping_fee_piastres'], $rows['Cairo']['is_deliverable']]);
        $this->assertSame(['أسوان', null, false], [$rows['Aswan']['name_ar'], $rows['Aswan']['shipping_fee_piastres'], $rows['Aswan']['is_deliverable']]);
        $this->assertMatchesRegularExpression('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/', $rows['Cairo']['updated_at']);
    }

    public function test_shipping_and_settings_need_a_signed_in_admin_with_the_right_permission(): void
    {
        $this->getJson(self::SHIPPING_URL)->assertUnauthorized();
        $this->patchJson($this->feeUrl($this->governorate), ['shipping_fee_piastres' => 1])->assertUnauthorized();
        $this->getJson(self::SETTINGS_URL)->assertUnauthorized();
        $this->patchJson(self::SETTINGS_URL, ['settings' => ['store.enabled' => false]])->assertUnauthorized();

        foreach ([AdminRole::ContentEditor, AdminRole::Support] as $role) {
            $this->signIn($role);
            $this->getJson(self::SHIPPING_URL)->assertForbidden();
            $this->patchJson($this->feeUrl($this->governorate), ['shipping_fee_piastres' => 1])->assertForbidden();
        }

        // Store managers run shipping, but store settings (payments, store switch) are super-admin only.
        foreach ([AdminRole::StoreManager, AdminRole::ContentEditor, AdminRole::Support] as $role) {
            $this->signIn($role);
            $this->getJson(self::SETTINGS_URL)->assertForbidden();
            $this->patchJson(self::SETTINGS_URL, ['settings' => ['store.enabled' => false]])->assertForbidden();
        }

        $this->assertSame(5000, $this->governorate->refresh()->shipping_fee_piastres);
        $this->assertTrue(app(SettingsService::class)->get('store.enabled'));
    }

    public function test_fee_is_saved_as_integer_piastres_and_invalid_amounts_are_rejected(): void
    {
        $this->signIn(AdminRole::StoreManager);
        $url = $this->feeUrl($this->governorate);

        foreach ([-1, 12.5, '12.50', 'abc', true, 4294967296] as $bad) {
            $this->patchJson($url, ['shipping_fee_piastres' => $bad])
                ->assertUnprocessable()->assertJsonValidationErrors('shipping_fee_piastres');
        }
        $this->assertSame(5000, $this->governorate->refresh()->shipping_fee_piastres);

        $this->patchJson($url, ['shipping_fee_piastres' => 7550, 'expected_shipping_fee_piastres' => 5000])
            ->assertOk()
            ->assertJsonPath('data.shipping_fee_piastres', 7550)
            ->assertJsonPath('data.is_deliverable', true);
        $this->assertSame(7550, $this->governorate->refresh()->shipping_fee_piastres);

        // Free delivery is a fee of 0, not "no fee".
        $this->patchJson($url, ['shipping_fee_piastres' => 0])->assertOk()->assertJsonPath('data.shipping_fee_piastres', 0);
    }

    public function test_a_change_made_meanwhile_is_reported_and_nothing_is_saved(): void
    {
        $this->signIn(AdminRole::StoreManager);
        $url = $this->feeUrl($this->governorate);

        $this->patchJson($url, ['shipping_fee_piastres' => 9000, 'expected_shipping_fee_piastres' => 4000])
            ->assertStatus(409)
            ->assertJsonPath('current.shipping_fee_piastres', 5000)
            ->assertJsonPath('current.name_en', 'Cairo');

        $this->patchJson($url, ['is_deliverable' => false, 'expected_is_deliverable' => false])
            ->assertStatus(409)
            ->assertJsonPath('current.is_deliverable', true);

        $this->assertSame([5000, true], [$this->governorate->refresh()->shipping_fee_piastres, $this->governorate->is_deliverable]);
    }

    public function test_disabled_governorates_cannot_be_chosen_at_checkout_and_need_a_fee_to_be_enabled(): void
    {
        $variant = $this->variant();
        $this->signIn(AdminRole::StoreManager);
        $other = Governorate::factory()->create(['name_en' => 'Giza', 'name_ar' => 'الجيزة']);

        $this->patchJson($this->feeUrl($other), ['is_deliverable' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('shipping_fee_piastres');

        $this->patchJson($this->feeUrl($this->governorate), ['is_deliverable' => false, 'expected_is_deliverable' => true])
            ->assertOk()->assertJsonPath('data.is_deliverable', false)->assertJsonPath('data.shipping_fee_piastres', 5000);

        $public = collect($this->getJson('/api/v1/governorates')->assertOk()->json('data'))->keyBy('code');
        $this->assertFalse($public[$this->governorate->code]['is_deliverable']);
        $this->assertNull($public[$this->governorate->code]['shipping_fee']);

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))
            ->assertUnprocessable()->assertJsonValidationErrors('governorate_id');
        $this->assertSame(0, Order::count());

        $this->patchJson($this->feeUrl($this->governorate), ['is_deliverable' => true])->assertOk();
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated();
    }

    public function test_checkout_charges_the_saved_fee_and_ignores_fees_sent_by_the_browser(): void
    {
        $variant = $this->variant(stock: 10, price: 45000);
        $this->signIn(AdminRole::StoreManager);
        $this->patchJson($this->feeUrl($this->governorate), ['shipping_fee_piastres' => 7550])->assertOk();

        $public = collect($this->getJson('/api/v1/governorates')->json('data'))->keyBy('code');
        $this->assertSame(['amount_piastres' => 7550, 'currency' => 'EGP'], $public[$this->governorate->code]['shipping_fee']);

        // A lower total than the server's (shipping left out) is refused with the real totals.
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['expected_total_piastres' => 46000]))
            ->assertStatus(409)
            ->assertJsonPath('totals.shipping_fee.amount_piastres', 7550)
            ->assertJsonPath('totals.total.amount_piastres', 53550);

        // Fee fields sent by the browser are ignored: the server uses the governorate's fee.
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], [
            'shipping_fee_piastres' => 0,
            'shipping_fee' => ['amount_piastres' => 0],
            'totals' => ['shipping_fee' => 0],
        ]))->assertCreated()->assertJsonPath('data.totals.shipping_fee.amount_piastres', 7550);

        $order = Order::sole();
        $this->assertSame([45000, 7550, 1000, 53550],
            [$order->subtotal_piastres, $order->shipping_fee_piastres, $order->cod_fee_piastres, $order->total_piastres]);
    }

    public function test_new_fees_apply_only_to_new_orders_and_existing_orders_keep_their_saved_fee(): void
    {
        $variant = $this->variant(stock: 10, price: 45000);
        $token = $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated()->json('meta.guest_access_token');
        $old = Order::sole();
        $before = $old->only(['subtotal_piastres', 'shipping_fee_piastres', 'cod_fee_piastres', 'total_piastres', 'updated_at']);
        $paymentBefore = Payment::sole()->only(['amount_piastres', 'status', 'updated_at']);
        $this->assertSame(5000, $before['shipping_fee_piastres']);

        $this->signIn(AdminRole::StoreManager);
        $this->patchJson($this->feeUrl($this->governorate), ['shipping_fee_piastres' => 9000])->assertOk();
        $this->patchJson($this->feeUrl($this->governorate), ['is_deliverable' => false])->assertOk();
        $this->patchJson($this->feeUrl($this->governorate), ['is_deliverable' => true])->assertOk();

        $this->assertEquals($before, $old->refresh()->only(array_keys($before)));
        $this->assertEquals($paymentBefore, Payment::sole()->only(array_keys($paymentBefore)));

        $this->getJson("/api/v1/admin/orders/{$old->order_number}")->assertOk()
            ->assertJsonPath('data.totals.shipping_fee.amount_piastres', 5000)
            ->assertJsonPath('data.totals.total.amount_piastres', 51000);
        $this->getJson("/api/v1/orders/{$old->order_number}?token={$token}")->assertOk()
            ->assertJsonPath('data.totals.shipping_fee.amount_piastres', 5000);

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated();
        $this->assertSame([5000, 9000], Order::orderBy('id')->pluck('shipping_fee_piastres')->all());
    }

    // --- Store settings ---------------------------------------------------------------------------

    public function test_store_settings_are_listed_with_the_fixed_currency_and_payment_facts(): void
    {
        $this->signIn();

        $response = $this->getJson(self::SETTINGS_URL)->assertOk()
            ->assertJsonPath('meta.currency', 'EGP')
            ->assertJsonPath('meta.test_mode', false)
            ->assertJsonPath('meta.card_providers', []);

        $values = collect($response->json('data'))->pluck('value', 'key');
        $this->assertSame(array_keys(config('settings')), $values->keys()->all());
        $this->assertSame([true, 1000, true, false, null], [
            $values['store.enabled'], $values['store.cod_fee_piastres'], $values['store.cod_enabled'],
            $values['store.card_payments_enabled'], $values['store.card_provider'],
        ]);
    }

    public function test_each_editable_store_setting_is_validated(): void
    {
        $this->signIn();
        $cases = [
            'store.enabled' => ['yes please', null],
            'store.cod_enabled' => ['maybe'],
            'store.card_payments_enabled' => ['on?'],
            'store.cod_fee_piastres' => [-1, 12.5, 'abc', 4294967296, true],
            'store.free_shipping_threshold_piastres' => [-100, 99.99, 'free', true],
            'store.pending_payment_ttl_minutes' => [4, 1441, 'soon', null, true],
        ];

        foreach ($cases as $key => $values) {
            foreach ($values as $value) {
                $this->patchJson(self::SETTINGS_URL, ['settings' => [$key => $value]])
                    ->assertUnprocessable()->assertJsonValidationErrors("settings.{$key}");
            }
        }

        $this->patchJson(self::SETTINGS_URL, ['settings' => [
            'store.free_shipping_threshold_piastres' => 150000,
            'store.pending_payment_ttl_minutes' => 45,
            'store.cod_fee_piastres' => 1500,
        ]])->assertOk();

        $settings = app(SettingsService::class);
        $this->assertSame([150000, 45, 1500], [
            $settings->get('store.free_shipping_threshold_piastres'),
            $settings->get('store.pending_payment_ttl_minutes'),
            $settings->get('store.cod_fee_piastres'),
        ]);

        // Back to "no free shipping".
        $this->patchJson(self::SETTINGS_URL, ['settings' => ['store.free_shipping_threshold_piastres' => null]])->assertOk();
        $this->assertNull($settings->get('store.free_shipping_threshold_piastres'));
    }

    public function test_a_setting_changed_meanwhile_is_reported_and_nothing_is_saved(): void
    {
        $this->signIn();

        $this->patchJson(self::SETTINGS_URL, [
            'settings' => ['store.enabled' => false, 'store.cod_fee_piastres' => 2000],
            'expected' => ['store.enabled' => false, 'store.cod_fee_piastres' => 1000],
        ])->assertStatus(409)->assertJsonPath('current', ['store.enabled' => true]);

        $this->patchJson(self::SETTINGS_URL, ['settings' => ['store.enabled' => false], 'expected' => ['store.nope' => 1]])
            ->assertUnprocessable()->assertJsonValidationErrors('expected');

        $settings = app(SettingsService::class);
        $this->assertSame([true, 1000], [$settings->get('store.enabled'), $settings->get('store.cod_fee_piastres')]);

        $this->patchJson(self::SETTINGS_URL, [
            'settings' => ['store.cod_fee_piastres' => 2000],
            'expected' => ['store.cod_fee_piastres' => 1000],
        ])->assertOk();
        $this->assertSame(2000, $settings->get('store.cod_fee_piastres'));
    }

    public function test_closing_the_store_from_the_dashboard_stops_checkout(): void
    {
        $variant = $this->variant();
        $this->signIn();

        $this->patchJson(self::SETTINGS_URL, ['settings' => ['store.enabled' => false], 'expected' => ['store.enabled' => true]])->assertOk();

        $this->assertFalse($this->getJson('/api/v1/settings')->json('data')['store.enabled']);
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertStatus(503);
        $this->assertSame(0, Order::count());
    }

    public function test_payment_configuration_is_unchanged_when_an_update_is_refused(): void
    {
        $admin = $this->signIn();
        $before = Setting::query()->orderBy('key')->get(['key', 'value', 'updated_by_admin_id'])->toArray();

        // No card provider is configured outside test mode: enabling card payments is refused, and
        // the valid COD fee in the same request is not saved either (all-or-nothing).
        $this->patchJson(self::SETTINGS_URL, ['settings' => ['store.cod_fee_piastres' => 500, 'store.card_payments_enabled' => true]])
            ->assertUnprocessable()->assertJsonValidationErrors('settings.store.card_payments_enabled');
        $this->patchJson(self::SETTINGS_URL, ['settings' => ['store.card_provider' => 'paymob']])
            ->assertUnprocessable()->assertJsonValidationErrors('settings.store.card_provider');

        $this->assertSame($before, Setting::query()->orderBy('key')->get(['key', 'value', 'updated_by_admin_id'])->toArray());
        $this->assertNotSame($admin->id, Setting::where('key', 'store.cod_fee_piastres')->value('updated_by_admin_id'));
    }
}
