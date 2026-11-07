<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 8 — two new tables; no existing table changes.
 *
 * admin_audit_logs: append-only history of admin actions (who, what, which record, when, filtered
 * before/after values). The admin's name and the record's label are copied, so an entry stays
 * readable if the admin account or the record later changes or disappears. No updated_at: entries
 * are never edited.
 *
 * admin_notifications: in-dashboard notifications, one row per recipient admin. The unique
 * (admin_user_id, dedupe_key) pair makes a retried event a no-op instead of a duplicate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_user_id')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->string('admin_name', 120);
            $table->string('category', 30);
            $table->string('action', 60);
            $table->string('subject_type', 40);
            $table->string('subject_id', 40)->nullable();
            $table->string('subject_label', 255)->nullable();
            $table->json('changes')->nullable();
            $table->dateTime('created_at');

            $table->index('created_at');
            $table->index(['admin_user_id', 'created_at']);
            $table->index(['category', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });

        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_user_id')->constrained('admin_users')->cascadeOnDelete();
            $table->string('category', 30);
            $table->string('type', 60);
            $table->json('data');
            $table->string('link', 255)->nullable();
            $table->string('dedupe_key', 120);
            $table->dateTime('read_at')->nullable();
            $table->dateTime('created_at');

            $table->unique(['admin_user_id', 'dedupe_key']);
            $table->index(['admin_user_id', 'read_at', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
        Schema::dropIfExists('admin_audit_logs');
    }
};
