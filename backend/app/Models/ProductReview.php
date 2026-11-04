<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A customer review of a product, public once approved (ReviewService, admin moderation).
 *
 * @property int $id
 * @property int $product_id
 * @property int|null $order_id
 * @property string $author_name
 * @property string|null $author_email
 * @property int $rating
 * @property string $title
 * @property string $body
 * @property bool|null $recommends
 * @property bool $is_verified_purchase
 * @property ReviewStatus $status
 * @property int $helpful_count
 * @property int $not_helpful_count
 * @property string $locale
 * @property int|null $moderated_by_admin_id
 * @property \Illuminate\Support\Carbon|null $moderated_at
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property \Illuminate\Support\Carbon $created_at
 * @property-read Product $product
 * @property-read Order|null $order
 * @property-read AdminUser|null $moderatedBy
 */
class ProductReview extends Model
{
    use SoftDeletes;

    protected $fillable = ['author_name', 'rating', 'title', 'body', 'recommends'];

    protected $attributes = [
        'status' => 'pending',
        'is_verified_purchase' => false,
        'helpful_count' => 0,
        'not_helpful_count' => 0,
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'recommends' => 'boolean',
            'is_verified_purchase' => 'boolean',
            'status' => ReviewStatus::class,
            'helpful_count' => 'integer',
            'not_helpful_count' => 'integer',
            'moderated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<AdminUser, $this> */
    public function moderatedBy(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'moderated_by_admin_id');
    }

    /** @return HasMany<ProductReviewVote, $this> */
    public function votes(): HasMany
    {
        return $this->hasMany(ProductReviewVote::class);
    }

    /** @param Builder<ProductReview> $query */
    public function scopeApproved(Builder $query): void
    {
        $query->where('status', ReviewStatus::Approved);
    }
}
