<?php

namespace App\Http\Resources;

use App\Models\Governorate;
use App\Support\Localized;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Public: for address forms and the shipping estimate at checkout. @mixin Governorate */
class GovernorateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => Localized::pair($this->resource, 'name'),
            'is_deliverable' => $this->is_deliverable,
            'shipping_fee' => $this->is_deliverable ? Money::of($this->shipping_fee_piastres) : null,
            'delivery_days' => $this->is_deliverable && $this->delivery_days_min !== null
                ? ['min' => $this->delivery_days_min, 'max' => $this->delivery_days_max]
                : null,
            'cod_available' => $this->is_deliverable && $this->cod_available,
        ];
    }
}
