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
            'locale' => ['sometimes', Rule::in(['en', 'ar'])],
        ];
    }
}
