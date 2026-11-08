<?php

namespace App\Models;

use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A promo code. Never deleted: switch it off instead, so orders keep their reference.
 *
 * Usage is counted from the orders that used the code; cancelled and expired orders do not count.
 *
 * @property int $id
 * @property string $code
 * @property string|null $description
 * @property DiscountType $discount_type
 * @property int $discount_value
 * @property int|null $min_order_piastres
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property int|null $usage_limit
 * @property int|null $per_customer_limit
 * @property bool $is_active
 * @property int|null $created_by_admin_id
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class PromoCode extends Model
{
    /** Orders in these states no longer use up the code. */
    public const RELEASED_STATUSES = [OrderStatus::Cancelled, OrderStatus::Expired];

    protected $fillable = [
        'code', 'description', 'discount_type', 'discount_value', 'min_order_piastres', 'starts_at',
        'ends_at', 'usage_limit', 'per_customer_limit', 'is_active', 'created_by_admin_id',
    ];

    protected $attributes = ['is_active' => false];

    protected function casts(): array
    {
        return [
            'discount_type' => DiscountType::class,
            'discount_value' => 'integer',
            'min_order_piastres' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'usage_limit' => 'integer',
            'per_customer_limit' => 'integer',
            'is_active' => 'boolean',
            'created_by_admin_id' => 'integer',
        ];
    }

    /** Codes are case-insensitive and stored in capitals. */
    public static function normalize(string $code): string
    {
        return mb_strtoupper(trim($code));
    }

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** Orders that count toward the limits (not cancelled or expired). @return HasMany<Order, $this> */
    public function countedOrders(): HasMany
    {
        return $this->orders()->whereNotIn('status', array_map(fn (OrderStatus $s) => $s->value, self::RELEASED_STATUSES));
    }

    /**
     * active: on and within its dates; scheduled: on, starts later; expired: end date passed;
     * inactive: switched off.
     */
    public function state(?Carbon $at = null): string
    {
        $at ??= now();

        return match (true) {
            $this->ends_at !== null && $this->ends_at->lte($at) => 'expired',
            ! $this->is_active => 'inactive',
            $this->starts_at !== null && $this->starts_at->gt($at) => 'scheduled',
            default => 'active',
        };
    }

    /** @param Builder<PromoCode> $query */
    public function scopeSearch(Builder $query, string $term): void
    {
        $query->where('code', 'like', '%'.addcslashes(self::normalize($term), '%_\\').'%');
    }
}
