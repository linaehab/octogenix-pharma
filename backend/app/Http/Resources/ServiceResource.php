<?php

namespace App\Http\Resources;

use App\Models\Service;
use App\Support\Localized;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Public representation for the corporate services section. @mixin Service */
class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => Localized::pair($this->resource, 'title'),
            'description' => Localized::pair($this->resource, 'description'),
        ];
    }
}
