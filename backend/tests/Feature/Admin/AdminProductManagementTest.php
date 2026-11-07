<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\InventoryReason;
use App\Models\AdminUser;
use App\Models\Brand;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/**
 * Phase 2 product management: the product and its single size saved together, prices in integer
 * piastres, archive instead of delete, permissions, and the effect on the public store, cart and
 * checkout. All values are test data in the testing database.
 */
class AdminProductManagementTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private Brand $brand;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->brand = Brand::factory()->create(['slug' => 'jovie', 'has_store' => true, 'is_active' => true]);
    }

    private function as(AdminRole $role): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function payload(array $overrides = [], array $variant = []): array
    {
        return array_replace_recursive([
            'slug' => 'test-formula',
            'name_en' => 'Test Formula',
            'name_ar' => 'تركيبة تجريبية',
            'short_description_en' => 'Short text',
            'short_description_ar' => 'نص قصير',
            'stage' => 1,
            'variant' => [
                'sku' => 'test-400',
                'name_en' => '400 g',
                'name_ar' => '400 جم',
                'net_weight_grams' => 400,
                'price_piastres' => 52050,
                'compare_at_price_piastres' => 60000,
            ],
        ], $overrides, ['variant' => $variant]);
    }

    /** Creates a product through the admin API and makes it sellable (image, stock, active, purchasable). */
    private function sellableProduct(array $overrides = []): Product
    {
        $id = $this->postJson('/api/v1/admin/products', $this->payload($overrides, ['initial_stock' => 20]))->assertCreated()->json('data.id');
        $this->postJson("/api/v1/admin/products/{$id}/images", ['path' => '/assets/images/jovie.jpg'])->assertCreated();
        $this->patchJson("/api/v1/admin/products/{$id}", ['is_active' => true, 'is_purchasable' => true])->assertOk();

        return Product::findOrFail($id);
    }

    public function test_creates_the_product_and_its_single_size_together(): void
    {
        $admin = $this->as(AdminRole::StoreManager);

        $response = $this->postJson('/api/v1/admin/products', $this->payload([], ['initial_stock' => 12]))
            ->assertCreated()
            ->assertJsonPath('data.brand_id', $this->brand->id)
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.name_ar', 'تركيبة تجريبية')
            ->assertJsonPath('data.variants.0.sku', 'TEST-400')
            ->assertJsonPath('data.variants.0.is_default', true)
            ->assertJsonPath('data.variants.0.price_piastres', 52050)
            ->assertJsonPath('data.variants.0.compare_at_price_piastres', 60000)
            ->assertJsonPath('data.variants.0.stock_quantity', 12)
            ->assertJsonPath('data.order_items_count', 0);

        $this->assertIsInt($response->json('data.variants.0.price_piastres'));
        $product = Product::sole();
        $this->assertSame(1, $product->variants()->count());
        // Opening stock goes through the inventory service and its movement history.
        $movement = InventoryMovement::sole();
        $this->assertSame([12, 12, InventoryReason::InitialStock, $admin->id],
            [$movement->quantity_change, $movement->stock_after, $movement->reason, $movement->admin_user_id]);
    }

    public function test_a_failure_while_saving_the_size_leaves_no_product_behind(): void
    {
        $this->as(AdminRole::SuperAdmin);
        $this->mock(InventoryService::class)->shouldReceive('adjust')->andThrow(new RuntimeException('Stock service down'));
        $this->withoutExceptionHandling();

        try {
            $this->postJson('/api/v1/admin/products', $this->payload([], ['initial_stock' => 5]));
            $this->fail('The request should have failed.');
        } catch (RuntimeException) {
        }

        $this->assertSame(0, Product::withTrashed()->count());
        $this->assertSame(0, ProductVariant::withTrashed()->count());
    }

    public function test_a_second_size_is_refused(): void
    {
        $this->as(AdminRole::StoreManager);
        $id = $this->postJson('/api/v1/admin/products', $this->payload())->assertCreated()->json('data.id');

        $this->postJson("/api/v1/admin/products/{$id}/variants", ['sku' => 'OTHER-1', 'name_en' => '800 g', 'name_ar' => '800 جم'])
            ->assertUnprocessable()->assertJsonValidationErrors('variant');
        $this->assertSame(1, ProductVariant::count());
    }

    public function test_bilingual_and_text_validation(): void
    {
        $this->as(AdminRole::StoreManager);

        $this->postJson('/api/v1/admin/products', $this->payload(['name_ar' => '', 'name_en' => '<script>x</script>'], ['name_ar' => '']))
            ->assertUnprocessable()->assertJsonValidationErrors(['name_ar', 'name_en', 'variant.name_ar']);
        $this->postJson('/api/v1/admin/products', $this->payload(['description_en' => str_repeat('a', 5001)]))
            ->assertUnprocessable()->assertJsonValidationErrors('description_en');
        $this->assertSame(0, Product::count());
    }

    public function test_price_validation_uses_integer_piastres(): void
    {
        $this->as(AdminRole::StoreManager);
        $cases = [
            'negative' => [['price_piastres' => -100], 'variant.price_piastres'],
            'zero' => [['price_piastres' => 0], 'variant.price_piastres'],
            'decimal' => [['price_piastres' => 520.5], 'variant.price_piastres'],
            'text' => [['price_piastres' => '520 EGP'], 'variant.price_piastres'],
            'compare-at equal' => [['price_piastres' => 50000, 'compare_at_price_piastres' => 50000], 'variant.compare_at_price_piastres'],
            'compare-at lower' => [['price_piastres' => 50000, 'compare_at_price_piastres' => 40000], 'variant.compare_at_price_piastres'],
            'compare-at without price' => [['price_piastres' => null, 'compare_at_price_piastres' => 40000], 'variant.compare_at_price_piastres'],
        ];
        foreach ($cases as $name => [$variant, $error]) {
            $this->postJson('/api/v1/admin/products', $this->payload([], $variant))
                ->assertUnprocessable()->assertJsonValidationErrors($error);
        }
        $this->assertSame(0, Product::count(), 'Nothing is created when validation fails.');
    }

    public function test_editing_updates_the_product_and_its_size_and_never_stock(): void
    {
        $this->as(AdminRole::StoreManager);
        $product = $this->sellableProduct();
        $variant = $product->variants()->sole();
        $other = Product::factory()->sellable()->create()->variants()->sole();

        $this->patchJson("/api/v1/admin/products/{$product->id}", [
            'name_en' => 'Renamed', 'variant' => ['price_piastres' => 55000, 'compare_at_price_piastres' => null],
        ])->assertOk()->assertJsonPath('data.name_en', 'Renamed')->assertJsonPath('data.variants.0.price_piastres', 55000);

        // The compare-at price is checked against the stored price when only it is sent.
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['variant' => ['compare_at_price_piastres' => 54000]])
            ->assertUnprocessable()->assertJsonValidationErrors('variant.compare_at_price_piastres');
        // A product on sale cannot lose its price.
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['variant' => ['price_piastres' => null]])
            ->assertUnprocessable()->assertJsonValidationErrors('is_purchasable');
        // Stock is never set from the product form.
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['stock_quantity' => 999, 'variant' => ['stock_quantity' => 999]])
            ->assertUnprocessable()->assertJsonValidationErrors(['stock_quantity', 'variant.stock_quantity']);
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['variant' => ['initial_stock' => 999]])
            ->assertUnprocessable()->assertJsonValidationErrors('variant.initial_stock');
        // Unknown keys (such as another variant's id) are refused, so only this product's size is edited.
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['variant' => ['id' => $other->id, 'price_piastres' => 1]])
            ->assertUnprocessable()->assertJsonValidationErrors('variant');

        $this->assertSame([20, 55000], [$variant->refresh()->stock_quantity, $variant->price_piastres]);
        $this->assertSame(45000, $other->refresh()->price_piastres);
        $this->assertSame(1, InventoryMovement::count());
    }

    public function test_list_search_filters_and_pagination(): void
    {
        $this->as(AdminRole::StoreManager);
        $a = $this->sellableProduct();
        $this->patchJson("/api/v1/admin/products/{$a->id}", ['is_featured' => true])->assertOk();
        $this->postJson('/api/v1/admin/products', $this->payload(['slug' => 'hidden-one', 'name_en' => 'Hidden One'], ['sku' => 'HID-1']))->assertCreated();
        $archived = $this->postJson('/api/v1/admin/products', $this->payload(['slug' => 'old-one', 'name_en' => 'Old One'], ['sku' => 'OLD-1']))->json('data.id');
        $this->deleteJson("/api/v1/admin/products/{$archived}")->assertNoContent();

        $names = fn (string $query) => collect($this->getJson('/api/v1/admin/products?'.$query)->assertOk()->json('data'))->pluck('name_en')->all();

        $this->assertSame(['Hidden One'], $names('search=hid-1'));
        $this->assertSame(['Hidden One'], $names('search=Hidden'));
        $this->assertSame(['Test Formula'], $names('status=active'));
        $this->assertSame(['Hidden One'], $names('status=inactive'));
        $this->assertSame(['Old One'], $names('status=archived'));
        $this->assertSame(['Test Formula'], $names('is_featured=1'));
        $this->assertSame(['Hidden One'], $names('is_featured=0'));

        $page = $this->getJson('/api/v1/admin/products?per_page=1&page=2')->assertOk();
        $page->assertJsonPath('meta.current_page', 2)->assertJsonPath('meta.total', 2)->assertJsonCount(1, 'data');
    }

    public function test_images_upload_attach_primary_order_and_removal(): void
    {
        Storage::fake('public');
        $this->as(AdminRole::StoreManager);
        $id = $this->postJson('/api/v1/admin/products', $this->payload())->json('data.id');

        $paths = [];
        foreach (['a.png', 'b.png'] as $name) {
            $paths[] = $this->post('/api/v1/admin/uploads/images', ['image' => $this->fakePng($name)], ['Accept' => 'application/json'])
                ->assertCreated()->json('data.path');
        }
        $first = $this->postJson("/api/v1/admin/products/{$id}/images", ['path' => $paths[0]])->assertJsonPath('data.is_primary', true)->json('data.id');
        $second = $this->postJson("/api/v1/admin/products/{$id}/images", ['path' => $paths[1]])->assertJsonPath('data.is_primary', false)->json('data.id');

        $this->patchJson("/api/v1/admin/product-images/{$second}", ['is_primary' => true])->assertOk();
        $this->putJson("/api/v1/admin/products/{$id}/images/order", ['ids' => [$second, $first]])->assertNoContent();

        // Another product's image cannot be slipped into this product's order.
        $foreign = Product::factory()->create()->images()->create(['path' => '/assets/images/mom.jpg', 'is_primary' => true])->id;
        $this->putJson("/api/v1/admin/products/{$id}/images/order", ['ids' => [$second, $first, $foreign]])->assertUnprocessable();

        // Removing an image removes the link only; the uploaded file stays (it may be referenced elsewhere).
        $this->deleteJson("/api/v1/admin/product-images/{$second}")->assertNoContent();
        Storage::disk('public')->assertExists($paths[1]);
        $this->assertTrue(Product::find($id)->images()->sole()->is_primary, 'The remaining image becomes the main image.');
    }

    public function test_archive_keeps_order_history_and_can_be_restored(): void
    {
        $this->as(AdminRole::StoreManager);
        $this->openStore();
        $product = $this->sellableProduct();
        $variant = $product->variants()->sole();
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated();
        $order = Order::sole();

        $this->getJson("/api/v1/admin/products/{$product->id}")->assertJsonPath('data.order_items_count', 1);
        $this->deleteJson("/api/v1/admin/products/{$product->id}")->assertNoContent();

        $this->assertSoftDeleted('products', ['id' => $product->id]);
        $archived = Product::withTrashed()->find($product->id);
        $this->assertFalse($archived->is_active || $archived->is_purchasable || $archived->is_featured);
        // Order history is untouched.
        $this->assertSame([$product->id, $variant->sku, 52050], [OrderItem::sole()->product_id, OrderItem::sole()->sku, OrderItem::sole()->unit_price_piastres]);
        $this->assertNotNull($order->fresh());
        // Gone from the store and the cart.
        $this->getJson("/api/v1/products/{$product->slug}")->assertNotFound();
        $this->postJson('/api/v1/cart/preview', ['items' => [['variant_id' => $variant->id, 'quantity' => 1]]])
            ->assertJsonPath('data.has_unavailable_items', true);
        $this->getJson("/api/v1/admin/products/{$product->id}")->assertNotFound();

        $this->postJson("/api/v1/admin/products/{$product->id}/restore")->assertOk()
            ->assertJsonPath('data.archived_at', null)->assertJsonPath('data.is_active', false);
        $this->postJson("/api/v1/admin/products/{$product->id}/restore")->assertStatus(422);
    }

    public function test_storefront_follows_the_dashboard(): void
    {
        $this->as(AdminRole::StoreManager);
        $this->openStore();
        $product = $this->sellableProduct();
        $variant = $product->variants()->sole();
        $slugs = fn (string $query = '') => collect($this->getJson('/api/v1/products?brand=jovie'.$query)->json('data'))->pluck('slug')->all();

        // 1. Active and purchasable: listed, open, buyable.
        $this->assertSame(['test-formula'], $slugs());
        $this->getJson('/api/v1/products/test-formula')->assertOk()->assertJsonPath('data.is_available', true);

        // 2-4. English and Arabic names, short description.
        $this->patchJson("/api/v1/admin/products/{$product->id}", [
            'name_en' => 'Jovie Test EN', 'name_ar' => 'جوفي تجربة', 'short_description_en' => 'New short text',
        ])->assertOk();
        $this->getJson('/api/v1/products/test-formula')
            ->assertJsonPath('data.name', ['en' => 'Jovie Test EN', 'ar' => 'جوفي تجربة'])
            ->assertJsonPath('data.short_description.en', 'New short text');

        // 5. Primary image.
        $newImage = $this->postJson("/api/v1/admin/products/{$product->id}/images", ['path' => '/assets/images/mom.jpg', 'is_primary' => true])->json('data.id');
        $this->getJson('/api/v1/products?brand=jovie')->assertJsonPath('data.0.image.id', $newImage)->assertJsonPath('data.0.image.url', '/assets/images/mom.jpg');

        // 6. Price: product page, cart and checkout use the server price.
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['variant' => ['price_piastres' => 61000, 'compare_at_price_piastres' => null]])->assertOk();
        $this->getJson('/api/v1/products/test-formula')->assertJsonPath('data.variants.0.price.amount_piastres', 61000);
        $this->postJson('/api/v1/cart/preview', ['items' => [['variant_id' => $variant->id, 'quantity' => 2]]])
            ->assertJsonPath('data.subtotal.amount_piastres', 122000);

        // 9. Featured: the API's featured filter (the storefront has no featured section yet).
        $this->assertSame([], $slugs('&featured=1'));
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['is_featured' => true])->assertOk();
        $this->assertSame(['test-formula'], $slugs('&featured=1'));

        // 8. Not purchasable: still shown, but cart and checkout refuse it.
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['is_purchasable' => false])->assertOk();
        $this->getJson('/api/v1/products/test-formula')->assertOk()->assertJsonPath('data.is_available', false);
        $this->postJson('/api/v1/cart/preview', ['items' => [['variant_id' => $variant->id, 'quantity' => 1]]])
            ->assertJsonPath('data.has_unavailable_items', true);
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertUnprocessable();

        // 7. Inactive: hidden from the listing and the product page, and not buyable.
        $this->patchJson("/api/v1/admin/products/{$product->id}", ['is_purchasable' => true, 'is_active' => false])->assertOk();
        $this->assertSame([], $slugs());
        $this->getJson('/api/v1/products/test-formula')->assertNotFound();
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertUnprocessable();
        $this->assertSame(0, Order::count());
        $this->assertSame(20, $variant->refresh()->stock_quantity);
    }

    public function test_activation_still_needs_an_image_and_selling_needs_a_price(): void
    {
        $this->as(AdminRole::StoreManager);
        $id = $this->postJson('/api/v1/admin/products', $this->payload([], ['price_piastres' => null, 'compare_at_price_piastres' => null]))->json('data.id');

        $this->patchJson("/api/v1/admin/products/{$id}", ['is_active' => true])->assertUnprocessable()->assertJsonValidationErrors('is_active');
        $this->patchJson("/api/v1/admin/products/{$id}", ['is_purchasable' => true])->assertUnprocessable()->assertJsonValidationErrors('is_purchasable');
        // A price sent in the same request counts.
        $this->patchJson("/api/v1/admin/products/{$id}", ['is_purchasable' => true, 'variant' => ['price_piastres' => 40000]])->assertOk();
    }

    public function test_permissions_are_enforced_by_the_api(): void
    {
        $product = Product::factory()->sellable()->create();
        $image = $product->images()->sole();
        $calls = [
            ['getJson', '/api/v1/admin/products', []],
            ['getJson', "/api/v1/admin/products/{$product->id}", []],
            ['postJson', '/api/v1/admin/products', $this->payload()],
            ['patchJson', "/api/v1/admin/products/{$product->id}", ['name_en' => 'X']],
            ['deleteJson', "/api/v1/admin/products/{$product->id}", []],
            ['postJson', "/api/v1/admin/products/{$product->id}/restore", []],
            ['postJson', "/api/v1/admin/products/{$product->id}/images", ['path' => '/assets/images/mom.jpg']],
            ['patchJson', "/api/v1/admin/product-images/{$image->id}", ['is_primary' => true]],
            ['deleteJson', "/api/v1/admin/product-images/{$image->id}", []],
            ['putJson', "/api/v1/admin/products/{$product->id}/images/order", ['ids' => [$image->id]]],
        ];

        foreach ($calls as [$method, $url, $body]) {
            $this->fromFrontend()->{$method}($url, $body)->assertUnauthorized();
        }
        foreach ([AdminRole::Support, AdminRole::ContentEditor] as $role) {
            $this->as($role);
            foreach ($calls as [$method, $url, $body]) {
                $this->{$method}($url, $body)->assertForbidden();
            }
        }
        $this->as(AdminRole::Support);
        $this->post('/api/v1/admin/uploads/images', ['image' => $this->fakePng()], ['Accept' => 'application/json'])->assertForbidden();

        $this->assertSame(1, Product::count());
        $this->assertSame($product->name_en, $product->fresh()->name_en);
        $this->assertSame(1, $product->images()->count());
    }
}
