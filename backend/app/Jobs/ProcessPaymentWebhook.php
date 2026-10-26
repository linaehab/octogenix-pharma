<?php

namespace App\Jobs;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\PaymentWebhookEvent;
use App\Payments\GatewayManager;
use App\Payments\GatewayResult;
use App\Payments\PaymentMismatch;
use App\Services\PaymentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Applies a stored, authenticated webhook event. Where the provider offers a status API, the
 * result is re-checked server-to-server and that answer wins over the webhook body.
 */
class ProcessPaymentWebhook implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [10, 60, 300, 900];

    public function __construct(public readonly int $eventId)
    {
        $this->afterCommit();
    }

    public function handle(PaymentService $payments, GatewayManager $gateways): void
    {
        $event = DB::transaction(function () {
            $event = PaymentWebhookEvent::query()->whereKey($this->eventId)->lockForUpdate()->first();

            if ($event === null || ! in_array($event->processing_status, ['received', 'failed'], true)) {
                return null; // already handled (or ignored)
            }

            $event->increment('attempts');

            return $event;
        });

        if ($event === null) {
            return;
        }

        $data = $event->payload['result'];
        $payment = Payment::query()
            ->where('provider', $event->provider)
            ->where('merchant_reference', $data['merchant_reference'])
            ->first();

        if ($payment === null) {
            $this->finish($event, 'ignored', 'No payment attempt with this reference.');

            return;
        }

        $event->forceFill(['payment_id' => $payment->id])->save();

        $result = $gateways->driver($event->provider)->fetchResult($payment) ?? new GatewayResult(
            merchantReference: $data['merchant_reference'],
            status: PaymentStatus::from($data['status']),
            amountPiastres: (int) $data['amount_piastres'],
            currency: (string) $data['currency'],
            providerTransactionId: $data['provider_transaction_id'],
            cardBrand: $data['card_brand'],
            cardLast4: $data['card_last4'],
            failureCode: $data['failure_code'],
            failureMessage: $data['failure_message'],
            raw: $event->payload['raw'] ?? [],
        );

        try {
            $payments->applyResult($payment, $result);
        } catch (PaymentMismatch $e) {
            // Not retried: the data will not change. Visible in the dashboard for investigation.
            Log::warning('Payment webhook mismatch', ['event' => $event->id, 'error' => $e->getMessage()]);
            $this->finish($event, 'failed', $e->getMessage());

            return;
        }

        $this->finish($event, 'processed');
    }

    public function failed(\Throwable $e): void
    {
        PaymentWebhookEvent::query()->whereKey($this->eventId)->update([
            'processing_status' => 'failed',
            'processing_error' => Str::limit($e->getMessage(), 997),
        ]);
    }

    private function finish(PaymentWebhookEvent $event, string $status, ?string $error = null): void
    {
        $event->forceFill([
            'processing_status' => $status,
            'processing_error' => $error !== null ? Str::limit($error, 997) : null,
            'processed_at' => now(),
        ])->save();
    }
}
