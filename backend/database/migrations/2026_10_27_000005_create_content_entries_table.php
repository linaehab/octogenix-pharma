<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.B — editable texts and images shown by fixed Angular components.
 * One row per registry key (resources/content/{site}.php); keys match Angular translation keys.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_entries', function (Blueprint $table) {
            $table->id();
            $table->string('site', 20);
            $table->string('key', 150);
            $table->string('group', 80);
            $table->string('type', 20);
            $table->text('value_en')->nullable();
            $table->text('value_ar')->nullable();
            $table->string('image_path', 255)->nullable();
            $table->string('image_ar_path', 255)->nullable();
            $table->foreignId('updated_by_admin_id')->nullable()
                ->constrained('admin_users')->nullOnDelete();
            $table->datetimes();

            $table->unique(['site', 'key']);
            $table->index(['site', 'group']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_entries');
    }
};
