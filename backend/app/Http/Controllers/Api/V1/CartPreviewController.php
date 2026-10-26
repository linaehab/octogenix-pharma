<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Prices a guest's browser cart: { items: [{ variant_id, quantity }] } → the same shape as the
 * signed-in cart. Nothing is stored. Checkout recalculates everything again.
 */
class CartPreviewController extends Controller
{
    public function __invoke(Request $request, CartService $cart): JsonResponse
    {
        $request->validate([
            'items' => ['present', 'array', 'max:'.CartService::MAX_LINES],
            'items.*.variant_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ]);

        return response()->json(['data' => $cart->summarize(
            collect($request->input('items'))->mapWithKeys(fn ($i) => [(int) $i['variant_id'] => (int) $i['quantity']])->all()
        )]);
    }
}
