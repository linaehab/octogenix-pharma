<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * A setting changed (another admin) after the admin opened the settings page. Nothing was saved;
 * the dashboard shows the current values so the admin can decide again.
 *
 * @param  array<string, mixed>  $current  setting key => current value, for the keys that differ
 */
class SettingsChangedException extends RuntimeException
{
    public function __construct(public readonly array $current)
    {
        parent::__construct('Settings changed meanwhile: '.implode(', ', array_keys($current)).'.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => 'This setting was changed meanwhile, so nothing was saved. Review its current value and try again.',
            'current' => $this->current,
        ], 409);
    }
}
