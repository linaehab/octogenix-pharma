<?php

namespace App\Rules;

use App\Support\ImagePath;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Accepts only bundled Angular images or files previously uploaded through the API. */
class ValidImagePath implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! ImagePath::isValid($value)) {
            $fail('The :attribute must be an uploaded image or a bundled site image.');
        }
    }
}
