<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** The database itself rejects invalid catalog data, whatever the application code does (design v0.3 §9). */
class CatalogConstraintsTest extends TestCase
{
    use RefreshDatabase;

    private function assertRejected(callable $write): void
    {
        try {
            DB::transaction(fn () => $write());
            $this->fail('The database accepted an invalid row.');
        } catch (QueryException) {
            $this->addToAssertionCount(1);
        }
    }

    public function test_variant_price_stock_and_compare_at_checks(): void
    {
        $variant = ProductVariant::factory()->create(['price_piastres' => 1000]);
        $table = fn () => DB::table('product_variants')->where('id', $variant->id);

        $this->assertRejected(fn () => $table()->update(['price_piastres' => 0]));
        $this->assertRejected(fn () => $table()->update(['stock_quantity' => -1]));
        $this->assertRejected(fn () => $table()->update(['compare_at_price_piastres' => 1000]));
        $this->assertRejected(fn () => $table()->update(['price_piastres' => null, 'compare_at_price_piastres' => 2000]));

        $table()->update(['compare_at_price_piastres' => 1500, 'stock_quantity' => 5]);
        $this->assertSame(5, $variant->refresh()->stock_quantity);
    }

    public function test_product_age_range_check(): void
    {
        $product = Product::factory()->create();

        $this->assertRejected(fn () => DB::table('products')->where('id', $product->id)
            ->update(['age_from_months' => 12, 'age_to_months' => 6]));
    }

    public function test_one_live_default_variant_per_product(): void
    {
        $product = Product::factory()->create();
        $first = ProductVariant::factory()->for($product)->create(['is_default' => true]);

        $this->assertRejected(fn () => ProductVariant::factory()->for($product)->create(['is_default' => true]));

        // A soft-deleted default no longer counts.
        $first->delete();
        ProductVariant::factory()->for($product)->create(['is_default' => true]);
        $this->assertSame(1, $product->variants()->where('is_default', true)->count());
    }

    public function test_one_primary_image_per_product(): void
    {
        $product = Product::factory()->create();
        $product->images()->create(['path' => '/assets/images/jovie.jpg', 'is_primary' => true]);

        $this->assertRejected(fn () => $product->images()->create(['path' => '/assets/images/mom.jpg', 'is_primary' => true]));
    }

    public function test_inventory_movement_checks(): void
    {
        $variant = ProductVariant::factory()->create();
        $row = ['product_variant_id' => $variant->id, 'reason' => 'restock', 'created_at' => now()];

        $this->assertRejected(fn () => DB::table('inventory_movements')->insert([...$row, 'quantity_change' => 0, 'stock_after' => 0]));
        $this->assertRejected(fn () => DB::table('inventory_movements')->insert([...$row, 'quantity_change' => -1, 'stock_after' => -1]));
    }

    public function test_brands_with_products_and_sold_variants_cannot_be_hard_deleted(): void
    {
        $variant = ProductVariant::factory()->create();
        DB::table('inventory_movements')->insert([
            'product_variant_id' => $variant->id, 'quantity_change' => 5, 'stock_after' => 5,
            'reason' => 'restock', 'created_at' => now(),
        ]);

        $this->assertRejected(fn () => Brand::query()->whereKey($variant->product->brand_id)->forceDelete());
        $this->assertRejected(fn () => ProductVariant::query()->whereKey($variant->id)->forceDelete());
    }
}
