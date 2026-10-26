<?php

namespace App\Payments;

/** An authenticated webhook: a stable key for de-duplication plus the payment result it reports. */
final class WebhookNotification
{
    public function __construct(
        public readonly string $eventKey,
        public readonly ?string $eventType,
        public readonly GatewayResult $result,
    ) {}
}
