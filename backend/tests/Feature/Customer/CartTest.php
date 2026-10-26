<?php

namespace Tests\Feature\Customer;

use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = Customer::factory()->create();
    }

    private function sellableVariant(int $stock = 10, int $price = 45000): ProductVariant
    {
        return Product::factory()->sellable($stock, $price)->create()->variants()->sole();
    }

    private function signIn(): void
    {
        $this->actingAs($this->customer, 'customer')->fromFrontend();
    }

    public function test_adding_and_updating_items_prices_the_cart_from_the_database(): void
    {
        $this->signIn();
        $variant = $this->sellableVariant(price: 45000);

        $this->putJson("/api/v1/customer/cart/items/{$variant->id}", ['quantity' => 2, 'unit_price' => 1])
            ->assertOk()
            ->assertJsonPath('data.items.0.unit_price', ['amount_piastres' => 45000, 'currency' => 'EGP'])
            ->assertJsonPath('data.items.0.line_total.amount_piastres', 90000)
            ->assertJsonPath('data.subtotal.amount_piastres', 90000)
            ->assertJsonPath('data.item_count', 2);

        // Price changes are reflected immediately: the cart stores no prices.
        $variant->update(['price_piastres' => 50000]);
        $this->getJson('/api/v1/customer/cart')->assertJsonPath('data.subtotal.amount_piastres', 100000);

        $this->putJson("/api/v1/customer/cart/items/{$variant->id}", ['quantity' => 1])
            ->assertJsonPath('data.items.0.quantity', 1);
        $this->assertSame(1, CartItem::count());
    }

    public function test_unavailable_items_and_excessive_quantities_are_refused(): void
    {
        $this->signIn();
        $unpriced = ProductVariant::factory()->create();
        $limited = $this->sellableVariant(stock: 3);
        $limited->update(['max_per_order' => 2]);

        $this->putJson("/api/v1/customer/cart/items/{$unpriced->id}", ['quantity' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors('variant');
        $this->putJson("/api/v1/customer/cart/items/{$limited->id}", ['quantity' => 3])
            ->assertUnprocessable()->assertJsonPath('errors.quantity.0', 'You can add at most 2 of this item.');
        $this->putJson('/api/v1/customer/cart/items/999999', ['quantity' => 1])->assertNotFound();

        $this->assertSame(0, CartItem::count());
    }

    public function test_items_that_become_unavailable_stay_visible_but_do_not_count(): void
    {
        $this->signIn();
        $variant = $this->sellableVariant(stock: 5);
        $this->putJson("/api/v1/customer/cart/items/{$variant->id}", ['quantity' => 4])->assertOk();

        $variant->product->update(['is_purchasable' => false]);

        $this->getJson('/api/v1/customer/cart')
            ->assertJsonPath('data.items.0.is_available', false)
            ->assertJsonPath('data.items.0.unit_price', null)
            ->assertJsonPath('data.subtotal.amount_piastres', 0)
            ->assertJsonPath('data.has_unavailable_items', true);
    }

    public function test_remove_and_clear(): void
    {
        $this->signIn();
        $a = $this->sellableVariant();
        $b = $this->sellableVariant();
        $this->putJson("/api/v1/customer/cart/items/{$a->id}", ['quantity' => 1]);
        $this->putJson("/api/v1/customer/cart/items/{$b->id}", ['quantity' => 1]);

        $this->deleteJson("/api/v1/customer/cart/items/{$a->id}")->assertJsonCount(1, 'data.items');
        $this->deleteJson('/api/v1/customer/cart')->assertJsonCount(0, 'data.items');
    }

    public function test_guest_cart_merges_on_sign_in_with_quantities_capped(): void
    {
        $this->signIn();
        $plenty = $this->sellableVariant(stock: 50);
        $scarce = $this->sellableVariant(stock: 3);
        $unavailable = ProductVariant::factory()->create();
        $this->putJson("/api/v1/customer/cart/items/{$plenty->id}", ['quantity' => 2]);

        $this->postJson('/api/v1/customer/cart/merge', ['items' => [
            ['variant_id' => $plenty->id, 'quantity' => 3],
            ['variant_id' => $scarce->id, 'quantity' => 5],
            ['variant_id' => $unavailable->id, 'quantity' => 1],
        ]])
            ->assertOk()
            ->assertJsonPath('meta.adjusted', [
                ['variant_id' => $scarce->id, 'requested' => 5, 'added' => 3],
                ['variant_id' => $unavailable->id, 'requested' => 1, 'added' => 0],
            ]);

        $this->assertSame(5, CartItem::where('product_variant_id', $plenty->id)->value('quantity'));
        $this->assertSame(3, CartItem::where('product_variant_id', $scarce->id)->value('quantity'));
        $this->assertFalse(CartItem::where('product_variant_id', $unavailable->id)->exists());
    }

    public function test_guests_can_price_their_browser_cart_without_signing_in(): void
    {
        $variant = $this->sellableVariant(stock: 2, price: 30000);

        $this->postJson('/api/v1/cart/preview', ['items' => [['variant_id' => $variant->id, 'quantity' => 3]]])
            ->assertOk()
            ->assertJsonPath('data.items.0.exceeds_available_quantity', true)
            ->assertJsonPath('data.items.0.max_quantity', 2)
            ->assertJsonPath('data.subtotal.amount_piastres', 0);

        $this->postJson('/api/v1/cart/preview', ['items' => [['variant_id' => $variant->id, 'quantity' => 2]]])
            ->assertJsonPath('data.subtotal.amount_piastres', 60000);

        $this->postJson('/api/v1/cart/preview', ['items' => [['variant_id' => 'x', 'quantity' => 0]]])
            ->assertUnprocessable();
    }

    public function test_cart_requires_a_signed_in_customer(): void
    {
        $this->fromFrontend()->getJson('/api/v1/customer/cart')->assertUnauthorized();
    }
}
