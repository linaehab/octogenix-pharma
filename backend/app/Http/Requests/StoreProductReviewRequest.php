<?php

namespace App\Http\Requests;

use App\Rules\EmailAddress;
use App\Rules\PlainText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A customer review from the product page. Order number + email are optional and only give the
 * "verified purchase" badge when they match a real order containing the product.
 */
class StoreProductReviewRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        foreach (['email', 'order_number', 'order_email'] as $field) {
            if ($this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:80', new PlainText],
            'email' => ['nullable', 'string', 'email', new EmailAddress, 'max:255'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['required', 'string', 'min:3', 'max:120', new PlainText],
            'body' => ['required', 'string', 'min:10', 'max:3000', new PlainText],
            'recommends' => ['nullable', 'boolean'],
            'order_number' => ['nullable', 'string', 'max:20'],
            'order_email' => ['nullable', 'required_with:order_number', 'string', 'email', new EmailAddress, 'max:255'],
            'locale' => ['sometimes', Rule::in(['en', 'ar'])],
            // Honeypot: a hidden field real visitors never fill in.
            'website' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function isHoneypotFilled(): bool
    {
        return filled($this->input('website'));
    }
}
