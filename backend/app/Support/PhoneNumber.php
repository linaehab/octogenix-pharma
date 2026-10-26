<?php

namespace App\Support;

/**
 * Normalises phone numbers to E.164 (e.g. +201012345678).
 *
 * Accepts international numbers with a leading "+" or "00", and Egyptian national
 * numbers with a leading "0" (mobile 01XXXXXXXXX, landline 0XXXXXXXX[X]).
 * This is a format check only; it does not verify that a number exists.
 */
final class PhoneNumber
{
    public static function normalize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $number = preg_replace('/[\s\-.()]/', '', $raw) ?? '';

        if (str_starts_with($number, '00')) {
            $number = '+'.substr($number, 2);
        } elseif (preg_match('/^0\d{8,10}$/', $number)) {
            $number = '+20'.substr($number, 1);
        }

        return preg_match('/^\+[1-9]\d{6,14}$/', $number) ? $number : null;
    }

    /** Egyptian mobile numbers: +20 1[0,1,2,5] followed by 8 digits. */
    public static function isEgyptianMobile(?string $number): bool
    {
        return $number !== null && preg_match('/^\+201[0125]\d{8}$/', $number) === 1;
    }
}
