<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Http\Resources\OrderResource;
use App\Services\CheckoutService;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    /**
     * 201 with the new order; 200 with the existing order when the same idempotency key is sent
     * again. Guests receive guest_access_token once, here and in the confirmation email.
     */
    public function store(CheckoutRequest $request, CheckoutService $checkout): JsonResponse
    {
        $customer = $request->customer();

        if ($customer) {
            $address = $customer->addresses()->find($request->integer('address_id'))
                ?? throw ValidationException::withMessages(['address_id' => 'Choose one of your saved addresses.']);
            $items = $customer->cartItems()->pluck('quantity', 'product_variant_id')->map(fn ($q) => (int) $q)->all();

            if ($items === []) {
                throw ValidationException::withMessages(['items' => 'Your cart is empty.']);
            }

            $contact = [
                'first_name' => $customer->first_name,
                'last_name' => $customer->last_name,
                'email' => $customer->email,
                'phone' => $customer->phone ?? $address->phone,
            ];
            $addressData = $address->only(['recipient_name', 'phone', 'city', 'area', 'street', 'building',
                'floor', 'apartment', 'landmark', 'postal_code']);
            $governorateId = $address->governorate_id;
            $addressId = $address->id;
        } else {
            $items = collect($request->validated('items'))
                ->mapWithKeys(fn ($i) => [(int) $i['variant_id'] => (int) $i['quantity']])->all();
            $contact = [
                ...$request->validated('contact'),
                'phone' => PhoneNumber::normalize($request->validated('contact.phone')),
            ];
            $addressData = [
                ...$request->validated('address'),
                'phone' => PhoneNumber::normalize($request->validated('address.phone')),
            ];
            $governorateId = (int) $request->validated('address.governorate_id');
            $addressId = null;
        }

        $result = $checkout->place([
            'items' => $items,
            'customer' => $customer,
            'contact' => $contact,
            'address' => $addressData,
            'customer_address_id' => $addressId,
            'governorate_id' => $governorateId,
            'payment_method' => PaymentMethod::from($request->validated('payment_method')),
            'idempotency_key' => $request->validated('idempotency_key'),
            'expected_total_piastres' => $request->validated('expected_total_piastres'),
            'customer_note' => $request->validated('customer_note'),
            'locale' => $request->validated('locale') ?? $customer?->locale ?? $request->getPreferredLanguage(['en', 'ar']) ?? 'en',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $order = $result['order']->load(['items', 'histories']);

        return (new OrderResource($order))
            ->additional($result['guest_token'] ? ['meta' => ['guest_access_token' => $result['guest_token']]] : [])
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }
}
