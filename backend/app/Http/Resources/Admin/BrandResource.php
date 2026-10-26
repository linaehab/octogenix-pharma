<?php

namespace App\Http\Resources\Admin;

use App\Models\Brand;
use App\Support\ImagePath;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Dashboard representation: raw editable columns plus image URLs for previews. @mixin Brand */
class BrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...$this->resource->only([
                'id', 'slug', 'name_en', 'name_ar', 'label_en', 'label_ar',
                'short_description_en', 'short_description_ar', 'description_en', 'description_ar',
                'logo_path', 'image_path', 'hover_image_path', 'image_alt_en', 'image_alt_ar',
                'cta_label_en', 'cta_label_ar', 'link_url', 'has_store', 'is_featured', 'is_active', 'sort_order',
            ]),
            'link_type' => $this->link_type->value,
            'logo_url' => ImagePath::url($this->logo_path),
            'image_url' => ImagePath::url($this->image_path),
            'hover_image_url' => ImagePath::url($this->hover_image_path),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
