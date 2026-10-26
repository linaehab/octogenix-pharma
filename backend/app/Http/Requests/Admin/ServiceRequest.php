<?php

namespace App\Http\Requests\Admin;

use App\Enums\ServiceCategory;
use App\Models\Service;
use App\Rules\PlainText;
use App\Rules\ValidImagePath;
use App\Support\Localized;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** Create (POST) and partial update (PATCH) of a service. */
class ServiceRequest extends FormRequest
{
    private function service(): ?Service
    {
        return $this->route('service');
    }

    public function rules(): array
    {
        $required = $this->service() === null ? 'required' : 'sometimes';
        $image = ['sometimes', 'nullable', 'string', new ValidImagePath];

        return [
            'category' => [$required, Rule::enum(ServiceCategory::class)],
            ...Localized::rules('title', [$required, 'string', 'max:150', new PlainText]),
            ...Localized::rules('description', [$required, 'string', 'max:2000', new PlainText]),
            ...Localized::rules('image_alt', ['sometimes', 'nullable', 'string', 'max:255', new PlainText]),
            'image_path' => $image,
            'hover_image_path' => $image,
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /** An image needs alt text in both languages (accessibility). */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $state = array_merge($this->service()?->only(array_keys($this->rules())) ?? [], $validator->validated());

            if (filled($state['image_path'] ?? null)) {
                foreach (['image_alt_en', 'image_alt_ar'] as $field) {
                    if (blank($state[$field] ?? null)) {
                        $validator->errors()->add($field, 'Alt text is required when the service has an image.');
                    }
                }
            }
        }];
    }
}
