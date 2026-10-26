<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.D — saved delivery addresses (Egypt). Orders copy the address, so editing or
 * deleting a saved address never changes an existing order.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->id();
            // RESTRICT: addresses are removed by the account-deletion service, and the generated
            // default key below may not use a CASCADE / SET NULL base column.
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->string('label', 50)->nullable();
            $table->string('recipient_name', 160);
            $table->string('phone', 20);
            $table->foreignId('governorate_id')->constrained('governorates')->restrictOnDelete();
            $table->string('city', 100);
            $table->string('area', 100)->nullable();
            $table->string('street', 255);
            $table->string('building', 50)->nullable();
            $table->string('floor', 20)->nullable();
            $table->string('apartment', 20)->nullable();
            $table->string('landmark', 255)->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->boolean('is_default')->default(false);
            $table->datetimes();
            $table->softDeletesDatetime()->index();
            // At most one live default address per customer.
            $table->unsignedBigInteger('default_customer_key')->nullable()
                ->storedAs('IF(is_default = 1 AND deleted_at IS NULL, customer_id, NULL)')->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
    }
};
