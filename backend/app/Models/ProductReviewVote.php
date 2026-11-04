<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One "Was this helpful?" answer per review and browser (unique product_review_id + voter_hash).
 *
 * @property int $id
 * @property int $product_review_id
 * @property string $voter_hash
 * @property string $ip_hash
 * @property bool $is_helpful
 */
class ProductReviewVote extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['is_helpful' => 'boolean', 'created_at' => 'datetime'];
    }

    /** @return BelongsTo<ProductReview, $this> */
    public function review(): BelongsTo
    {
        return $this->belongsTo(ProductReview::class, 'product_review_id');
    }
}
