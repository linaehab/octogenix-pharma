<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.C — append-only stock ledger. No batch or expiry tracking (confirmed decision C7).
 *
 * order_id is created here without its foreign key: the orders table does not exist until
 * phase 6, whose migration add_order_foreign_key_to_inventory_movements_table adds it (§8, #21).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->integer('quantity_change');
            $table->integer('stock_after');
            $table->string('reason', 30);
            $table->unsignedBigInteger('order_id')->nullable()->index();
            $table->foreignId('admin_user_id')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->string('note', 500)->nullable();
            $table->dateTime('created_at');

            $table->index(['product_variant_id', 'created_at']);
        });

        DB::statement('ALTER TABLE inventory_movements
            ADD CONSTRAINT inventory_movements_change_non_zero_check CHECK (quantity_change <> 0),
            ADD CONSTRAINT inventory_movements_stock_after_check CHECK (stock_after >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
