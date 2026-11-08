<?php

namespace App\Http\Resources\Admin;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductVariant */
class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...$this->resource->only([
                'id', 'product_id', 'sku', 'barcode', 'name_en', 'name_ar', 'net_weight_grams',
                'price_piastres', 'compare_at_price_piastres', 'stock_quantity', 'low_stock_threshold',
                'max_per_order', 'is_default', 'is_active', 'sort_order',
            ]),
            'discount' => $this->discount_type === null ? null : [
                'type' => $this->discount_type->value,
                'value' => $this->discount_value,
                'is_active' => $this->discount_is_active,
                'starts_at' => $this->discount_starts_at?->toIso8601String(),
                'ends_at' => $this->discount_ends_at?->toIso8601String(),
                'state' => $this->discountState(),
            ],
            'effective_price_piastres' => $this->effectivePricePiastres(),
            'is_low_on_stock' => $this->isLowOnStock(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
