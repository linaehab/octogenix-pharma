<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The review's status changed (another admin) after the admin opened it. Nothing was saved; the
 * dashboard shows the current review so the admin can decide again.
 */
class ReviewChangedException extends RuntimeException
{
    /** @param  array<string, mixed>  $current  the review as the dashboard shows it */
    public function __construct(public readonly array $current)
    {
        parent::__construct('The review changed meanwhile.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'This review was changed meanwhile, so nothing was saved. Review its current status and try again.',
            'current' => $this->current,
        ], 409);
    }
}
