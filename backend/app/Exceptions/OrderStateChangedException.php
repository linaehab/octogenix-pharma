<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The order changed (another admin, the payment provider or the expiry job) after the admin
 * opened it. Nothing was changed; the dashboard reloads the order and shows its current state.
 */
class OrderStateChangedException extends RuntimeException
{
    public function __construct(public readonly string $expected, public readonly string $current)
    {
        parent::__construct("The order is now {$current}, not {$expected}.");
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => "This order changed meanwhile (it is now {$this->current}), so nothing was done. Review it and try again.",
            'current_status' => $this->current,
        ], 409);
    }
}
