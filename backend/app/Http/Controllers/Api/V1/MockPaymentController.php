<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Payments\GatewayManager;
use App\Payments\GatewayResult;
use App\Payments\MockCardGateway;
use App\Services\PaymentService;
use App\Support\OrderAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * POST /api/v1/orders/{orderNumber}/mock-payment { outcome: succeeded|failed, merchant_reference, token? }
 *
 * TEST MODE ONLY. Plays the part of the payment provider for the pending mock attempt of an order
 * and applies a simulated result through PaymentService::applyResult(), so the order, payment and
 * history change exactly as they would for a verified provider result. Answers 404 unless the
 * mock driver is registered (STORE_TEST_MODE=true, never in production).
 *
 * مستقبلاً: لا يوجد مقابل لهذا الـ endpoint مع بوابة الدفع الحقيقية؛ النتيجة الحقيقية تصل فقط عبر
 * الإشعار الموقّع (PaymentWebhookController) أو الاستعلام المباشر من المزود (fetchResult)، ويُحذف
 * هذا الـ endpoint أو يبقى معطّلًا في الإنتاج.
 */
class MockPaymentController extends Controller
{
    public function __invoke(Request $request, string $orderNumber, GatewayManager $gateways, PaymentService $payments): OrderResource
    {
        abort_unless($gateways->has(MockCardGateway::NAME) && ! app()->isProduction(), 404);

        $data = $request->validate([
            'outcome' => ['required', 'in:succeeded,failed'],
            'merchant_reference' => ['required', 'uuid'],
        ]);

        $order = OrderAccess::resolve($request, $orderNumber);
        $payment = $order->payments()
            ->where('provider', MockCardGateway::NAME)
            ->where('method', PaymentMethod::Card)
            ->where('merchant_reference', $data['merchant_reference'])
            ->whereIn('status', [PaymentStatus::Initiated, PaymentStatus::Pending])
            ->first();
        abort_if($payment === null, 404);

        $succeeded = $data['outcome'] === 'succeeded';
        $payments->applyResult($payment, new GatewayResult(
            merchantReference: $payment->merchant_reference,
            status: $succeeded ? PaymentStatus::Succeeded : PaymentStatus::Failed,
            amountPiastres: $payment->amount_piastres,
            currency: $payment->currency,
            providerTransactionId: $succeeded ? 'mock-'.Str::uuid() : null,
            failureCode: $succeeded ? null : 'mock_declined',
            failureMessage: $succeeded ? null : 'Simulated failure (TEST MODE).',
            raw: ['test_mode' => true, 'simulated_outcome' => $data['outcome']],
        ));

        return new OrderResource($order->refresh()->load(['items', 'histories']));
    }
}
