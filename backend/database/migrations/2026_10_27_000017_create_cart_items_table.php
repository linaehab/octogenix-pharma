<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.D — the cart of a signed-in customer. No prices are stored (always read live)
 * and no stock is reserved. Guests keep their cart in the browser.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->unsignedSmallInteger('quantity');
            $table->datetimes();

            $table->unique(['customer_id', 'product_variant_id']);
        });

        DB::statement('ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_positive_check CHECK (quantity > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
