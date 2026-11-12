<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * A corporate brand, service or company setting was changed (by another admin) after the admin
 * opened it. Nothing was saved; the dashboard shows the current values so the admin can decide again.
 */
class WebsiteContentChangedException extends RuntimeException
{
    /** @param  array<string, mixed>  $current  the record as the dashboard shows it */
    public function __construct(public readonly array $current)
    {
        parent::__construct('The website content changed meanwhile.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'This was changed meanwhile, so nothing was saved. Review the current values and try again.',
            'current' => $this->current,
        ], 409);
    }
}
