<?php

namespace App\Payments;

/**
 * Last line of defence before provider data is stored (payments.gateway_response, webhook
 * payloads): removes anything that could be a card number, CVV, expiry or magnetic-track data,
 * and masks long digit runs. Hosted checkouts should never send these, but we do not rely on it.
 */
final class CardDataSanitizer
{
    /** Whole key or its last _/- separated part, e.g. "pan", "card_number", "source_cvv", "exp_month". */
    private const SENSITIVE_KEY = '/(^|[_-])(card_?number|pan|cvv2?|cvc2?|cvn|security_?code|expiry|exp(iry)?_?(month|year|date)|track_?\d?|pin)$/i';

    public static function clean(mixed $data): mixed
    {
        if (is_array($data)) {
            $clean = [];
            foreach ($data as $key => $value) {
                if (is_string($key) && preg_match(self::SENSITIVE_KEY, $key)) {
                    $clean[$key] = '[removed]';

                    continue;
                }
                $clean[$key] = self::clean($value);
            }

            return $clean;
        }

        // 13–19 consecutive digits (optionally spaced) look like a card number: keep only the last 4.
        if (is_string($data)) {
            return preg_replace_callback('/\b(?:\d[ -]?){12,18}\d\b/', fn ($m) => '****'.substr(preg_replace('/\D/', '', $m[0]), -4), $data);
        }

        return $data;
    }
}
