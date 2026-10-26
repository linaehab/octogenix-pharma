<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.C — the sellable size/pack with its own SKU, price and stock.
 * stock_quantity changes only through App\Services\InventoryService (with a movement row).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            // RESTRICT: the generated default key below may not use a CASCADE / SET NULL base column.
            $table->id();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('sku', 64)->unique();
            $table->string('barcode', 32)->nullable()->unique();
            $table->string('name_en', 100);
            $table->string('name_ar', 100);
            $table->unsignedInteger('net_weight_grams')->nullable();
            // NULL until the client confirms prices; a variant without a price cannot be bought.
            $table->unsignedInteger('price_piastres')->nullable();
            $table->unsignedInteger('compare_at_price_piastres')->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->nullable();
            $table->unsignedSmallInteger('max_per_order')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->datetimes();
            $table->softDeletesDatetime()->index();
            // At most one live default variant per product.
            $table->unsignedBigInteger('default_product_key')->nullable()
                ->storedAs('IF(is_default = 1 AND deleted_at IS NULL, product_id, NULL)')->unique();

            $table->index(['product_id', 'is_active', 'sort_order']);
        });

        DB::statement('ALTER TABLE product_variants
            ADD CONSTRAINT product_variants_price_positive_check CHECK (price_piastres IS NULL OR price_piastres > 0),
            ADD CONSTRAINT product_variants_compare_at_check CHECK (compare_at_price_piastres IS NULL
                OR (price_piastres IS NOT NULL AND compare_at_price_piastres > price_piastres)),
            ADD CONSTRAINT product_variants_stock_non_negative_check CHECK (stock_quantity >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
