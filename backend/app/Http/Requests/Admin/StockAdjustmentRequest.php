<?php

namespace App\Http\Requests\Admin;

use App\Enums\InventoryReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * - restock:                quantity > 0 received (note optional)
 * - write_off:              quantity > 0 removed, e.g. damaged (note required)
 * - manual_adjustment:      quantity ≠ 0, signed (note required)
 * - stock_count_correction: counted_quantity ≥ 0 from a physical count (note required)
 */
class StockAdjustmentRequest extends FormRequest
{
    public function rules(): array
    {
        $reason = InventoryReason::tryFrom((string) $this->input('reason'));

        return [
            'reason' => ['required', Rule::in(array_map(fn (InventoryReason $r) => $r->value, InventoryReason::manual()))],
            'quantity' => match ($reason) {
                InventoryReason::Restock, InventoryReason::WriteOff => ['required', 'integer', 'min:1', 'max:1000000'],
                InventoryReason::ManualAdjustment => ['required', 'integer', 'between:-1000000,1000000', 'not_in:0'],
                default => ['prohibited'],
            },
            'counted_quantity' => $reason === InventoryReason::StockCountCorrection
                ? ['required', 'integer', 'min:0', 'max:1000000']
                : ['prohibited'],
            'note' => [$reason === InventoryReason::Restock ? 'nullable' : 'required', 'string', 'max:500'],
        ];
    }
}
