<?php

namespace App\Http\Requests\Admin;

use App\Enums\ServiceCategory;
use App\Models\Service;
use App\Rules\PlainText;
use App\Support\Localized;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create (POST) and partial update (PATCH) of a service: its tab, texts, order and publishing (no images: the services section shows none). */
class ServiceRequest extends FormRequest
{
    private function service(): ?Service
    {
        return $this->route('service');
    }

    public function rules(): array
    {
        $required = $this->service() === null ? 'required' : 'sometimes';

        return [
            'category' => [$required, Rule::enum(ServiceCategory::class)],
            ...Localized::rules('title', [$required, 'string', 'max:150', new PlainText]),
            ...Localized::rules('description', [$required, 'string', 'max:2000', new PlainText]),
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
