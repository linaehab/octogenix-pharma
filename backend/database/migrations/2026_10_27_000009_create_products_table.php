<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.C — product content (what is shown). Price and stock live on product_variants.
 * Never hard-deleted once sold (order_items → products RESTRICT, phase 6).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->constrained('brands')->restrictOnDelete();
            $table->string('slug', 160)->unique();
            $table->string('name_en', 200);
            $table->string('name_ar', 200);
            $table->string('subtitle_en', 255)->nullable();
            $table->string('subtitle_ar', 255)->nullable();
            $table->string('short_description_en', 500)->nullable();
            $table->string('short_description_ar', 500)->nullable();
            foreach (['description', 'ingredients', 'preparation_instructions', 'storage_instructions', 'important_notice'] as $field) {
                $table->text("{$field}_en")->nullable();
                $table->text("{$field}_ar")->nullable();
            }
            $table->json('nutrition_facts')->nullable();
            $table->unsignedTinyInteger('stage')->nullable();
            $table->unsignedTinyInteger('age_from_months')->nullable();
            $table->unsignedTinyInteger('age_to_months')->nullable();
            $table->string('registration_number', 100)->nullable();
            $table->boolean('is_active')->default(false);
            $table->boolean('is_purchasable')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('meta_title_en', 255)->nullable();
            $table->string('meta_title_ar', 255)->nullable();
            $table->string('meta_description_en', 500)->nullable();
            $table->string('meta_description_ar', 500)->nullable();
            $table->datetimes();
            $table->softDeletesDatetime()->index();

            $table->index(['brand_id', 'is_active', 'sort_order']);
            $table->index(['is_active', 'is_featured']);
        });

        DB::statement('ALTER TABLE products ADD CONSTRAINT products_age_range_check
            CHECK (age_from_months IS NULL OR age_to_months IS NULL OR age_to_months >= age_from_months)');
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
