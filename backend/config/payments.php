<?php

use App\Payments\MockCardGateway;

/*
| TEST MODE (STORE_TEST_MODE=true, never in production): registers the "mock" driver and tells the
| Angular store to show its TEST MODE notices (test prices, test fees, simulated payments).
*/
$testMode = (bool) env('STORE_TEST_MODE', false) && env('APP_ENV', 'production') !== 'production';

return [

    /*
    |--------------------------------------------------------------------------
    | Card payment drivers
    |--------------------------------------------------------------------------
    |
    | name => class implementing App\Payments\CardGateway. Only drivers listed here can be
    | chosen as store.card_provider, so card payments cannot be enabled until a real provider
    | is implemented and configured (decision D-01: provider not selected yet).
    |
    | The "mock" driver (App\Payments\MockCardGateway) is listed only in TEST MODE (below) and lets
    | developers simulate a successful or failed payment; GatewayManager refuses it in production.
    |
    | The "fake" driver (App\Payments\FakeCardGateway) exists for automated tests only. Tests
    | register it at runtime, and the gateway manager refuses it outside the testing environment.
    |
    */

    // مستقبلاً: يُضاف هنا driver بوابة الدفع الحقيقية (مثال: 'provider-name' => ProviderCardGateway::class)
    // بعد اختيار مزود الدفع والحصول على بيانات التاجر وبيانات الربط الرسمية من متغيرات البيئة.
    'drivers' => $testMode ? [MockCardGateway::NAME => MockCardGateway::class] : [],

    /*
    | Development switch for the store (see above). Exposed to Angular as store.test_mode.
    */
    'test_mode' => $testMode,

    /*
    | Where the gateway sends the customer back after paying. This page only shows progress and
    | polls the order: a payment counts only once verified server-side (webhook / status check).
    */
    'return_url' => env('PAYMENT_RETURN_URL', rtrim((string) env('FRONTEND_APP_URL', 'http://localhost:4200'), '/').'/jovie/checkout/payment-result'),

    /*
    | The TEST MODE payment page of the Angular store (MockCardGateway sends customers there).
    */
    'mock' => [
        'page_url' => rtrim((string) env('FRONTEND_APP_URL', 'http://localhost:4200'), '/').'/jovie/checkout/mock-payment',
    ],

    'fake' => [
        'secret' => env('FAKE_GATEWAY_SECRET', 'fake-gateway-test-secret'),
    ],

];
