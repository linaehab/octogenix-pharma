<?php

namespace App\Http\Requests\Admin;

use App\Enums\AdminPermission;
use App\Enums\ContactMessageStatus;
use App\Models\AdminUser;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactMessageRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::enum(ContactMessageStatus::class)],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'assigned_admin_id' => ['sometimes', 'nullable', 'integer', function (string $attribute, mixed $value, Closure $fail) {
                $assignee = AdminUser::query()->whereKey($value)->where('is_active', true)->first();

                if (! $assignee || ! $assignee->hasPermission(AdminPermission::ViewMessages)) {
                    $fail('Messages can only be assigned to an active admin who can view messages.');
                }
            }],
        ];
    }
}
