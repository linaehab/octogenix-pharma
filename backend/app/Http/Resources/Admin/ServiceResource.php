<?php

namespace App\Http\Resources\Admin;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Dashboard representation: the editable columns. @mixin Service */
class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...$this->resource->only([
                'id', 'title_en', 'title_ar', 'description_en', 'description_ar',
                'sort_order', 'is_active',
            ]),
            'category' => $this->category->value,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
