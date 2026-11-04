<?php

namespace Database\Seeders;

use App\Enums\InventoryReason;
use App\Models\Governorate;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\InventoryService;
use App\Services\SettingsService;
use App\Support\ImagePath;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * TEST MODE data for trying the Jovie store end to end on a DEVELOPMENT database:
 *
 *     php artisan db:seed --class=StoreTestDataSeeder
 *
 * Not part of DatabaseSeeder. Refuses to run in production or without STORE_TEST_MODE=true.
 * Every value below is a TEMPORARY TEST VALUE agreed for development, not business data; the
 * admin replaces them from the dashboard (variant price, stock, governorate fees, store settings).
 * Values an admin already entered are never overwritten.
 */
class StoreTestDataSeeder extends Seeder
{
    /** Temporary test price of each 400 g Jovie tin: 500 EGP. */
    public const TEST_PRICE_PIASTRES = 50000;

    public const TEST_STOCK = 100;

    /** Temporary test shipping fee for every governorate: 50 EGP. */
    public const TEST_SHIPPING_FEE_PIASTRES = 5000;

    public const TEST_COD_FEE_PIASTRES = 0;

    public function run(InventoryService $inventory, SettingsService $settings): void
    {
        if (app()->isProduction() || ! config('payments.test_mode')) {
            throw new RuntimeException('StoreTestDataSeeder runs only with STORE_TEST_MODE=true outside production.');
        }

        $products = Product::query()->with(['variants', 'images'])
            ->whereHas('brand', fn ($q) => $q->where('slug', 'jovie'))->get();

        foreach ($products as $product) {
            $product->forceFill(['is_active' => true, 'is_purchasable' => true])->save();

            foreach ($product->variants as $variant) {
                $variant->forceFill([
                    'is_active' => true,
                    'price_piastres' => $variant->price_piastres ?? self::TEST_PRICE_PIASTRES,
                ])->save();

                if ($variant->stock_quantity < self::TEST_STOCK) {
                    $inventory->adjust(
                        $variant,
                        self::TEST_STOCK - $variant->stock_quantity,
                        $variant->stock_quantity === 0 ? InventoryReason::InitialStock : InventoryReason::Restock,
                        note: 'TEST MODE stock for development (StoreTestDataSeeder), not real inventory.',
                    );
                }
            }

            if ($product->images->isEmpty() && $product->stage !== null) {
                $this->addTinImage($product);
            }
        }

        Governorate::query()->each(function (Governorate $governorate) {
            $governorate->forceFill([
                'is_deliverable' => true,
                'shipping_fee_piastres' => $governorate->shipping_fee_piastres ?? self::TEST_SHIPPING_FEE_PIASTRES,
            ])->save();
        });

        $settings->update([
            'store.enabled' => true,
            'store.cod_fee_piastres' => $settings->get('store.cod_fee_piastres') ?? self::TEST_COD_FEE_PIASTRES,
            'store.cod_enabled' => true,
            'store.card_provider' => 'mock',
            'store.card_payments_enabled' => true,
        ]);

        $this->command?->info('TEST MODE store data ready: test prices, test stock, test shipping fees, mock card payments.');
    }

    /** The Egyptian tin packshot bundled with the Angular app, stored as an uploaded product image. */
    private function addTinImage(Product $product): void
    {
        $source = base_path("../front end/jovie/src/assets/images/jovie/products/eg-stage-{$product->stage}-front.webp");
        if (! File::exists($source)) {
            return;
        }

        $path = ImagePath::UPLOAD_DIRECTORY.'/'.now()->format('Y/m').'/'.Str::uuid().'.webp';
        Storage::disk(ImagePath::DISK)->put($path, File::get($source));

        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => $path,
            'alt_en' => "{$product->name_en} tin",
            'alt_ar' => "علبة {$product->name_ar}",
            'is_primary' => true,
            'sort_order' => 0,
        ]);
    }
}
