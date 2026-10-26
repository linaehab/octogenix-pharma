<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Product;
use App\Services\CatalogService;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Seeds the three Jovie products (database/seeders/data/jovie-products.php) under the Jovie
 * brand. Safe to run repeatedly: existing products (matched by slug, including deleted ones)
 * and anything edited in the dashboard are left untouched. Runs after ContentSeeder.
 */
class JovieCatalogSeeder extends Seeder
{
    public function run(CatalogService $catalog): void
    {
        $brand = Brand::withTrashed()->where('slug', 'jovie')->first()
            ?? throw new RuntimeException('The Jovie brand must exist first (run ContentSeeder).');

        foreach (require database_path('seeders/data/jovie-products.php') as $position => $data) {
            if (Product::withTrashed()->where('slug', $data['slug'])->exists()) {
                continue;
            }

            $variant = $data['variant'];
            unset($data['variant']);

            $product = Product::create([
                ...$data,
                'brand_id' => $brand->id,
                'sort_order' => $position,
                'is_active' => false,
                'is_purchasable' => false,
            ]);

            $catalog->createVariant($product, $variant, admin: null);
        }
    }
}
