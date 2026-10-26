<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.D — store customer accounts (separate table and guard from admins).
 * phone is required at registration but nullable here so that account deletion can erase it
 * (anonymisation keeps the row for order history).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('email', 255)->unique();
            $table->string('phone', 20)->nullable();
            $table->string('password', 255);
            $table->dateTime('email_verified_at')->nullable();
            $table->char('locale', 2)->default('en');
            $table->boolean('is_active')->default(true);
            $table->dateTime('last_login_at')->nullable();
            $table->rememberToken();
            $table->dateTime('anonymized_at')->nullable();
            $table->datetimes();
            $table->softDeletesDatetime()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
