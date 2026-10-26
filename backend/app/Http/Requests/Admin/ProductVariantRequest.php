<?php

namespace App\Http\Requests\Admin;

use App\Models\ProductVariant;
use App\Rules\PlainText;
use App\Support\Localized;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Create (POST) and partial update (PATCH) of a size/pack. stock_quantity is not accepted:
 * stock changes only through stock adjustments (or initial_stock when creating).
 */
class ProductVariantRequest extends FormRequest
{
    private function variant(): ?ProductVariant
    {
        return $this->route('variant');
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('sku'))) {
            $this->merge(['sku' => Str::upper(trim($this->input('sku')))]);
        }
        if (is_string($this->input('barcode'))) {
            $this->merge(['barcode' => trim($this->input('barcode')) ?: null]);
        }
    }

    public function rules(): array
    {
        $creating = $this->variant() === null;
        $required = $creating ? 'required' : 'sometimes';

        return [
            // Unique across soft-deleted variants too: order history keeps referring to old SKUs.
            'sku' => [$required, 'string', 'min:2', 'max:64', 'regex:/^[A-Z0-9][A-Z0-9._-]*$/',
                Rule::unique('product_variants', 'sku')->ignore($this->variant())],
            'barcode' => ['sometimes', 'nullable', 'string', 'regex:/^\d{8,14}$/',
                Rule::unique('product_variants', 'barcode')->ignore($this->variant())],
            ...Localized::rules('name', [$required, 'string', 'max:100', new PlainText]),
            'net_weight_grams' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100000'],
            'price_piastres' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:4294967295'],
            'compare_at_price_piastres' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:4294967295'],
            'low_stock_threshold' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000'],
            'max_per_order' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:999'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'initial_stock' => $creating ? ['sometimes', 'integer', 'min:0', 'max:1000000'] : ['prohibited'],
            'stock_quantity' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'stock_quantity.prohibited' => 'Stock is changed with a stock adjustment, not by editing the size/pack.',
            'initial_stock.prohibited' => 'Initial stock can only be set when the size/pack is created.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $state = array_merge($this->variant()?->only(['price_piastres', 'compare_at_price_piastres']) ?? [], $validator->validated());
            $compareAt = $state['compare_at_price_piastres'] ?? null;

            if ($compareAt !== null && ($state['price_piastres'] ?? null) === null) {
                $validator->errors()->add('compare_at_price_piastres', 'Set the price before the original (compare-at) price.');
            } elseif ($compareAt !== null && $compareAt <= $state['price_piastres']) {
                $validator->errors()->add('compare_at_price_piastres', 'The original price must be higher than the price.');
            }
        }];
    }
}
