<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The admin account was changed (by another super admin) after it was opened. Nothing was
 * saved; the dashboard shows the current account so the admin can decide again.
 */
class AdminUserChangedException extends RuntimeException
{
    /** @param  array<string, mixed>  $current  the account as the dashboard shows it */
    public function __construct(public readonly array $current)
    {
        parent::__construct('The admin account changed meanwhile.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'This account was changed meanwhile, so nothing was saved. Review it and try again.',
            'current' => $this->current,
        ], 409);
    }
}
