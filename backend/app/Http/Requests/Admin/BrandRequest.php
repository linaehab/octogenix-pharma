<?php

namespace App\Http\Requests\Admin;

use App\Enums\BrandLinkType;
use App\Models\Brand;
use App\Rules\PlainText;
use App\Rules\ValidImagePath;
use App\Support\Localized;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** Create (POST) and partial update (PATCH) of a brand. */
class BrandRequest extends FormRequest
{
    private function brand(): ?Brand
    {
        return $this->route('brand');
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('slug'))) {
            $this->merge(['slug' => Str::lower(trim($this->input('slug')))]);
        }
    }

    public function rules(): array
    {
        $creating = $this->brand() === null;
        $required = $creating ? 'required' : 'sometimes';
        $text = fn (int $max) => ['sometimes', 'nullable', 'string', "max:{$max}", new PlainText];
        $image = ['sometimes', 'nullable', 'string', new ValidImagePath];

        return [
            // Unique across soft-deleted brands too, so an archived brand's URL is never reused.
            'slug' => [$required, 'string', 'max:150', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('brands', 'slug')->ignore($this->brand())],
            ...Localized::rules('name', [$required, 'string', 'max:150', new PlainText]),
            ...Localized::rules('label', $text(150)),
            ...Localized::rules('short_description', $text(500)),
            ...Localized::rules('description', $text(5000)),
            ...Localized::rules('image_alt', $text(255)),
            ...Localized::rules('cta_label', $text(80)),
            'logo_path' => $image,
            'image_path' => $image,
            'hover_image_path' => $image,
            'link_type' => ['sometimes', Rule::enum(BrandLinkType::class)],
            'link_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'has_store' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /** Rules on the brand as it will be after saving (existing values merged with the input). */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $state = array_merge($this->brand()?->only(array_keys($this->rules())) ?? [], $validator->validated());
            $linkType = BrandLinkType::tryFrom($state['link_type'] instanceof BrandLinkType
                ? $state['link_type']->value : ($state['link_type'] ?? 'none'));
            $url = $state['link_url'] ?? null;

            if ($linkType === BrandLinkType::Internal && ! preg_match('#^/(?!/)\S*$#', (string) $url)) {
                $validator->errors()->add('link_url', 'An internal link must be an Angular route such as /contact.');
            }
            if ($linkType === BrandLinkType::External && ! preg_match('#^https://\S+$#', (string) $url)) {
                $validator->errors()->add('link_url', 'An external link must be an https:// address.');
            }

            if (! empty($state['is_active'])) {
                foreach (['name_en', 'name_ar', 'short_description_en', 'short_description_ar'] as $field) {
                    if (blank($state[$field] ?? null)) {
                        $validator->errors()->add($field, 'Required before the brand can be active.');
                    }
                }
                if (blank($state['image_path'] ?? null) && blank($state['logo_path'] ?? null)) {
                    $validator->errors()->add('image_path', 'An image or logo is required before the brand can be active.');
                }
            }
        }];
    }
}
