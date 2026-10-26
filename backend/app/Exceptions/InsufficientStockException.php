<?php

namespace App\Exceptions;

use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    public function __construct(
        public readonly ProductVariant $variant,
        public readonly int $requested,
        public readonly int $available,
    ) {
        parent::__construct("Only {$available} unit(s) of {$variant->sku} are in stock; {$requested} requested.");
    }

    /** Rendered for API requests as a 422 on the quantity, without exposing internals. */
    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'There is not enough stock for this change.',
            'errors' => ['quantity' => ["Only {$this->available} unit(s) are in stock."]],
        ], 422);
    }
}
