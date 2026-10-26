<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\ProductVariant;
use Database\Seeders\ContentSeeder;
use Database\Seeders\JovieCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JovieCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_the_three_jovie_products_with_only_confirmed_data(): void
    {
        $this->seed([ContentSeeder::class, JovieCatalogSeeder::class]);

        $products = Product::with(['brand', 'variants'])->ordered()->get();

        $this->assertSame(
            ['jovie-organic-infant-milk-stage-1', 'jovie-organic-follow-on-milk-stage-2', 'jovie-organic-follow-on-formula-toddlers-stage-3'],
            $products->pluck('slug')->all()
        );
        $this->assertSame([1, 2, 3], $products->pluck('stage')->all());
        $this->assertSame([[0, 6], [6, 12], [12, 36]], $products->map(fn ($p) => [$p->age_from_months, $p->age_to_months])->all());
        $this->assertSame('تركيبة حليب جوفي العضوي للرضع', $products[0]->name_ar);
        $this->assertStringContainsString('الدنمارك', $products[2]->short_description_ar);

        foreach ($products as $product) {
            $this->assertSame('jovie', $product->brand->slug);
            $this->assertFalse($product->is_active, 'No images yet, so the product must not be active.');
            $this->assertFalse($product->is_purchasable, 'No price yet, so the product must not be sellable.');
            $this->assertNull($product->ingredients_en);
            $this->assertNull($product->nutrition_facts);

            $variant = $product->variants->sole();
            $this->assertSame(400, $variant->net_weight_grams);
            $this->assertSame(['400 g', '400 جم'], [$variant->name_en, $variant->name_ar]);
            $this->assertTrue($variant->is_default);
            $this->assertNull($variant->price_piastres);
            $this->assertNull($variant->barcode);
            $this->assertSame(0, $variant->stock_quantity);
            $this->assertStringEndsWith('-TBC', $variant->sku);
        }
    }

    public function test_reseeding_keeps_dashboard_edits_and_adds_nothing_twice(): void
    {
        $this->seed([ContentSeeder::class, JovieCatalogSeeder::class]);
        Product::where('slug', 'jovie-organic-infant-milk-stage-1')->update(['name_en' => 'Edited']);
        ProductVariant::where('sku', 'JOVIE-S2-400G-TBC')->update(['sku' => 'REAL-SKU-2']);
        Product::where('slug', 'jovie-organic-follow-on-formula-toddlers-stage-3')->first()->delete();

        $this->seed(JovieCatalogSeeder::class);

        $this->assertSame(3, Product::withTrashed()->count());
        $this->assertSame(2, Product::count());
        $this->assertSame(3, ProductVariant::count());
        $this->assertSame('Edited', Product::where('slug', 'jovie-organic-infant-milk-stage-1')->value('name_en'));
        $this->assertTrue(ProductVariant::where('sku', 'REAL-SKU-2')->exists());
    }

    public function test_jovie_brand_with_products_cannot_be_deleted_from_the_dashboard(): void
    {
        $this->seed([ContentSeeder::class, JovieCatalogSeeder::class]);
        $this->actingAs(\App\Models\AdminUser::factory()->create(), 'admin')->fromFrontend();
        $jovie = \App\Models\Brand::where('slug', 'jovie')->sole();

        $this->deleteJson("/api/v1/admin/brands/{$jovie->id}")
            ->assertUnprocessable()->assertJsonValidationErrors('brand');
        $this->assertNotSoftDeleted($jovie);
    }
}
