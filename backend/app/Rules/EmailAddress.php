<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A deliverable-looking email address: Laravel's `email` (RFC) rule alone accepts addresses such as
 * "dema@gmail" or "a@b" (no dot, no top-level domain), which can never receive our emails.
 * This rule asks for a domain with at least one dot and a top-level domain of 2+ letters
 * (or an internationalised "xn--" one), on top of PHP's address syntax check.
 */
class EmailAddress implements ValidationRule
{
    private const PATTERN = '/^[^@\s]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || filter_var($value, FILTER_VALIDATE_EMAIL) === false || preg_match(self::PATTERN, $value) !== 1) {
            $fail('Enter a valid email address, e.g. name@example.com.');
        }
    }
}
