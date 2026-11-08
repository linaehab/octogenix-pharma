<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * A product discount or promo code was changed (by another admin) after the admin opened it.
 * Nothing was saved; the dashboard shows the current values so the admin can decide again.
 */
class DiscountChangedException extends RuntimeException
{
    /** @param  array<string, mixed>  $current  the record as the admin list shows it */
    public function __construct(public readonly array $current)
    {
        parent::__construct('The discount changed meanwhile.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'This discount was changed meanwhile, so nothing was saved. Review its current values and try again.',
            'current' => $this->current,
        ], 409);
    }
}
