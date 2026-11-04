<?php

namespace App\Payments;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * TEST MODE ONLY: a stand-in for a hosted card payment page, for local development and UI tests
 * while no payment provider is selected (decision D-01).
 *
 * - Registered only when STORE_TEST_MODE=true outside production (config/payments.php), and
 *   GatewayManager refuses it in production even if it is listed.
 * - The "payment page" is the Angular TEST MODE page /jovie/checkout/mock-payment, which only
 *   offers "simulate success" / "simulate failure". No card details are asked for or stored.
 * - The simulated result is applied by MockPaymentController through PaymentService::applyResult(),
 *   the same code that applies real verified results, and the attempt is stored with is_test = true.
 *
 * مستقبلاً: يتم استبدال هذا الـ driver بكلاس جديد يطبّق نفس الواجهة CardGateway لبوابة الدفع الحقيقية،
 * بعد اختيار مزود الدفع والحصول على بيانات التاجر وبيانات الربط الرسمية، ثم يُضاف اسمه في
 * config/payments.php ويُختار من لوحة التحكم (store.card_provider). لا يُستخدم هذا الـ driver في الإنتاج أبدًا.
 */
class MockCardGateway implements CardGateway
{
    public const NAME = 'mock';

    public function name(): string
    {
        return self::NAME;
    }

    public function createCheckout(Payment $payment, Order $order, string $returnUrl): GatewayCheckout
    {
        // مستقبلاً: هنا يتم إنشاء جلسة الدفع لدى البوابة الحقيقية (API الخاص بالمزود) والحصول على
        // رابط صفحة الدفع المستضافة لديه، بدلًا من صفحة الاختبار الداخلية.
        $page = rtrim((string) config('payments.mock.page_url'), '/');

        return new GatewayCheckout(
            $page.'?'.http_build_query(['order' => $order->order_number, 'ref' => $payment->merchant_reference]),
            'mock-'.$payment->merchant_reference,
        );
    }

    public function parseWebhook(Request $request): WebhookNotification
    {
        // مستقبلاً: هنا يتم التحقق من توقيع إشعار البوابة الحقيقية (HMAC أو ما يحدده المزود) ثم قراءة النتيجة.
        // بوابة الاختبار لا ترسل إشعارات، لذلك يُرفض أي إشعار يصل باسمها.
        throw new InvalidWebhookSignature('The mock payment driver does not accept webhooks.');
    }

    public function fetchResult(Payment $payment): ?GatewayResult
    {
        // مستقبلاً: هنا يتم الاستعلام من البوابة الحقيقية مباشرة (server-to-server) عن حالة عملية الدفع.
        // في وضع الاختبار تُطبَّق النتيجة فورًا عند الضغط على زر المحاكاة، فلا توجد حالة لدى أي مزود.
        return null;
    }
}
