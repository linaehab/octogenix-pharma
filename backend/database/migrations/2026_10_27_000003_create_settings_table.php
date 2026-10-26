<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.B — site configuration (not displayed text). Keys come from config/settings.php
 * and are seeded; admins edit values only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('group', 50)->index();
            $table->string('type', 20);
            $table->json('value')->nullable();
            $table->boolean('is_public')->default(false);
            $table->foreignId('updated_by_admin_id')->nullable()
                ->constrained('admin_users')->nullOnDelete();
            $table->datetimes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
