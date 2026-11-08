<?php

namespace Tests\Feature\Orders;

use App\Enums\DiscountType;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\PromoCode;
use App\Services\PromoCodeService;
use App\Services\SettingsService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/**
 * Product discounts and promo codes in the store: the server alone decides prices, discounts and
 * totals; orders keep what they got. All amounts are test values.
 */
class PromoCodeCheckoutTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore(codFee: 1000);
    }

    private function discount(ProductVariant $variant, DiscountType $type, int $value, bool $active = true, ?string $starts = null, ?string $ends = null): ProductVariant
    {
        $variant->forceFill([
            'discount_type' => $type, 'discount_value' => $value, 'discount_is_active' => $active,
            'discount_starts_at' => $starts, 'discount_ends_at' => $ends,
        ])->save();

        return $variant->refresh();
    }

    private function promo(array $attributes = []): PromoCode
    {
        return PromoCode::create([
            'code' => 'SAVE10', 'discount_type' => DiscountType::Percent, 'discount_value' => 10, 'is_active' => true,
            ...$attributes,
        ]);
    }

    private function preview(array $items, ?string $code): TestResponse
    {
        return $this->postJson('/api/v1/cart/preview', [
            'items' => collect($items)->map(fn ($q, $id) => ['variant_id' => $id, 'quantity' => $q])->values()->all(),
            'promo_code' => $code,
        ])->assertOk();
    }

    public function test_a_product_discount_sets_the_price_everywhere_and_the_order_keeps_it(): void
    {
        $variant = $this->discount($this->variant(price: 45000), DiscountType::Percent, 10);
        $slug = $variant->product->slug;

        $this->getJson("/api/v1/products/{$slug}")->assertOk()
            ->assertJsonPath('data.variants.0.price.amount_piastres', 40500)
            ->assertJsonPath('data.variants.0.compare_at_price.amount_piastres', 45000)
            ->assertJsonPath('data.variants.0.discount.type', 'percent')
            ->assertJsonPath('data.price_from.amount_piastres', 40500);

        $this->preview([$variant->id => 2], null)
            ->assertJsonPath('data.items.0.unit_price.amount_piastres', 40500)
            ->assertJsonPath('data.items.0.regular_unit_price.amount_piastres', 45000)
            ->assertJsonPath('data.subtotal.amount_piastres', 81000);

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 2], ['expected_total_piastres' => 87000]))
            ->assertCreated()
            ->assertJsonPath('data.items.0.unit_price.amount_piastres', 40500)
            ->assertJsonPath('data.items.0.regular_unit_price.amount_piastres', 45000);

        $order = Order::sole();
        $item = $order->items()->sole();
        $this->assertSame([81000, 0, 5000, 1000, 87000],
            [$order->subtotal_piastres, $order->discount_piastres, $order->shipping_fee_piastres, $order->cod_fee_piastres, $order->total_piastres]);
        $this->assertSame([40500, 9000, 0, 81000], [$item->unit_price_piastres, $item->product_discount_piastres, $item->discount_piastres, $item->line_total_piastres]);
        $this->assertSame(87000, Payment::sole()->amount_piastres);

        // Ending the discount changes new prices only; the order keeps its snapshot.
        $variant->forceFill(['discount_type' => null, 'discount_value' => null, 'discount_is_active' => false])->save();
        $this->getJson("/api/v1/products/{$slug}")->assertJsonPath('data.variants.0.price.amount_piastres', 45000)
            ->assertJsonPath('data.variants.0.discount', null);
        $this->assertSame([40500, 9000, 87000], [$item->refresh()->unit_price_piastres, $item->product_discount_piastres, $order->refresh()->total_piastres]);
    }

    public function test_inactive_scheduled_and_expired_product_discounts_are_not_applied(): void
    {
        $off = $this->discount($this->variant(price: 30000), DiscountType::Fixed, 5000, active: false);
        $later = $this->discount($this->variant(price: 30000), DiscountType::Fixed, 5000, starts: now()->addDay()->toDateTimeString());
        $past = $this->discount($this->variant(price: 30000), DiscountType::Fixed, 5000,
            starts: now()->subDays(3)->toDateTimeString(), ends: now()->subDay()->toDateTimeString());

        foreach ([$off, $later, $past] as $variant) {
            $this->assertSame(30000, $variant->effectivePricePiastres());
        }
        $this->preview([$off->id => 1, $later->id => 1, $past->id => 1], null)->assertJsonPath('data.subtotal.amount_piastres', 90000);

        $this->travel(2)->days();
        $this->assertSame(25000, $later->refresh()->effectivePricePiastres(), 'A scheduled discount starts on its date.');
    }

    public function test_a_promo_code_applies_only_to_items_without_their_own_discount(): void
    {
        $plain = $this->variant(price: 30000);
        $onSale = $this->discount($this->variant(price: 20000), DiscountType::Fixed, 5000);
        $this->promo(['code' => 'SAVE10']);

        // 10% of the plain line only (2 x 300.00 = 600.00 → 60.00); the discounted line keeps 150.00.
        $this->preview([$plain->id => 2, $onSale->id => 1], 'save10')
            ->assertJsonPath('data.promo.code', 'SAVE10')
            ->assertJsonPath('data.promo.applied', true)
            ->assertJsonPath('data.discount.amount_piastres', 6000)
            ->assertJsonPath('data.subtotal.amount_piastres', 75000)
            ->assertJsonPath('data.items_total.amount_piastres', 69000);

        // The browser's own discount figures are ignored; a wrong expected total is refused with the real one.
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$plain->id => 2, $onSale->id => 1], [
            'promo_code' => 'save10', 'discount_piastres' => 75000, 'expected_total_piastres' => 1000,
        ]))->assertStatus(409)
            ->assertJsonPath('totals.discount.amount_piastres', 6000)
            ->assertJsonPath('totals.total.amount_piastres', 75000);
        $this->assertSame(0, Order::count());

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$plain->id => 2, $onSale->id => 1], [
            'promo_code' => ' save10 ', 'expected_total_piastres' => 75000,
        ]))->assertCreated()
            ->assertJsonPath('data.promo.code', 'SAVE10')
            ->assertJsonPath('data.totals.discount.amount_piastres', 6000);

        $order = Order::sole();
        $this->assertSame([75000, 6000, 5000, 1000, 75000],
            [$order->subtotal_piastres, $order->discount_piastres, $order->shipping_fee_piastres, $order->cod_fee_piastres, $order->total_piastres]);
        $this->assertSame(['SAVE10', 'percent', 10], [$order->promo_code, $order->promo_discount_type->value, $order->promo_discount_value]);

        $lines = $order->items->keyBy('product_variant_id');
        $this->assertSame([30000, 0, 6000, 54000], [$lines[$plain->id]->unit_price_piastres, $lines[$plain->id]->product_discount_piastres,
            $lines[$plain->id]->discount_piastres, $lines[$plain->id]->line_total_piastres]);
        $this->assertSame([15000, 5000, 0, 15000], [$lines[$onSale->id]->unit_price_piastres, $lines[$onSale->id]->product_discount_piastres,
            $lines[$onSale->id]->discount_piastres, $lines[$onSale->id]->line_total_piastres]);

        // Later edits to the code never change the order.
        PromoCode::sole()->update(['discount_value' => 50]);
        $this->assertSame([6000, 10], [$order->refresh()->discount_piastres, $order->promo_discount_value]);
    }

    public function test_fixed_codes_are_capped_and_shares_add_up_exactly(): void
    {
        $a = $this->variant(price: 10001);
        $b = $this->variant(price: 20001);
        $c = $this->variant(price: 30001);
        $this->promo(['code' => 'FLAT', 'discount_type' => DiscountType::Fixed, 'discount_value' => 10000]);

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$a->id => 1, $b->id => 1, $c->id => 1], ['promo_code' => 'FLAT']))->assertCreated();
        $order = Order::sole();
        $this->assertSame(10000, $order->discount_piastres);
        $this->assertSame(10000, (int) $order->items()->sum('discount_piastres'));
        $this->assertSame($order->subtotal_piastres - 10000, (int) $order->items()->sum('line_total_piastres'));

        // A fixed amount never exceeds what it applies to.
        $this->assertSame(500, DiscountType::Fixed->apply(5000, 500));
        $this->assertSame(1999, DiscountType::Percent->apply(10, 19999), 'Percentages round down to the piastre.');
        $this->assertSame([1 => 1, 2 => 1, 3 => 1], PromoCodeService::allocate(3, [1 => 100, 2 => 100, 3 => 100]));
        $this->assertSame([1 => 2, 2 => 1], PromoCodeService::allocate(3, [1 => 100, 2 => 100]), 'Ties go to the earlier line.');
    }

    public function test_invalid_codes_are_refused_with_a_reason_and_nothing_is_ordered(): void
    {
        $plain = $this->variant(stock: 5, price: 30000);
        $onSale = $this->discount($this->variant(price: 30000), DiscountType::Percent, 20);
        $this->promo(['code' => 'OFF', 'is_active' => false]);
        $this->promo(['code' => 'SOON', 'starts_at' => now()->addDay()]);
        $this->promo(['code' => 'OLD', 'starts_at' => now()->subDays(5), 'ends_at' => now()->subDay()]);
        $this->promo(['code' => 'BIG', 'min_order_piastres' => 60001]);

        foreach (['NOPE' => 'not_found', 'OFF' => 'inactive', 'SOON' => 'not_started', 'OLD' => 'expired', 'BIG' => 'min_order'] as $code => $reason) {
            $this->preview([$plain->id => 2], $code)
                ->assertJsonPath('data.promo.applied', false)
                ->assertJsonPath('data.promo.reason', $reason)
                ->assertJsonPath('data.discount.amount_piastres', 0);

            $this->postJson('/api/v1/checkout', $this->guestCheckout([$plain->id => 2], ['promo_code' => $code]))
                ->assertStatus(422)->assertJsonValidationErrors('promo_code');
        }

        // The minimum (600.01) is compared with the items total after product discounts:
        // 300.00 + 240.00 = 540.00 is below it; 300.00 + 2 x 240.00 = 780.00 reaches it.
        $this->preview([$plain->id => 1, $onSale->id => 1], 'BIG')->assertJsonPath('data.promo.reason', 'min_order');
        $this->preview([$plain->id => 1, $onSale->id => 2], 'BIG')->assertJsonPath('data.promo.applied', true)
            ->assertJsonPath('data.discount.amount_piastres', 3000);

        // No stacking: a cart of discounted items only cannot use a code.
        $this->promo(['code' => 'ANY']);
        $this->preview([$onSale->id => 1], 'ANY')->assertJsonPath('data.promo.reason', 'not_eligible');
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$onSale->id => 1], ['promo_code' => 'ANY']))->assertStatus(422);

        $this->assertSame(0, Order::count());
        $this->assertSame(5, $plain->refresh()->stock_quantity);
    }

    public function test_usage_limits_count_live_orders_and_cancelling_releases_the_use(): void
    {
        $variant = $this->variant(stock: 20, price: 30000);
        $promo = $this->promo(['code' => 'ONCE', 'usage_limit' => 2, 'per_customer_limit' => 1]);

        $first = $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['promo_code' => 'ONCE']))->assertCreated();

        // Same email (any letter case) → per-customer limit; a retry with the same key is the same order, not a new use.
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['promo_code' => 'ONCE', 'contact' => ['email' => 'MONA@example.com']]))
            ->assertStatus(422)->assertJsonPath('errors.promo_code.0', 'You have already used this promo code.');

        $retry = $this->guestCheckout([$variant->id => 1], ['promo_code' => 'ONCE', 'contact' => ['email' => 'second@example.com']]);
        $this->postJson('/api/v1/checkout', $retry)->assertCreated();
        $this->postJson('/api/v1/checkout', $retry)->assertOk();
        $this->assertSame(2, $promo->countedOrders()->count());

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['promo_code' => 'ONCE', 'contact' => ['email' => 'third@example.com']]))
            ->assertStatus(422)->assertJsonPath('errors.promo_code.0', 'This promo code has reached its usage limit.');

        // Cancelling the first order frees its use (the order still shows the discount it had).
        $number = $first->json('data.order_number');
        $token = $first->json('meta.guest_access_token');
        $this->postJson("/api/v1/orders/{$number}/cancel?token={$token}")->assertOk();
        $this->assertSame(3000, Order::where('order_number', $number)->value('discount_piastres'));

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['promo_code' => 'ONCE', 'contact' => ['email' => 'third@example.com']]))
            ->assertCreated();
        $this->assertSame(2, $promo->countedOrders()->count());
        $this->assertSame(3, $promo->orders()->count());

        // The freed use was taken: the limit holds again.
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['promo_code' => 'ONCE']))
            ->assertStatus(422)->assertJsonPath('errors.promo_code.0', 'This promo code has reached its usage limit.');
    }

    public function test_signed_in_cart_previews_the_code_with_the_customers_own_limit(): void
    {
        $customer = Customer::factory()->create(['email' => 'sara@example.com']);
        $address = CustomerAddress::factory()->for($customer)->create(['governorate_id' => $this->governorate->id, 'is_default' => true]);
        $variant = $this->variant(price: 30000);
        $this->promo(['code' => 'MINE', 'per_customer_limit' => 1]);
        CartItem::create(['customer_id' => $customer->id, 'product_variant_id' => $variant->id, 'quantity' => 1]);
        $this->actingAs($customer, 'customer')->fromFrontend();

        $this->getJson('/api/v1/customer/cart?promo_code=mine')->assertOk()
            ->assertJsonPath('data.promo.applied', true)->assertJsonPath('data.discount.amount_piastres', 3000);

        $this->postJson('/api/v1/checkout', [
            'payment_method' => 'cod', 'idempotency_key' => (string) Str::uuid(), 'address_id' => $address->id, 'promo_code' => 'MINE',
        ])->assertCreated()->assertJsonPath('data.totals.discount.amount_piastres', 3000);

        CartItem::create(['customer_id' => $customer->id, 'product_variant_id' => $variant->id, 'quantity' => 1]);
        $this->getJson('/api/v1/customer/cart?promo_code=MINE')->assertOk()->assertJsonPath('data.promo.reason', 'customer_limit');
        $this->getJson('/api/v1/customer/orders')->assertOk()->assertJsonPath('data.0.promo.code', 'MINE');
    }

    public function test_free_shipping_is_judged_after_the_promo_code(): void
    {
        app(SettingsService::class)->update(['store.free_shipping_threshold_piastres' => 80000]);
        $variant = $this->variant(price: 45000);
        $this->promo(['code' => 'TWENTY', 'discount_value' => 20]);

        // 900.00 alone qualifies; 900.00 - 180.00 = 720.00 does not.
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 2]))
            ->assertCreated()->assertJsonPath('data.totals.shipping_fee.amount_piastres', 0);
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 2], ['promo_code' => 'TWENTY', 'contact' => ['email' => 'b@example.com']]))
            ->assertCreated()
            ->assertJsonPath('data.totals.shipping_fee.amount_piastres', 5000)
            ->assertJsonPath('data.totals.total.amount_piastres', 72000 + 5000 + 1000);
    }

    public function test_the_database_refuses_inconsistent_discounts(): void
    {
        $variant = $this->variant(price: 10000);

        foreach ([
            ['discount_type' => 'percent', 'discount_value' => 100],
            ['discount_type' => 'fixed', 'discount_value' => 10000],
            ['discount_type' => 'fixed', 'discount_value' => null],
        ] as $invalid) {
            try {
                ProductVariant::query()->whereKey($variant->id)->update($invalid);
                $this->fail('Expected the CHECK constraint to refuse '.json_encode($invalid));
            } catch (QueryException) {
                $this->addToAssertionCount(1);
            }
        }

        $this->expectException(QueryException::class);
        PromoCode::create(['code' => 'BAD', 'discount_type' => DiscountType::Percent, 'discount_value' => 0]);
    }
}
