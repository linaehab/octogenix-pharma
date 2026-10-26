<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.F — order header. Never deleted (no soft deletes). Contact details, address,
 * shipping fee and totals are snapshots taken at checkout, so later edits never change an order.
 * customer_id is NULL for guest orders (decision C6).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 20)->unique();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->restrictOnDelete();
            $table->string('status', 30);
            $table->string('payment_status', 30)->default('unpaid');
            $table->string('payment_method', 20);
            $table->char('currency', 3)->default('EGP');
            $table->unsignedInteger('subtotal_piastres');
            $table->unsignedInteger('discount_piastres')->default(0);
            $table->unsignedInteger('shipping_fee_piastres');
            $table->unsignedInteger('cod_fee_piastres')->default(0);
            $table->unsignedInteger('total_piastres');
            $table->string('customer_first_name', 80);
            $table->string('customer_last_name', 80);
            $table->string('customer_email', 255)->index();
            $table->string('customer_phone', 20)->index();
            $table->foreignId('customer_address_id')->nullable()->constrained('customer_addresses')->nullOnDelete();
            $table->string('shipping_recipient_name', 160);
            $table->string('shipping_phone', 20);
            $table->foreignId('shipping_governorate_id')->constrained('governorates')->restrictOnDelete();
            $table->string('shipping_governorate_name_en', 100);
            $table->string('shipping_governorate_name_ar', 100);
            $table->string('shipping_city', 100);
            $table->string('shipping_area', 100)->nullable();
            $table->string('shipping_street', 255);
            $table->string('shipping_building', 50)->nullable();
            $table->string('shipping_floor', 20)->nullable();
            $table->string('shipping_apartment', 20)->nullable();
            $table->string('shipping_landmark', 255)->nullable();
            $table->string('shipping_postal_code', 10)->nullable();
            $table->string('customer_note', 1000)->nullable();
            $table->text('admin_note')->nullable();
            $table->char('locale', 2);
            $table->char('idempotency_key', 36)->unique();
            $table->char('guest_access_token_hash', 64)->nullable()->unique();
            $table->dateTime('payment_expires_at')->nullable();
            $table->dateTime('placed_at');
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->dateTime('shipped_at')->nullable();
            $table->dateTime('delivered_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->dateTime('returned_at')->nullable();
            $table->string('cancelled_by', 20)->nullable();
            $table->string('cancellation_reason', 500)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->datetimes();

            $table->index(['customer_id', 'placed_at']);
            $table->index(['status', 'placed_at']);
            $table->index('payment_status');
            $table->index(['status', 'payment_expires_at']);
        });

        DB::statement('ALTER TABLE orders
            ADD CONSTRAINT orders_discount_check CHECK (discount_piastres <= subtotal_piastres),
            ADD CONSTRAINT orders_total_check CHECK (total_piastres
                = subtotal_piastres - discount_piastres + shipping_fee_piastres + cod_fee_piastres),
            ADD CONSTRAINT orders_cod_fee_check CHECK (payment_method = \'cod\' OR cod_fee_piastres = 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
