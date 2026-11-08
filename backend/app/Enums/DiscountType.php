<?php

namespace App\Enums;

/** How a product discount or promo code reduces a price. */
enum DiscountType: string
{
    /** Whole percent, 1–99. */
    case Percent = 'percent';
    /** Fixed amount in piastres. */
    case Fixed = 'fixed';

    /** The discount on an amount in piastres, rounded down to the piastre (never more than the amount). */
    public function apply(int $value, int $amount): int
    {
        return match ($this) {
            self::Percent => intdiv($amount * $value, 100),
            self::Fixed => min($value, $amount),
        };
    }
}
