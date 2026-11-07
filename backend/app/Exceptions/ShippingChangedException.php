<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The governorate's shipping fee or delivery switch changed (another admin) after the admin
 * opened it. Nothing was saved; the dashboard shows the current values so the admin can decide again.
 *
 * @param  array<string, mixed>  $current  the governorate as the admin list shows it
 */
class ShippingChangedException extends RuntimeException
{
    public function __construct(public readonly array $current)
    {
        parent::__construct('The governorate changed meanwhile.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'This governorate was changed meanwhile, so nothing was saved. Review its current values and try again.',
            'current' => $this->current,
        ], 409);
    }
}
