<?php

namespace App\Http\Resources;

use App\Models\Brand;
use App\Support\ImagePath;
use App\Support\Localized;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Public representation for the corporate "Our Brands" page. @mixin Brand */
class BrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'name' => Localized::pair($this->resource, 'name'),
            'label' => Localized::pair($this->resource, 'label'),
            'short_description' => Localized::pair($this->resource, 'short_description'),
            'description' => Localized::pair($this->resource, 'description'),
            'logo_url' => ImagePath::url($this->logo_path),
            'image_url' => ImagePath::url($this->image_path),
            'hover_image_url' => ImagePath::url($this->hover_image_path),
            'image_alt' => Localized::pair($this->resource, 'image_alt'),
            'cta_label' => Localized::pair($this->resource, 'cta_label'),
            'link' => ['type' => $this->link_type->value, 'url' => $this->link_url],
            'has_store' => $this->has_store,
            'is_featured' => $this->is_featured,
        ];
    }
}
