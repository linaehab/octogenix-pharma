<?php

namespace App\Http\Requests\Customer;

use App\Rules\PlainText;
use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create (POST) and partial update (PATCH) of a saved Egyptian delivery address. */
class AddressRequest extends FormRequest
{
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';
        $optional = fn (int $max) => ['sometimes', 'nullable', 'string', "max:{$max}", new PlainText];

        return [
            'label' => $optional(50),
            'recipient_name' => [$required, 'string', 'max:160', new PlainText],
            'phone' => [$required, 'string', 'max:30', RegisterRequest::egyptianMobileRule()],
            'governorate_id' => [$required, 'integer', Rule::exists('governorates', 'id')],
            'city' => [$required, 'string', 'max:100', new PlainText],
            'area' => $optional(100),
            'street' => [$required, 'string', 'max:255', new PlainText],
            'building' => $optional(50),
            'floor' => $optional(20),
            'apartment' => $optional(20),
            'landmark' => $optional(255),
            'postal_code' => ['sometimes', 'nullable', 'string', 'regex:/^\d{5}$/'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, mixed> */
    public function addressData(): array
    {
        $data = $this->validated();

        if (isset($data['phone'])) {
            $data['phone'] = PhoneNumber::normalize($data['phone']);
        }

        return $data;
    }
}
