<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.G — every incoming gateway notification is stored before it is processed.
 * The unique (provider, event_key) makes duplicate deliveries harmless.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 30);
            $table->string('event_key', 191);
            $table->string('event_type', 100)->nullable();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->boolean('signature_valid');
            $table->json('payload');
            $table->string('processing_status', 20)->default('received');
            $table->string('processing_error', 1000)->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->dateTime('received_at');
            $table->dateTime('processed_at')->nullable();

            $table->unique(['provider', 'event_key']);
            $table->index(['processing_status', 'received_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_webhook_events');
    }
};
