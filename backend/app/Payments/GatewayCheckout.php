<?php

namespace App\Payments;

/** Where the customer completes payment (the provider's hosted page). */
final class GatewayCheckout
{
    public function __construct(
        public readonly string $redirectUrl,
        public readonly ?string $providerOrderId = null,
    ) {}
}
