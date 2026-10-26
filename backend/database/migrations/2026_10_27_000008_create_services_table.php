<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Design v0.3 §5.B — corporate services shown in the Customers / Suppliers tabs. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('category', 20);
            $table->string('title_en', 150);
            $table->string('title_ar', 150);
            $table->text('description_en');
            $table->text('description_ar');
            $table->string('image_path', 255)->nullable();
            $table->string('hover_image_path', 255)->nullable();
            $table->string('image_alt_en', 255)->nullable();
            $table->string('image_alt_ar', 255)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(false);
            $table->datetimes();
            $table->softDeletesDatetime()->index();

            $table->index(['category', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
