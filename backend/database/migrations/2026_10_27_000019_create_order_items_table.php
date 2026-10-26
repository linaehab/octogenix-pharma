<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.F — permanent copies of what was bought: names, SKU, unit price and quantity
 * at the time of purchase. RESTRICT keeps sold products and variants from ever being hard-deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->string('sku', 64);
            $table->string('product_name_en', 200);
            $table->string('product_name_ar', 200);
            $table->string('variant_name_en', 100);
            $table->string('variant_name_ar', 100);
            $table->string('image_path', 255)->nullable();
            $table->unsignedInteger('unit_price_piastres');
            $table->unsignedInteger('compare_at_price_piastres')->nullable();
            $table->unsignedSmallInteger('quantity');
            $table->unsignedInteger('discount_piastres')->default(0);
            $table->unsignedInteger('line_total_piastres');
            $table->datetimes();

            $table->unique(['order_id', 'product_variant_id']);
        });

        DB::statement('ALTER TABLE order_items
            ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
            ADD CONSTRAINT order_items_line_total_check
                CHECK (line_total_piastres = unit_price_piastres * quantity - discount_piastres)');
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
