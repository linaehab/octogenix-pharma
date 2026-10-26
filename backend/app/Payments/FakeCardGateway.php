<?php

namespace App\Payments;

use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * Test-only driver (refused outside the testing environment by GatewayManager).
 *
 * Mimics a typical hosted-checkout provider: webhooks are JSON signed with HMAC-SHA256 of the
 * raw body in the X-Fake-Signature header, and fetchResult() returns whatever a test set with
 * FakeCardGateway::$results. Real providers follow the same contract with their own formats.
 */
class FakeCardGateway implements CardGateway
{
    /** @var array<string, GatewayResult> merchant reference => result reported by fetchResult() */
    public static array $results = [];

    public function name(): string
    {
        return 'fake';
    }

    public function createCheckout(Payment $payment, Order $order, string $returnUrl): GatewayCheckout
    {
        return new GatewayCheckout(
            'https://fake-gateway.test/pay/'.$payment->merchant_reference.'?'.http_build_query(['return' => $returnUrl]),
            'fake-order-'.$payment->merchant_reference,
        );
    }

    public function parseWebhook(Request $request): WebhookNotification
    {
        $body = $request->getContent();

        if (! hash_equals(self::sign($body), (string) $request->header('X-Fake-Signature'))) {
            throw new InvalidWebhookSignature('Invalid fake gateway signature.');
        }

        $data = json_decode($body, true) ?: [];

        return new WebhookNotification(
            (string) ($data['event_id'] ?? hash('sha256', $body)),
            $data['type'] ?? null,
            new GatewayResult(
                merchantReference: (string) ($data['merchant_reference'] ?? ''),
                status: PaymentStatus::tryFrom((string) ($data['status'] ?? '')) ?? PaymentStatus::Pending,
                amountPiastres: (int) ($data['amount_piastres'] ?? 0),
                currency: (string) ($data['currency'] ?? ''),
                providerTransactionId: $data['transaction_id'] ?? null,
                cardBrand: $data['card']['brand'] ?? null,
                cardLast4: $data['card']['last4'] ?? null,
                failureCode: $data['failure']['code'] ?? null,
                failureMessage: $data['failure']['message'] ?? null,
                raw: $data,
            ),
        );
    }

    public function fetchResult(Payment $payment): ?GatewayResult
    {
        return self::$results[$payment->merchant_reference] ?? null;
    }

    public static function sign(string $body): string
    {
        return hash_hmac('sha256', $body, (string) config('payments.fake.secret'));
    }
}
