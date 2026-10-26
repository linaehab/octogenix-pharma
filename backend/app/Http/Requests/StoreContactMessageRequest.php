<?php

namespace App\Http\Requests;

use App\Enums\ContactSubject;
use App\Enums\Site;
use App\Support\PhoneNumber;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Mirrors the Angular contact form: first name, email and message required;
 * last name, phone and subject optional.
 */
class StoreContactMessageRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => is_string($this->input('email')) ? Str::lower(trim($this->input('email'))) : $this->input('email'),
            // The form's placeholder option sends an empty string.
            'subject' => $this->input('subject') === '' ? null : $this->input('subject'),
            'phone' => $this->input('phone') === '' ? null : $this->input('phone'),
            'last_name' => $this->input('last_name') === '' ? null : $this->input('last_name'),
        ]);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', function (string $attribute, mixed $value, Closure $fail) {
                if (PhoneNumber::normalize($value) === null) {
                    $fail('The phone number format is invalid.');
                }
            }],
            'subject' => ['nullable', Rule::enum(ContactSubject::class)],
            'message' => ['required', 'string', 'min:2', 'max:5000'],
            'site' => ['sometimes', Rule::enum(Site::class)],
            'locale' => ['sometimes', Rule::in(['en', 'ar'])],
            // Honeypot: a hidden field real visitors never fill in.
            'website' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function isHoneypotFilled(): bool
    {
        return filled($this->input('website'));
    }

    public function locale(): string
    {
        return $this->input('locale') ?? $this->getPreferredLanguage(['en', 'ar']) ?? 'en';
    }
}
