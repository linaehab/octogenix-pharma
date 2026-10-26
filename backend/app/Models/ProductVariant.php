<?php

namespace App\Models;

use Database\Factories\ProductVariantFactory;
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

    public function isLowOnStock(): bool
    {
        return $this->low_stock_threshold !== null && $this->stock_quantity <= $this->low_stock_threshold;
    }
}
