<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.D — Egypt's 27 governorates with the per-governorate shipping fee (decision C4).
 * Fees are entered by admins; a governorate cannot be deliverable without one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('governorates', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('name_en', 100);
            $table->string('name_ar', 100);
            $table->unsignedInteger('shipping_fee_piastres')->nullable();
            $table->unsignedTinyInteger('delivery_days_min')->nullable();
            $table->unsignedTinyInteger('delivery_days_max')->nullable();
            $table->boolean('cod_available')->default(true);
            $table->boolean('is_deliverable')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->datetimes();
        });

        DB::statement('ALTER TABLE governorates
            ADD CONSTRAINT governorates_deliverable_needs_fee_check
                CHECK (is_deliverable = 0 OR shipping_fee_piastres IS NOT NULL),
            ADD CONSTRAINT governorates_delivery_days_check
                CHECK (delivery_days_min IS NULL OR delivery_days_max IS NULL OR delivery_days_min <= delivery_days_max)');
    }

    public function down(): void
    {
        Schema::dropIfExists('governorates');
    }
};
