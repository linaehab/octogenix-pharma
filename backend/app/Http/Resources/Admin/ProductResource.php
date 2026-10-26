<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\ProductImageResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Dashboard representation: every editable column, plus variants and images when loaded. @mixin Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $columns = ['id', 'brand_id', 'slug', 'nutrition_facts', 'stage', 'age_from_months', 'age_to_months',
            'registration_number', 'is_active', 'is_purchasable', 'is_featured', 'sort_order'];
        foreach (Product::TEXT_FIELDS as $field) {
            $columns[] = "{$field}_en";
            $columns[] = "{$field}_ar";
        }

        return [
            ...$this->resource->only($columns),
            'brand' => $this->whenLoaded('brand', fn () => [
                'id' => $this->brand->id, 'slug' => $this->brand->slug, 'name_en' => $this->brand->name_en,
                'has_store' => $this->brand->has_store,
            ]),
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
