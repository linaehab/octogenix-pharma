<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The signed-in customer's cart. Responses always contain the full, freshly priced cart. Any of
 * these calls may carry ?promo_code=... to price the cart with that code (nothing is stored).
 */
class CartController extends Controller
{
    public function __construct(private readonly CartService $cart) {}

    public function show(Request $request): JsonResponse
    {
        return $this->cartResponse($request);
    }

    /** PUT /customer/cart/items/{variant} { quantity } — adds the item or sets its quantity. */
    public function setItem(Request $request, ProductVariant $variant): JsonResponse
    {
        $request->validate(['quantity' => ['required', 'integer', 'min:1', 'max:999']]);

        $this->cart->setQuantity($request->user('customer'), $variant, $request->integer('quantity'));

        return $this->cartResponse($request);
    }

    public function removeItem(Request $request, int $variant): JsonResponse
    {
        $request->user('customer')->cartItems()->where('product_variant_id', $variant)->delete();

        return $this->cartResponse($request);
    }

    public function clear(Request $request): JsonResponse
    {
        $request->user('customer')->cartItems()->delete();

        return $this->cartResponse($request);
    }

    /** After sign-in: { items: [{ variant_id, quantity }] } from the browser cart. */
    public function merge(Request $request): JsonResponse
    {
        $request->validate([
            'items' => ['required', 'array', 'max:'.CartService::MAX_LINES],
            'items.*.variant_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ]);

        $adjusted = $this->cart->merge(
            $request->user('customer'),
            collect($request->input('items'))->mapWithKeys(fn ($i) => [(int) $i['variant_id'] => (int) $i['quantity']])->all()
        );

        return $this->cartResponse($request, ['adjusted' => $adjusted]);
    }

    private function cartResponse(Request $request, array $meta = []): JsonResponse
    {
        $request->validate(['promo_code' => ['sometimes', 'nullable', 'string', 'max:32']]);
        $code = $request->query('promo_code');

        return response()->json([
            'data' => $this->cart->summarizeFor($request->user('customer'), is_string($code) ? $code : null),
            ...($meta ? ['meta' => $meta] : []),
        ]);
    }
}
