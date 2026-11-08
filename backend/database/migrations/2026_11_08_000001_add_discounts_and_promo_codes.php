<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Discounts & promo codes.
 *
 * - product_variants: an optional direct discount (percent or fixed amount) with an on/off switch
 *   and optional start/end dates. price_piastres stays the regular price.
 * - promo_codes: codes the admin creates; they are never deleted (switch them off instead), so
 *   orders keep a valid reference.
 * - orders: the code used and a snapshot of its type and value. orders.discount_piastres (already
 *   present) is the promo discount; it is spread over the items in order_items.discount_piastres.
 *   Usage is counted from these orders (cancelled and expired ones do not count), so there is no
 *   separate usage table that could drift.
 * - order_items: product_discount_piastres records the direct product discount of the line
 *   (regular price - discounted price) x quantity. unit_price_piastres stays the price paid
 *   before the promo, as before.
 *
 * Existing rows get NULL / 0 / false: no current product, order or price changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('discount_type', 10)->nullable()->after('compare_at_price_piastres');
            $table->unsignedInteger('discount_value')->nullable()->after('discount_type');
            $table->boolean('discount_is_active')->default(false)->after('discount_value');
            $table->dateTime('discount_starts_at')->nullable()->after('discount_is_active');
            $table->dateTime('discount_ends_at')->nullable()->after('discount_starts_at');
        });

        DB::statement("ALTER TABLE product_variants
            ADD CONSTRAINT product_variants_discount_check CHECK (
                (discount_type IS NULL AND discount_value IS NULL AND discount_is_active = 0)
                OR (discount_type = 'percent' AND discount_value IS NOT NULL AND discount_value BETWEEN 1 AND 99)
                OR (discount_type = 'fixed' AND discount_value IS NOT NULL AND discount_value >= 1
                    AND price_piastres IS NOT NULL AND discount_value < price_piastres)),
            ADD CONSTRAINT product_variants_discount_dates_check CHECK (
                discount_starts_at IS NULL OR discount_ends_at IS NULL OR discount_ends_at > discount_starts_at),
            ADD CONSTRAINT product_variants_discount_or_compare_at_check CHECK (
                discount_type IS NULL OR compare_at_price_piastres IS NULL)");

        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('description', 255)->nullable();
            $table->string('discount_type', 10);
            $table->unsignedInteger('discount_value');
            $table->unsignedInteger('min_order_piastres')->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('per_customer_limit')->nullable();
            $table->boolean('is_active')->default(false);
            $table->foreignId('created_by_admin_id')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->datetimes();

            $table->index(['is_active', 'created_at']);
        });

        DB::statement("ALTER TABLE promo_codes
            ADD CONSTRAINT promo_codes_value_check CHECK (
                (discount_type = 'percent' AND discount_value BETWEEN 1 AND 99)
                OR (discount_type = 'fixed' AND discount_value >= 1)),
            ADD CONSTRAINT promo_codes_dates_check CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at),
            ADD CONSTRAINT promo_codes_limits_check CHECK ((usage_limit IS NULL OR usage_limit > 0)
                AND (per_customer_limit IS NULL OR per_customer_limit > 0))");

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('promo_code_id')->nullable()->after('total_piastres')->constrained('promo_codes')->restrictOnDelete();
            $table->string('promo_code', 32)->nullable()->after('promo_code_id');
            $table->string('promo_discount_type', 10)->nullable()->after('promo_code');
            $table->unsignedInteger('promo_discount_value')->nullable()->after('promo_discount_type');

            $table->index(['promo_code_id', 'status']);
        });

        DB::statement('ALTER TABLE orders
            ADD CONSTRAINT orders_promo_snapshot_check CHECK (
                (promo_code_id IS NULL AND promo_code IS NULL AND promo_discount_type IS NULL AND promo_discount_value IS NULL)
                OR (promo_code IS NOT NULL AND promo_discount_type IS NOT NULL AND promo_discount_value IS NOT NULL)),
            ADD CONSTRAINT orders_discount_needs_promo_check CHECK (discount_piastres = 0 OR promo_code IS NOT NULL)');

        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedInteger('product_discount_piastres')->default(0)->after('compare_at_price_piastres');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('product_discount_piastres');
        });

        DB::statement('ALTER TABLE orders DROP CHECK orders_promo_snapshot_check, DROP CHECK orders_discount_needs_promo_check');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['promo_code_id']);
            $table->dropIndex(['promo_code_id', 'status']);
            $table->dropColumn(['promo_code_id', 'promo_code', 'promo_discount_type', 'promo_discount_value']);
        });

        Schema::dropIfExists('promo_codes');

        DB::statement('ALTER TABLE product_variants DROP CHECK product_variants_discount_check,
            DROP CHECK product_variants_discount_dates_check, DROP CHECK product_variants_discount_or_compare_at_check');
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_value', 'discount_is_active', 'discount_starts_at', 'discount_ends_at']);
        });
    }
};
