<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.B — brands on the corporate "Our Brands" page. Products reference brands
 * with RESTRICT (phase 4), so brands are deactivated or soft-deleted, never hard-deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 150)->unique();
            $table->string('name_en', 150);
            $table->string('name_ar', 150);
            $table->string('label_en', 150)->nullable();
            $table->string('label_ar', 150)->nullable();
            $table->string('short_description_en', 500)->nullable();
            $table->string('short_description_ar', 500)->nullable();
            $table->text('description_en')->nullable();
            $table->text('description_ar')->nullable();
            $table->string('logo_path', 255)->nullable();
            $table->string('image_path', 255)->nullable();
            // v0.3 addition: the brands card swaps to a second image on hover, like services.
            $table->string('hover_image_path', 255)->nullable();
            $table->string('image_alt_en', 255)->nullable();
            $table->string('image_alt_ar', 255)->nullable();
            $table->string('cta_label_en', 80)->nullable();
            $table->string('cta_label_ar', 80)->nullable();
            $table->string('link_type', 20)->default('none');
            $table->string('link_url', 500)->nullable();
            $table->boolean('has_store')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->datetimes();
            $table->softDeletesDatetime()->index();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brands');
    }
};
