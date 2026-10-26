<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property string $path
 * @property string|null $alt_en
 * @property string|null $alt_ar
 * @property bool $is_primary
 * @property int $sort_order
 */
class ProductImage extends Model
{
    protected $fillable = ['product_id', 'path', 'alt_en', 'alt_ar', 'is_primary', 'sort_order'];

    protected $attributes = [
        'is_primary' => false,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
