<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Date-times sent by the dashboard. A value with an offset ("2026-11-10T10:00:00+02:00") keeps
 * it; a value without one is read as Cairo time. Stored in UTC like every other time.
 */
final class DateInput
{
    public static function utc(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse((string) $value, 'Africa/Cairo')->utc();
    }
}
