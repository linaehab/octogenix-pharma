<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessPaymentWebhook;
use App\Models\PaymentWebhookEvent;
use App\Payments\CardDataSanitizer;
use App\Payments\GatewayManager;
use App\Payments\InvalidWebhookSignature;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * POST /api/v1/payments/webhooks/{provider} — called by the payment provider's servers.
 *
 * 1. Authenticate the request (driver checks the signature). Invalid → stored as ignored, 401.
 * 2. Store the event; a duplicate (provider, event_key) → 200 without processing it again.
 * 3. Queue the processing job and answer quickly, so the provider does not time out and retry.
 */
class PaymentWebhookController extends Controller
{
    public function __invoke(Request $request, string $provider, GatewayManager $gateways): JsonResponse
    {
        abort_unless($gateways->has($provider), 404);

        try {
            $notification = $gateways->driver($provider)->parseWebhook($request);
        } catch (InvalidWebhookSignature) {
            PaymentWebhookEvent::query()->firstOrCreate(
                ['provider' => $provider, 'event_key' => 'invalid:'.hash('sha256', $request->getContent())],
                [
                    'signature_valid' => false,
                    'payload' => ['raw' => CardDataSanitizer::clean(json_decode($request->getContent(), true) ?? mb_substr($request->getContent(), 0, 2000))],
                    'processing_status' => 'ignored',
                    'processing_error' => 'Invalid signature.',
                    'received_at' => now(),
                ],
            );

            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $result = $notification->result;

        try {
            $event = PaymentWebhookEvent::create([
                'provider' => $provider,
                'event_key' => mb_substr($notification->eventKey, 0, 191),
                'event_type' => $notification->eventType,
                'signature_valid' => true,
                'payload' => [
                    // The authenticated result, so the job never has to trust raw input again.
                    'result' => [
                        'merchant_reference' => $result->merchantReference,
                        'status' => $result->status->value,
                        'amount_piastres' => $result->amountPiastres,
                        'currency' => $result->currency,
                        'provider_transaction_id' => $result->providerTransactionId,
                        'card_brand' => $result->cardBrand,
                        'card_last4' => $result->cardLast4,
                        'failure_code' => $result->failureCode,
                        'failure_message' => $result->failureMessage,
                    ],
                    'raw' => CardDataSanitizer::clean($result->raw),
                ],
                'processing_status' => 'received',
                'received_at' => now(),
            ]);
        } catch (UniqueConstraintViolationException) {
            return response()->json(['message' => 'Already received.']);
        }

        try {
            ProcessPaymentWebhook::dispatch($event->id);
        } catch (Throwable $e) {
            // Stored as "received"; it can be reprocessed from the dashboard.
            report($e);
        }

        return response()->json(['message' => 'Received.']);
    }
}
