<?php

namespace App\Exceptions;

use App\Support\Money;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/** The total the customer saw differs from the current one (price or shipping changed). Nothing was ordered. */
class TotalsChangedException extends RuntimeException
{
    /** @param array{subtotal: int, shipping_fee: int, cod_fee: int, total: int} $totals */
    public function __construct(public readonly array $totals)
    {
        parent::__construct('The order total has changed.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'Prices or delivery fees have changed. Please review the new total and confirm again.',
            'totals' => array_map(fn (int $piastres) => Money::of($piastres), $this->totals),
        ], 409);
    }
}
