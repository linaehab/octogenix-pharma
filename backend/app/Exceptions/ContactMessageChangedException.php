<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The contact message's status changed (another admin) after the admin opened it. Nothing was
 * saved; the dashboard shows the current message so the admin can decide again.
 */
class ContactMessageChangedException extends RuntimeException
{
    /** @param  array<string, mixed>  $current  the message as the dashboard shows it */
    public function __construct(public readonly array $current)
    {
        parent::__construct('The message changed meanwhile.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'This message was changed meanwhile, so nothing was saved. Review it and try again.',
            'current' => $this->current,
        ], 409);
    }
}
