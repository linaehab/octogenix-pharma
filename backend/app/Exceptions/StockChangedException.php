<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The stock changed between the moment the admin looked at it and the adjustment (a double
 * submission, another admin, or an order). Nothing was recorded; the admin reviews and retries.
 */
class StockChangedException extends RuntimeException
{
    public function __construct(public readonly int $expected, public readonly int $current)
    {
        parent::__construct("The stock changed from {$expected} to {$current} before this adjustment was saved.");
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => "The stock changed to {$this->current} meanwhile, so nothing was saved. Review it and try again.",
            'current_stock' => $this->current,
        ], 409);
    }
}
