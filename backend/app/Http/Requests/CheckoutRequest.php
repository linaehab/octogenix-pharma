<?php

namespace App\Http\Requests;

use App\Enums\PaymentMethod;
use App\Http\Requests\Customer\RegisterRequest;
use App\Models\Customer;
use App\Rules\PlainText;
use App\Services\CartService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Checkout for both signed-in customers and guests (decision C6). The client never sends prices.
 *
 * - Customer: the items come from the account cart; delivery uses a saved address (address_id).
 * - Guest: items, contact details and the full address are sent with the request.
 */
class CheckoutRequest extends FormRequest
{
    public function customer(): ?Customer
    {
        $customer = $this->user('customer');

        return $customer instanceof Customer && $customer->is_active ? $customer : null;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('contact.email'))) {
            $this->merge(['contact' => [...$this->input('contact'), 'email' => Str::lower(trim($this->input('contact.email')))]]);
        }
    }

    public function rules(): array
    {
        $common = [
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'idempotency_key' => ['required', 'uuid'],
            'expected_total_piastres' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'customer_note' => ['sometimes', 'nullable', 'string', 'max:1000', new PlainText],
            'locale' => ['sometimes', Rule::in(['en', 'ar'])],
        ];

        if ($this->customer()) {
            return [...$common, 'address_id' => ['required', 'integer']];
        }

        $text = fn (int $max, bool $required = true) => [$required ? 'required' : 'nullable', 'string', "max:{$max}", new PlainText];

        return [
            ...$common,
            'items' => ['required', 'array', 'min:1', 'max:'.CartService::MAX_LINES],
            'items.*.variant_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'contact.first_name' => $text(80),
            'contact.last_name' => $text(80),
            'contact.email' => ['required', 'string', 'email', 'max:255'],
            'contact.phone' => ['required', 'string', 'max:30', RegisterRequest::egyptianMobileRule()],
            'address.recipient_name' => $text(160),
            'address.phone' => ['required', 'string', 'max:30', RegisterRequest::egyptianMobileRule()],
            'address.governorate_id' => ['required', 'integer'],
            'address.city' => $text(100),
            'address.area' => $text(100, false),
            'address.street' => $text(255),
            'address.building' => $text(50, false),
            'address.floor' => $text(20, false),
            'address.apartment' => $text(20, false),
            'address.landmark' => $text(255, false),
            'address.postal_code' => ['nullable', 'string', 'regex:/^\d{5}$/'],
        ];
    }
}
