<?php

namespace App\Http\Requests\Admin;

use App\Models\Product;
use App\Rules\PlainText;
use App\Support\Localized;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** Create (POST) and partial update (PATCH) of a product's content and visibility. */
class ProductRequest extends FormRequest
{
    private function product(): ?Product
    {
        return $this->route('product');
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('slug'))) {
            $this->merge(['slug' => Str::lower(trim($this->input('slug')))]);
        }
    }

    public function rules(): array
    {
        $required = $this->product() === null ? 'required' : 'sometimes';
        $text = fn (int $max) => ['sometimes', 'nullable', 'string', "max:{$max}", new PlainText];

        return [
            'brand_id' => [$required, 'integer', Rule::exists('brands', 'id')->whereNull('deleted_at')],
            'slug' => [$required, 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('products', 'slug')->ignore($this->product())],
            ...Localized::rules('name', [$required, 'string', 'max:200', new PlainText]),
            ...Localized::rules('subtitle', $text(255)),
            ...Localized::rules('short_description', $text(500)),
            ...Localized::rules('description', $text(5000)),
            ...Localized::rules('ingredients', $text(5000)),
            ...Localized::rules('preparation_instructions', $text(5000)),
            ...Localized::rules('storage_instructions', $text(2000)),
            ...Localized::rules('important_notice', $text(2000)),
            ...Localized::rules('meta_title', $text(255)),
            ...Localized::rules('meta_description', $text(500)),
            'nutrition_facts' => ['sometimes', 'nullable', 'array', 'max:60'],
            'nutrition_facts.*' => ['array:label_en,label_ar,unit,per_100g,per_100ml'],
            'nutrition_facts.*.label_en' => ['required', 'string', 'max:100', new PlainText],
            'nutrition_facts.*.label_ar' => ['required', 'string', 'max:100', new PlainText],
            'nutrition_facts.*.unit' => ['nullable', 'string', 'max:20', new PlainText],
            // Kept as text exactly as printed on the label (e.g. "2.5", "<0.1").
            'nutrition_facts.*.per_100g' => ['nullable', 'string', 'max:20'],
            'nutrition_facts.*.per_100ml' => ['nullable', 'string', 'max:20'],
            'stage' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:9'],
            'age_from_months' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:255'],
            'age_to_months' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:255'],
            'registration_number' => ['sometimes', 'nullable', 'string', 'max:100', new PlainText],
            'is_active' => ['sometimes', 'boolean'],
            'is_purchasable' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /** Rules on the product as it will be after saving. */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $product = $this->product();
            $state = array_merge(
                $product?->only(['age_from_months', 'age_to_months', 'is_active', 'is_purchasable']) ?? [],
                $validator->validated(),
            );

            if (isset($state['age_from_months'], $state['age_to_months']) && $state['age_to_months'] < $state['age_from_months']) {
                $validator->errors()->add('age_to_months', 'The upper age must not be below the lower age.');
            }

            $activeVariants = $product?->variants()->where('is_active', true)->get() ?? collect();

            if (! empty($state['is_active'])) {
                if ($product === null || ! $product->images()->exists()) {
                    $validator->errors()->add('is_active', 'Add at least one image before activating the product.');
                }
                if ($activeVariants->isEmpty()) {
                    $validator->errors()->add('is_active', 'Add at least one active size/pack before activating the product.');
                }
            }

            if (! empty($state['is_purchasable']) && $activeVariants->whereNotNull('price_piastres')->isEmpty()) {
                $validator->errors()->add('is_purchasable', 'Set a price on at least one active size/pack before selling the product.');
            }
        }];
    }
}
