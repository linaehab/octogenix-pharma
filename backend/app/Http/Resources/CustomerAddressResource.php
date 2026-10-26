<?php

namespace App\Http\Resources;

use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CustomerAddress */
class CustomerAddressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...$this->resource->only([
                'id', 'label', 'recipient_name', 'phone', 'governorate_id', 'city', 'area', 'street',
                'building', 'floor', 'apartment', 'landmark', 'postal_code', 'is_default',
            ]),
            'governorate' => new GovernorateResource($this->governorate),
        ];
    }
}
