<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design v0.3 §5.B — contact form submissions. The message is stored first; the
 * notification email is tracked separately so a mail failure never loses a message.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('site', 20)->default('corporate');
            $table->string('first_name', 80);
            $table->string('last_name', 80)->nullable();
            $table->string('email', 255)->index();
            $table->string('phone', 20)->nullable();
            $table->string('subject', 30)->nullable();
            $table->text('message');
            $table->char('locale', 2);
            $table->string('status', 20)->default('new');
            $table->foreignId('assigned_admin_id')->nullable()
                ->constrained('admin_users')->nullOnDelete();
            $table->text('admin_notes')->nullable();
            $table->dateTime('read_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->string('email_notification_status', 20)->default('pending')->index();
            $table->unsignedTinyInteger('email_notification_attempts')->default(0);
            $table->dateTime('email_notified_at')->nullable();
            $table->string('email_last_error', 500)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->datetimes();
            $table->softDeletesDatetime()->index();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
