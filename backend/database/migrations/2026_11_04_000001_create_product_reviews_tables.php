<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Customer reviews of Jovie products (approved by the client on 2026-11-04; not in design v0.3).
 *
 * - product_reviews: one review, published only after an admin approves it (status). A review is
 *   a "verified purchase" only when the reviewer gave the number and email of a real order that
 *   contains the product; one review per order and product.
 * - product_review_votes: "Was this helpful?" votes, one per review and browser (voter_hash is
 *   the SHA-256 of a random token kept in the browser; ip_hash only helps spot abuse).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('author_name', 80);
            $table->string('author_email', 255)->nullable();
            $table->unsignedTinyInteger('rating');
            $table->string('title', 120);
            $table->text('body');
            $table->boolean('recommends')->nullable();
            $table->boolean('is_verified_purchase')->default(false);
            $table->string('status', 20)->default('pending');
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('not_helpful_count')->default(0);
            $table->char('locale', 2);
            $table->foreignId('moderated_by_admin_id')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->dateTime('moderated_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->datetimes();
            $table->softDeletesDatetime();

            $table->unique(['order_id', 'product_id']);
            $table->index(['product_id', 'status', 'created_at']);
            $table->index(['product_id', 'status', 'rating']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('product_review_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_review_id')->constrained('product_reviews')->cascadeOnDelete();
            $table->char('voter_hash', 64);
            $table->char('ip_hash', 64);
            $table->boolean('is_helpful');
            $table->dateTime('created_at');

            $table->unique(['product_review_id', 'voter_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_review_votes');
        Schema::dropIfExists('product_reviews');
    }
};
