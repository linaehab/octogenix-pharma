<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Content is plain text (design v0.3 §7): no HTML tags, so nothing stored can change the
 * Angular layout or inject markup. Line breaks are allowed; "<" on its own (e.g. "<3") is too.
 */
class PlainText implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && preg_match('#</?[a-z!][^>]*>#i', $value)) {
            $fail('The :attribute must be plain text without HTML tags.');
        }
    }
}
