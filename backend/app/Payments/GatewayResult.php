<?php

namespace App\Payments;

use App\Enums\PaymentStatus;

/** A provider's statement about one payment attempt, after authentication. */
final class GatewayResult
{
    /** @param array<string, mixed> $raw sanitised provider data, kept for support */
    public function __construct(
        public readonly string $merchantReference,
        public readonly PaymentStatus $status,
        public readonly int $amountPiastres,
        public readonly string $currency,
        public readonly ?string $providerTransactionId = null,
        public readonly ?string $cardBrand = null,
        public readonly ?string $cardLast4 = null,
        public readonly ?string $failureCode = null,
        public readonly ?string $failureMessage = null,
        public readonly array $raw = [],
    ) {}
}
