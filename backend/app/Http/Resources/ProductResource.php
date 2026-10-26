<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Support\ImagePath;
use App\Support\Localized;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public product for the Jovie store. Listing shows a summary; the detail page adds the full
 * content (set ->detailed()). Exact stock counts are never exposed, only availability.
 *
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    private bool $detailed = false;

    public function detailed(): static
    {
        $this->detailed = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $variants = $this->variants->where('is_active', true)->values();
        $prices = $variants->pluck('price_piastres')->filter();

        $data = [
            'slug' => $this->slug,
            'brand' => ['slug' => $this->brand->slug, 'name' => Localized::pair($this->brand, 'name')],
            'name' => Localized::pair($this->resource, 'name'),
            'subtitle' => Localized::pair($this->resource, 'subtitle'),
            'short_description' => Localized::pair($this->resource, 'short_description'),
            'stage' => $this->stage,
            'age_from_months' => $this->age_from_months,
            'age_to_months' => $this->age_to_months,
            'is_featured' => $this->is_featured,
            'image' => $this->images->first() ? new ProductImageResource($this->images->first()) : null,
            'price_from' => Money::of($prices->min()),
            'is_available' => $variants->contains(fn (ProductVariant $v) => $v->isAvailable()),
            'variants' => $variants->map(fn (ProductVariant $variant) => [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'name' => Localized::pair($variant, 'name'),
                'net_weight_grams' => $variant->net_weight_grams,
                'price' => Money::of($variant->price_piastres),
                'compare_at_price' => Money::of($variant->compare_at_price_piastres),
                'is_default' => $variant->is_default,
                'is_available' => $variant->isAvailable(),
                'max_per_order' => $variant->max_per_order,
            ])->all(),
        ];

        if (! $this->detailed) {
            return $data;
        }

        foreach (['description', 'ingredients', 'preparation_instructions', 'storage_instructions',
            'important_notice', 'meta_title', 'meta_description'] as $field) {
            $data[$field] = Localized::pair($this->resource, $field);
        }

        return [
            ...$data,
            'nutrition_facts' => $this->nutrition_facts ?? [],
            'registration_number' => $this->registration_number,
            'images' => ProductImageResource::collection($this->images)->toArray($request),
            'og_image_url' => ImagePath::url($this->images->first()?->path),
        ];
    }
}
