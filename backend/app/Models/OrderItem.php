<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Snapshot of a purchased line; never updated after checkout.
 *
 * @property int $id
 * @property int $order_id
 * @property int $product_id
 * @property int $product_variant_id
 * @property string $sku
 * @property string $product_name_en
 * @property string $product_name_ar
 * @property string $variant_name_en
 * @property string $variant_name_ar
 * @property string|null $image_path
 * @property int $unit_price_piastres
 * @property int|null $compare_at_price_piastres
 * @property int $quantity
 * @property int $discount_piastres
 * @property int $line_total_piastres
 */
class OrderItem extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'unit_price_piastres' => 'integer',
            'compare_at_price_piastres' => 'integer',
            'quantity' => 'integer',
            'discount_piastres' => 'integer',
            'line_total_piastres' => 'integer',
        ];
    }

    /** @return BelongsTo<ProductVariant, $this> */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id')->withTrashed();
    }
}
