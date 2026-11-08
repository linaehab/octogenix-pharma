<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\DiscountType;
use App\Models\AdminAuditLog;
use App\Models\AdminUser;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\PromoCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/** Discounts & promo codes in the dashboard (catalog.manage). All amounts are test values. */
class AdminDiscountsAndPromoCodesTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore(codFee: 1000);
    }

    private function signIn(AdminRole $role = AdminRole::StoreManager): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function discountUrl(ProductVariant $variant): string
    {
        return "/api/v1/admin/product-variants/{$variant->id}/discount";
    }

    private function promoPayload(array $overrides = []): array
    {
        return [
            'code' => 'welcome-10', 'description' => 'Launch test code', 'discount_type' => 'percent', 'discount_value' => 10,
            'min_order_piastres' => null, 'usage_limit' => null, 'per_customer_limit' => null, 'is_active' => false,
            ...$overrides,
        ];
    }

    public function test_only_admins_who_manage_the_catalogue_can_use_discounts(): void
    {
        $variant = $this->variant();
        $urls = [
            ['get', '/api/v1/admin/discounts/products'], ['get', '/api/v1/admin/promo-codes'],
            ['post', '/api/v1/admin/promo-codes'], ['put', $this->discountUrl($variant)], ['delete', $this->discountUrl($variant)],
        ];

        foreach ($urls as [$method, $url]) {
            $this->json($method, $url)->assertUnauthorized();
        }

        foreach ([AdminRole::Support, AdminRole::ContentEditor] as $role) {
            $this->signIn($role);
            foreach ($urls as [$method, $url]) {
                $this->json($method, $url)->assertForbidden();
            }
        }

        $this->signIn(AdminRole::StoreManager);
        $this->getJson('/api/v1/admin/discounts/products')->assertOk();
        $this->signIn(AdminRole::SuperAdmin);
        $this->getJson('/api/v1/admin/promo-codes')->assertOk();
        $this->assertSame(0, PromoCode::count());
        $this->assertNull($variant->refresh()->discount_type);
    }

    public function test_product_discounts_are_set_edited_switched_and_removed_with_an_audit_trail(): void
    {
        $variant = $this->variant(price: 45000);
        $this->signIn();

        $this->getJson('/api/v1/admin/discounts/products')->assertOk()
            ->assertJsonPath('data.0.state', 'none')->assertJsonPath('data.0.effective_price_piastres', 45000);

        $this->putJson($this->discountUrl($variant), ['type' => 'percent', 'value' => 10, 'is_active' => true, 'expected' => null])
            ->assertOk()
            ->assertJsonPath('data.state', 'active')
            ->assertJsonPath('data.price_piastres', 45000)
            ->assertJsonPath('data.effective_price_piastres', 40500);

        $current = ['type' => 'percent', 'value' => 10, 'is_active' => true, 'starts_at' => null, 'ends_at' => null];
        $this->putJson($this->discountUrl($variant), ['type' => 'fixed', 'value' => 5000, 'is_active' => true, 'expected' => $current])
            ->assertOk()->assertJsonPath('data.effective_price_piastres', 40000);

        // Someone else's change is not overwritten.
        $this->putJson($this->discountUrl($variant), ['type' => 'fixed', 'value' => 100, 'is_active' => true, 'expected' => $current])
            ->assertStatus(409)->assertJsonPath('current.discount.value', 5000);

        $current = ['type' => 'fixed', 'value' => 5000, 'is_active' => true, 'starts_at' => null, 'ends_at' => null];
        $this->putJson($this->discountUrl($variant), [...$current, 'is_active' => false, 'expected' => $current])
            ->assertOk()->assertJsonPath('data.state', 'inactive')->assertJsonPath('data.effective_price_piastres', 45000);

        $this->getJson('/api/v1/admin/discounts/products?state=inactive')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/discounts/products?state=active')->assertJsonCount(0, 'data');

        $this->deleteJson($this->discountUrl($variant), ['expected' => [...$current, 'is_active' => false]])
            ->assertOk()->assertJsonPath('data.state', 'none')->assertJsonPath('data.discount', null);
        $this->assertSame(45000, $variant->refresh()->price_piastres, 'The regular price is never changed.');

        $this->assertSame([
            'discounts.product_discount_added', 'discounts.product_discount_changed',
            'discounts.product_discount_deactivated', 'discounts.product_discount_removed',
        ], AdminAuditLog::orderBy('id')->pluck('action')->all());
    }

    public function test_invalid_product_discounts_and_price_edits_are_refused(): void
    {
        $variant = $this->variant(price: 10000);
        $this->signIn();

        foreach ([
            [['type' => 'percent', 'value' => 0, 'is_active' => true], 'value'],
            [['type' => 'percent', 'value' => 100, 'is_active' => true], 'value'],
            [['type' => 'fixed', 'value' => 10000, 'is_active' => true], 'value'],
            [['type' => 'fixed', 'value' => true, 'is_active' => true], 'value'],
            [['type' => 'fixed', 'value' => '50', 'is_active' => true], 'value'],
            [['type' => 'half', 'value' => 5, 'is_active' => true], 'type'],
            [['type' => 'percent', 'value' => 5, 'is_active' => 'yes'], 'is_active'],
            [['type' => 'percent', 'value' => 5, 'is_active' => true, 'starts_at' => '2030-01-02 10:00', 'ends_at' => '2030-01-01 10:00'], 'ends_at'],
            [['type' => 'percent', 'value' => 5, 'is_active' => true, 'ends_at' => now()->subHour()->toIso8601String()], 'ends_at'],
        ] as [$payload, $field]) {
            $this->putJson($this->discountUrl($variant), $payload)->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertNull($variant->refresh()->discount_type);

        // A fixed discount keeps the price above it; a discounted product cannot also get a compare-at price.
        $this->putJson($this->discountUrl($variant), ['type' => 'fixed', 'value' => 4000, 'is_active' => true])->assertOk();
        $this->patchJson("/api/v1/admin/product-variants/{$variant->id}", ['price_piastres' => 4000])
            ->assertUnprocessable()->assertJsonValidationErrors('price_piastres');
        $this->patchJson("/api/v1/admin/product-variants/{$variant->id}", ['compare_at_price_piastres' => 20000])
            ->assertUnprocessable()->assertJsonValidationErrors('compare_at_price_piastres');
        $this->patchJson("/api/v1/admin/product-variants/{$variant->id}", ['price_piastres' => 9000])->assertOk();
        $this->assertSame(5000, $variant->refresh()->effectivePricePiastres());

        $other = $this->variant(price: 10000);
        $other->forceFill(['compare_at_price_piastres' => 12000])->save();
        $this->putJson($this->discountUrl($other), ['type' => 'percent', 'value' => 5, 'is_active' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('type');
    }

    public function test_promo_codes_are_created_edited_and_switched_with_validation_and_an_audit_trail(): void
    {
        $this->signIn();

        $id = $this->postJson('/api/v1/admin/promo-codes', $this->promoPayload([
            'starts_at' => '2030-01-01T00:00:00+02:00', 'ends_at' => '2030-02-01T00:00:00+02:00',
            'min_order_piastres' => 50000, 'usage_limit' => 100, 'per_customer_limit' => 1,
        ]))->assertCreated()
            ->assertJsonPath('data.code', 'WELCOME-10')
            ->assertJsonPath('data.state', 'inactive')
            ->assertJsonPath('data.starts_at', '2029-12-31T22:00:00+00:00')
            ->assertJsonPath('data.usage.orders_total', 0)
            ->json('data.id');

        // Codes are unique whatever the letter case.
        $this->postJson('/api/v1/admin/promo-codes', $this->promoPayload(['code' => 'Welcome-10']))
            ->assertUnprocessable()->assertJsonValidationErrors('code');

        foreach ([
            [['code' => 'no spaces'], 'code'],
            [['code' => 'AB'], 'code'],
            [['code' => 'خصم10'], 'code'],
            [['code' => 'P1', 'discount_value' => 100], 'code'],
            [['code' => 'PCT', 'discount_value' => 100], 'discount_value'],
            [['code' => 'ZERO', 'discount_value' => 0], 'discount_value'],
            [['code' => 'STR', 'discount_value' => '10'], 'discount_value'],
            [['code' => 'MIN', 'min_order_piastres' => 0], 'min_order_piastres'],
            [['code' => 'LIM', 'usage_limit' => 1, 'per_customer_limit' => 2], 'per_customer_limit'],
            [['code' => 'DATES', 'starts_at' => '2030-02-01', 'ends_at' => '2030-01-01'], 'ends_at'],
            [['code' => 'PAST', 'ends_at' => now()->subDay()->toIso8601String()], 'ends_at'],
            [['code' => 'HTML', 'description' => '<b>x</b>'], 'description'],
        ] as [$overrides, $field]) {
            $this->postJson('/api/v1/admin/promo-codes', $this->promoPayload($overrides))
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertSame(1, PromoCode::count());

        $updatedAt = PromoCode::find($id)->updated_at->toIso8601String();
        $this->patchJson("/api/v1/admin/promo-codes/{$id}", ['discount_type' => 'fixed', 'discount_value' => 2500, 'expected_updated_at' => $updatedAt])
            ->assertOk()->assertJsonPath('data.discount_type', 'fixed')->assertJsonPath('data.discount_value', 2500);

        $this->travel(1)->seconds();
        $this->patchJson("/api/v1/admin/promo-codes/{$id}", ['is_active' => true, 'expected_updated_at' => PromoCode::find($id)->updated_at->toIso8601String()])
            ->assertOk()->assertJsonPath('data.is_active', true)->assertJsonPath('data.state', 'scheduled');

        // A stale screen does not overwrite.
        $this->patchJson("/api/v1/admin/promo-codes/{$id}", ['is_active' => false, 'expected_updated_at' => $updatedAt])
            ->assertStatus(409)->assertJsonPath('current.is_active', true);

        $this->travel(1)->seconds();
        $this->patchJson("/api/v1/admin/promo-codes/{$id}", ['is_active' => false])->assertOk()->assertJsonPath('data.state', 'inactive');

        $this->getJson('/api/v1/admin/promo-codes?search=welcome')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/promo-codes?state=active')->assertOk()->assertJsonCount(0, 'data');
        $this->deleteJson("/api/v1/admin/promo-codes/{$id}")->assertStatus(405);

        $this->assertSame([
            'discounts.promo_code_created', 'discounts.promo_code_changed',
            'discounts.promo_code_activated', 'discounts.promo_code_deactivated',
        ], AdminAuditLog::orderBy('id')->pluck('action')->all());
    }

    public function test_usage_shows_counted_and_released_orders_from_real_orders(): void
    {
        $variant = $this->variant(stock: 10, price: 30000);
        $promo = PromoCode::create(['code' => 'USED', 'discount_type' => DiscountType::Percent, 'discount_value' => 10, 'is_active' => true]);

        $first = $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['promo_code' => 'USED']))->assertCreated();
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 2], ['promo_code' => 'USED', 'contact' => ['email' => 'b@example.com']]))->assertCreated();
        $this->postJson("/api/v1/orders/{$first->json('data.order_number')}/cancel?token={$first->json('meta.guest_access_token')}")->assertOk();

        $this->signIn();
        $this->getJson('/api/v1/admin/promo-codes')->assertJsonPath('data.0.used_count', 1);
        $this->getJson("/api/v1/admin/promo-codes/{$promo->id}")->assertOk()
            ->assertJsonPath('data.usage', ['orders_total' => 2, 'orders_released' => 1, 'orders_counted' => 1, 'discount_given_piastres' => 6000]);

        // The dashboard order view shows the code and the snapshot.
        $number = Order::where('customer_email', 'b@example.com')->value('order_number');
        $this->getJson("/api/v1/admin/orders/{$number}")->assertOk()
            ->assertJsonPath('data.promo.code', 'USED')
            ->assertJsonPath('data.totals.discount.amount_piastres', 6000)
            ->assertJsonPath('data.items.0.promo_discount.amount_piastres', 6000);
    }
}
