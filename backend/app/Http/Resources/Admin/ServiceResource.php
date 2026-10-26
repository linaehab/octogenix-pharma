<?php

namespace App\Http\Resources\Admin;

use App\Models\Service;
use App\Support\ImagePath;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Dashboard representation: raw editable columns plus image URLs for previews. @mixin Service */
class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...$this->resource->only([
                'id', 'title_en', 'title_ar', 'description_en', 'description_ar',
                'image_path', 'hover_image_path', 'image_alt_en', 'image_alt_ar', 'sort_order', 'is_active',
            ]),
            'category' => $this->category->value,
            'image_url' => ImagePath::url($this->image_path),
            'hover_image_url' => ImagePath::url($this->hover_image_path),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
