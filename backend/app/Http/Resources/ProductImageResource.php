<?php

namespace App\Http\Resources;

use App\Models\ProductImage;
use App\Support\ImagePath;
use App\Support\Localized;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Same shape for the public site and the dashboard (the path is only useful to admins). @mixin ProductImage */
class ProductImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => ImagePath::url($this->path),
            'alt' => Localized::pair($this->resource, 'alt'),
            'is_primary' => $this->is_primary,
            'sort_order' => $this->sort_order,
            'path' => $this->when($request->is('api/*/admin/*'), $this->path),
        ];
    }
}
