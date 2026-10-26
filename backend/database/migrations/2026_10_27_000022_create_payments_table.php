<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.G — one row per payment attempt. Created in phase 6 because cash-on-delivery
 * orders get a payment row (provider "cod") when placed; card attempts and webhooks follow in
 * phase 7. Card numbers, expiry dates and CVVs are never stored.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->string('merchant_reference', 64)->unique();
            $table->string('provider', 30);
            $table->string('method', 20);
            $table->string('status', 20)->default('initiated');
            $table->unsignedInteger('amount_piastres');
            $table->char('currency', 3)->default('EGP');
            $table->string('provider_order_id', 100)->nullable();
            $table->string('provider_transaction_id', 100)->nullable();
            $table->string('provider_reference', 100)->nullable();
            $table->string('card_brand', 20)->nullable();
            $table->char('card_last4', 4)->nullable();
            $table->string('failure_code', 100)->nullable();
            $table->string('failure_message', 500)->nullable();
            $table->boolean('is_test')->default(false);
            $table->json('gateway_response')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('verified_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->foreignId('collected_by_admin_id')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->datetimes();

            $table->unique(['provider', 'provider_transaction_id']);
            $table->index(['order_id', 'status']);
            $table->index(['provider', 'provider_order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
