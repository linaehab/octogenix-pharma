<?php

namespace App\Http\Requests\Admin;

use App\Enums\AdminRole;
use App\Rules\EmailAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreAdminUserRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => Str::lower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', new EmailAddress, 'max:255', Rule::unique('admin_users', 'email')],
            'role' => ['required', Rule::enum(AdminRole::class)],
            'locale' => ['sometimes', Rule::in(['en', 'ar'])],
        ];
    }
}
