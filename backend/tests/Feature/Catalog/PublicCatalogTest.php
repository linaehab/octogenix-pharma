<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_only_active_products_of_active_brands_in_order(): void
    {
        $jovie = Brand::factory()->create(['slug' => 'jovie', 'has_store' => true]);
        $second = Product::factory()->sellable()->for($jovie)->create(['slug' => 'second', 'sort_order' => 2]);
        $first = Product::factory()->sellable()->for($jovie)->create(['slug' => 'first', 'sort_order' => 1]);
        Product::factory()->for($jovie)->create(['slug' => 'draft']);
        Product::factory()->sellable()->for(Brand::factory()->inactive())->create(['slug' => 'hidden-brand']);
        Product::factory()->sellable()->create(['slug' => 'other-brand']);

        $this->getJson('/api/v1/products?brand=jovie')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.slug', 'first')
            ->assertJsonPath('data.1.slug', 'second');

        $this->getJson('/api/v1/products')->assertJsonCount(3, 'data');
    }

    public function test_listing_shape_prices_and_availability_without_stock_counts(): void
    {
        Product::factory()->sellable(stock: 7, pricePiastres: 45000)->create(['slug' => 'in-stock']);

        $item = $this->getJson('/api/v1/products')->assertOk()->json('data.0');

        $this->assertSame(['amount_piastres' => 45000, 'currency' => 'EGP'], $item['price_from']);
        $this->assertTrue($item['is_available']);
        $this->assertSame('/assets/images/jovie.jpg', $item['image']['url']);
        $this->assertArrayNotHasKey('stock_quantity', $item['variants'][0]);
        $this->assertArrayNotHasKey('path', $item['image']);
        $this->assertArrayNotHasKey('ingredients', $item, 'Full content is only on the detail endpoint.');
    }

    public function test_availability_rules(): void
    {
        $cases = [
            'out of stock' => [fn (Product $p) => $p->variants()->first()->forceFill(['stock_quantity' => 0])->save()],
            'no price' => [fn (Product $p) => $p->variants()->first()->update(['price_piastres' => null])],
            'not purchasable' => [fn (Product $p) => $p->update(['is_purchasable' => false])],
            'brand without store' => [fn (Product $p) => $p->brand->update(['has_store' => false])],
        ];

        foreach ($cases as $name => [$break]) {
            $product = Product::factory()->sellable()->create(['slug' => str_replace(' ', '-', $name)]);
            $break($product);

            $this->getJson("/api/v1/products/{$product->slug}")
                ->assertOk()
                ->assertJsonPath('data.is_available', false)
                ->assertJsonPath('data.variants.0.is_available', false);
        }
    }

    public function test_detail_has_full_bilingual_content_and_hides_inactive_variants(): void
    {
        $product = Product::factory()->sellable()->create([
            'slug' => 'detail',
            'ingredients_en' => 'Whole goat milk', 'ingredients_ar' => 'حليب ماعز كامل',
            'nutrition_facts' => [['label_en' => 'Energy', 'label_ar' => 'الطاقة', 'unit' => 'kcal', 'per_100g' => '500', 'per_100ml' => '66']],
        ]);
        ProductVariant::factory()->for($product)->create(['sku' => 'HIDDEN', 'is_active' => false]);

        $this->getJson('/api/v1/products/detail')
            ->assertOk()
            ->assertJsonPath('data.ingredients', ['en' => 'Whole goat milk', 'ar' => 'حليب ماعز كامل'])
            ->assertJsonPath('data.nutrition_facts.0.label_ar', 'الطاقة')
            ->assertJsonCount(1, 'data.variants')
            ->assertJsonCount(1, 'data.images');
    }

    public function test_inactive_or_deleted_products_are_not_found(): void
    {
        Product::factory()->create(['slug' => 'draft']);
        $deleted = Product::factory()->sellable()->create(['slug' => 'deleted']);
        $deleted->delete();

        $this->getJson('/api/v1/products/draft')->assertNotFound();
        $this->getJson('/api/v1/products/deleted')->assertNotFound();
        $this->getJson('/api/v1/products/nothing')->assertNotFound();
    }
}
