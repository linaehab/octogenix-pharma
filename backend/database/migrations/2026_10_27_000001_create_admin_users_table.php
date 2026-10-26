<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Design v0.3 §5.A — dashboard staff. Never hard-deleted; deactivate instead. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('email', 255)->unique();
            $table->string('password', 255);
            $table->string('role', 30);
            $table->boolean('is_active')->default(true);
            $table->char('locale', 2)->default('en');
            $table->dateTime('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->rememberToken();
            $table->datetimes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_users');
    }
};
