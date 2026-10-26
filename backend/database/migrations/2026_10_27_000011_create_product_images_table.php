<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Design v0.3 §5.C — product gallery. Image files are removed by the service, never by cascade. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('path', 255);
            $table->string('alt_en', 255)->nullable();
            $table->string('alt_ar', 255)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->datetimes();
            // At most one primary image per product.
            $table->unsignedBigInteger('primary_product_key')->nullable()
                ->storedAs('IF(is_primary = 1, product_id, NULL)')->unique();

            $table->index(['product_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
