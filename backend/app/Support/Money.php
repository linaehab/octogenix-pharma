<?php

namespace App\Support;

/** API money shape (design v0.3 §2): integer piastres plus currency, formatted by Angular. */
final class Money
{
    public const CURRENCY = 'EGP';

    /** @return array{amount_piastres: int, currency: string}|null */
    public static function of(?int $piastres): ?array
    {
        return $piastres === null ? null : ['amount_piastres' => $piastres, 'currency' => self::CURRENCY];
    }
}
