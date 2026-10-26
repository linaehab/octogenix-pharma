<?php

namespace App\Payments;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * What a card payment provider must implement (decision C3: provider not selected yet, D-01).
 *
 * Card details are always entered on the provider's hosted page or iframe: our server never
 * receives card numbers or CVVs. A payment counts as paid only after verify*() / fetchResult()
 * on the server, never because the customer's browser was redirected back.
 */
interface CardGateway
{
    /** The driver name stored in payments.provider. */
    public function name(): string;

    /** Registers the attempt with the provider and returns where to send the customer. */
    public function createCheckout(Payment $payment, Order $order, string $returnUrl): GatewayCheckout;

    /**
     * Authenticates an incoming notification (signature/HMAC) and parses it.
     *
     * @throws InvalidWebhookSignature when the request is not authentic
     */
    public function parseWebhook(Request $request): WebhookNotification;

    /** Asks the provider directly for the attempt's state; null when the provider has no such API. */
    public function fetchResult(Payment $payment): ?GatewayResult;
}
