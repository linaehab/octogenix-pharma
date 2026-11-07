<?php

namespace App\Models;

use Database\Factories\ProductVariantFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * stock_quantity is deliberately not fillable: it changes only through InventoryService.
 *
 * @property int $id
 * @property int $product_id
 * @property string $sku
 * @property string|null $barcode
 * @property string $name_en
 * @property string $name_ar
 * @property int|null $net_weight_grams
 * @property int|null $price_piastres
 * @property int|null $compare_at_price_piastres
 * @property int $stock_quantity
 * @property int|null $low_stock_threshold
 * @property int|null $max_per_order
 * @property bool $is_default
 * @property bool $is_active
 * @property int $sort_order
 * @property-read Product $product
 */
class ProductVariant extends Model
{
    /** @use HasFactory<ProductVariantFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_id',
        'sku',
        'barcode',
        'name_en',
        'name_ar',
        'net_weight_grams',
        'price_piastres',
        'compare_at_price_piastres',
        'low_stock_threshold',
        'max_per_order',
        'is_default',
        'is_active',
        'sort_order',
    ];

    protected $attributes = [
        'stock_quantity' => 0,
        'is_default' => false,
        'is_active' => true,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'net_weight_grams' => 'integer',
            'price_piastres' => 'integer',
            'compare_at_price_piastres' => 'integer',
            'stock_quantity' => 'integer',
            'low_stock_threshold' => 'integer',
            'max_per_order' => 'integer',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return HasMany<InventoryMovement, $this> */
    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    /**
     * Can be added to a cart right now (design v0.3 §5.C). Requires the product and brand
     * relations; quantities are checked again, with row locks, when an order is placed.
     */
    public function isAvailable(): bool
    {
        return $this->is_active
            && $this->deleted_at === null
            && $this->price_piastres !== null
            && $this->stock_quantity > 0
            && $this->product->isSellable();
    }

    /**
     * Stock status (Phase 3 rules):
     * - out_of_stock: nothing left;
     * - low_stock: some left, at or below the admin's threshold;
     * - in_stock: above the threshold, or no threshold set.
     */
    public const STOCK_OUT = 'out_of_stock';

    public const STOCK_LOW = 'low_stock';

    public const STOCK_IN = 'in_stock';

    public function stockStatus(): string
    {
        return match (true) {
            $this->stock_quantity <= 0 => self::STOCK_OUT,
            $this->isLowOnStock() => self::STOCK_LOW,
            default => self::STOCK_IN,
        };
    }

    /** Some stock left, at or below the threshold. An empty variant is out of stock, not low. */
    public function isLowOnStock(): bool
    {
        return $this->low_stock_threshold !== null
            && $this->stock_quantity > 0
            && $this->stock_quantity <= $this->low_stock_threshold;
    }

    /**
     * Active variants with some stock left, at or below their threshold (the same rule as
     * isLowOnStock()). Used by the low-stock list, the dashboard and the inventory page.
     */
    public function scopeLowOnStock(Builder $query): void
    {
        $query->where('is_active', true)->stockStatus(self::STOCK_LOW);
    }

    /** Variants in one stock status (see stockStatus()), in SQL. */
    public function scopeStockStatus(Builder $query, string $status): void
    {
        match ($status) {
            self::STOCK_OUT => $query->where('stock_quantity', '<=', 0),
            self::STOCK_LOW => $query->where('stock_quantity', '>', 0)
                ->whereNotNull('low_stock_threshold')
                ->whereColumn('stock_quantity', '<=', 'low_stock_threshold'),
            self::STOCK_IN => $query->where('stock_quantity', '>', 0)
                ->where(fn (Builder $q) => $q->whereNull('low_stock_threshold')
                    ->orWhereColumn('stock_quantity', '>', 'low_stock_threshold')),
        };
    }
}
