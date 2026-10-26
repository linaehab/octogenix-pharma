<?php

namespace App\Http\Requests\Customer;

use App\Rules\PlainText;
use App\Support\PhoneNumber;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
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
            'first_name' => ['required', 'string', 'max:80', new PlainText],
            'last_name' => ['required', 'string', 'max:80', new PlainText],
            // Unique among all rows: deleted accounts are anonymised, which frees their email.
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('customers', 'email')],
            'phone' => ['required', 'string', 'max:30', self::egyptianMobileRule()],
            'password' => ['required', 'string', 'confirmed', ...self::passwordRules()],
            'locale' => ['sometimes', Rule::in(['en', 'ar'])],
        ];
    }

    /** Customers use a lighter policy than admins (min. 8 characters with letters and numbers). */
    public static function passwordRules(): array
    {
        return [Password::min(8)->letters()->numbers()];
    }

    /** The delivery phone must be an Egyptian mobile number (Egypt-only store). */
    public static function egyptianMobileRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) {
            if (! PhoneNumber::isEgyptianMobile(PhoneNumber::normalize(is_string($value) ? $value : null))) {
                $fail('Enter an Egyptian mobile number, e.g. 01012345678.');
            }
        };
    }
}
