<?php

namespace App\Http\Requests\Admin;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductVariant;
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

    /** The product's single size (default variant), when it has one. */
    private function defaultVariant(): ?ProductVariant
    {
        return $this->product()?->variants()->where('is_default', true)->first();
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('slug'))) {
            $this->merge(['slug' => Str::lower(trim($this->input('slug')))]);
        }
        if (is_string($this->input('variant.sku'))) {
            $this->merge(['variant' => [...$this->input('variant'), 'sku' => Str::upper(trim($this->input('variant.sku')))]]);
        }
        // With a single store brand (Jovie) the dashboard does not ask for it.
        if ($this->product() === null && ! $this->has('brand_id')) {
            $storeBrands = Brand::query()->where('has_store', true)->pluck('id');
            if ($storeBrands->count() === 1) {
                $this->merge(['brand_id' => $storeBrands->first()]);
            }
        }
    }

    public function rules(): array
    {
        $creating = $this->product() === null;
        $required = $creating ? 'required' : 'sometimes';
        $text = fn (int $max) => ['sometimes', 'nullable', 'string', "max:{$max}", new PlainText];
        // The single size, edited with the product. Same rules as ProductVariantRequest.
        $variant = $this->defaultVariant();
        // Optional block: a product can still be created first and given its size afterwards.
        $variantRequired = $creating || $variant === null ? 'required_with:variant' : 'sometimes';

        return [
            'variant' => ['sometimes', 'array:sku,barcode,name_en,name_ar,net_weight_grams,price_piastres,compare_at_price_piastres,initial_stock,stock_quantity'],
            'variant.sku' => [$variantRequired, 'string', 'min:2', 'max:64', 'regex:/^[A-Z0-9][A-Z0-9._-]*$/',
                Rule::unique('product_variants', 'sku')->ignore($variant)],
            'variant.barcode' => ['sometimes', 'nullable', 'string', 'regex:/^\d{8,14}$/',
                Rule::unique('product_variants', 'barcode')->ignore($variant)],
            'variant.name_en' => [$variantRequired, 'string', 'max:100', new PlainText],
            'variant.name_ar' => [$variantRequired, 'string', 'max:100', new PlainText],
            'variant.net_weight_grams' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100000'],
            'variant.price_piastres' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:4294967295'],
            'variant.compare_at_price_piastres' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:4294967295'],
            // Opening stock only when the size is created (recorded as an inventory movement); stock is
            // never set directly.
            'variant.initial_stock' => $creating || $variant === null ? ['sometimes', 'integer', 'min:0', 'max:1000000'] : ['prohibited'],
            'variant.stock_quantity' => ['prohibited'],
            'stock_quantity' => ['prohibited'],
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

            // The size as it will be after saving: stored values overlaid with the submitted ones.
            $variant = $this->defaultVariant();
            $incoming = $validator->validated()['variant'] ?? null;
            $size = $incoming === null ? null : array_merge(
                $variant?->only(['price_piastres', 'compare_at_price_piastres']) ?? [],
                $incoming,
            );

            if ($size !== null) {
                $compareAt = $size['compare_at_price_piastres'] ?? null;
                $price = $size['price_piastres'] ?? null;
                if ($compareAt !== null && $price === null) {
                    $validator->errors()->add('variant.compare_at_price_piastres', 'Set the price before the original (compare-at) price.');
                } elseif ($compareAt !== null && $compareAt <= $price) {
                    $validator->errors()->add('variant.compare_at_price_piastres', 'The original price must be higher than the price.');
                }
            }

            $activeVariants = $product?->variants()->where('is_active', true)->get() ?? collect();
            // A size created or edited in this request counts with its new price.
            $hasActiveSize = $activeVariants->isNotEmpty() || ($incoming !== null && $variant === null);
            $hasPrice = $size !== null && ($variant === null || $variant->is_active)
                ? ($size['price_piastres'] ?? null) !== null
                : $activeVariants->whereNotNull('price_piastres')->isNotEmpty();

            if (! empty($state['is_active'])) {
                if ($product === null || ! $product->images()->exists()) {
                    $validator->errors()->add('is_active', 'Add at least one image before activating the product.');
                }
                if (! $hasActiveSize) {
                    $validator->errors()->add('is_active', 'Add at least one active size/pack before activating the product.');
                }
            }

            if (! empty($state['is_purchasable']) && ! $hasPrice) {
                $validator->errors()->add('is_purchasable', 'Set a price on at least one active size/pack before selling the product.');
            }
        }];
    }

    /** Product fields only (the size is saved separately, in the same transaction). */
    public function productData(): array
    {
        return collect($this->validated())->except(['variant', 'stock_quantity'])->all();
    }

    /** The submitted size fields, or null when none were sent. */
    public function variantData(): ?array
    {
        $variant = $this->validated()['variant'] ?? null;

        return $variant === null ? null : collect($variant)->except('stock_quantity')->all();
    }
}
