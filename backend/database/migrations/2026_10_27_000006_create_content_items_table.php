<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.B — repeating items inside fixed components (hero slides, values, leaders).
 * Which lists exist, their fields and min/max counts come from the content registry.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_items', function (Blueprint $table) {
            $table->id();
            $table->string('site', 20);
            $table->string('list_key', 80);
            $table->string('title_en', 255)->nullable();
            $table->string('title_ar', 255)->nullable();
            $table->string('subtitle_en', 255)->nullable();
            $table->string('subtitle_ar', 255)->nullable();
            $table->text('description_en')->nullable();
            $table->text('description_ar')->nullable();
            $table->string('image_path', 255)->nullable();
            $table->string('secondary_image_path', 255)->nullable();
            $table->string('image_alt_en', 255)->nullable();
            $table->string('image_alt_ar', 255)->nullable();
            $table->string('icon', 20)->nullable();
            $table->string('link_url', 500)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignId('updated_by_admin_id')->nullable()
                ->constrained('admin_users')->nullOnDelete();
            $table->datetimes();

            $table->index(['site', 'list_key', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_items');
    }
};
