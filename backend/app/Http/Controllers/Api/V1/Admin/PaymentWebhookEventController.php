<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessPaymentWebhook;
use App\Models\PaymentWebhookEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Webhook log for investigating payment problems. Routes require payments.manage. */
class PaymentWebhookEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'processing_status' => ['sometimes', Rule::in(['received', 'processed', 'ignored', 'failed'])],
            'provider' => ['sometimes', 'string', 'max:30'],
        ]);

        $events = PaymentWebhookEvent::query()
            ->when($filters['processing_status'] ?? null, fn ($q, $v) => $q->where('processing_status', $v))
            ->when($filters['provider'] ?? null, fn ($q, $v) => $q->where('provider', $v))
            ->latest('id')
            ->paginate(50);

        return response()->json([
            'data' => $events->getCollection()->map(fn (PaymentWebhookEvent $e) => [
                ...$e->only(['id', 'provider', 'event_key', 'event_type', 'payment_id', 'signature_valid',
                    'processing_status', 'processing_error', 'attempts']),
                'result' => $e->payload['result'] ?? null,
                'received_at' => $e->received_at->toIso8601String(),
                'processed_at' => $e->processed_at?->toIso8601String(),
            ]),
            'meta' => ['current_page' => $events->currentPage(), 'last_page' => $events->lastPage(), 'total' => $events->total()],
        ]);
    }

    /** Re-queues an authenticated event that failed or was never processed. */
    public function reprocess(PaymentWebhookEvent $event): JsonResponse
    {
        if (! $event->signature_valid || ! in_array($event->processing_status, ['received', 'failed'], true)) {
            throw ValidationException::withMessages(['event' => 'Only authenticated events that failed or are still waiting can be reprocessed.']);
        }

        ProcessPaymentWebhook::dispatch($event->id);

        return response()->json(['message' => 'The event has been queued for processing.'], 202);
    }
}
