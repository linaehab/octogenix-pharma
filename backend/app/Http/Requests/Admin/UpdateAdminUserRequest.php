<?php

namespace App\Http\Requests\Admin;

use App\Enums\AdminRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Email changes are not supported here: the email is the login identity. */
class UpdateAdminUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'role' => ['sometimes', Rule::enum(AdminRole::class)],
            'is_active' => ['sometimes', 'boolean'],
            // The account as the admin saw it: if it changed meanwhile, nothing is saved (409).
            'expected_updated_at' => ['sometimes', 'nullable', 'date'],
            'locale' => ['sometimes', Rule::in(['en', 'ar'])],
        ];
    }
}
