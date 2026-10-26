<?php

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
    | The "fake" driver (App\Payments\FakeCardGateway) exists for automated tests only. Tests
    | register it at runtime, and the gateway manager refuses it outside the testing environment.
    |
    */

    'drivers' => [],

    /*
    | Where the gateway sends the customer back after paying. This page only shows progress and
    | polls the order: a payment counts only once verified server-side (webhook / status check).
    */
    'return_url' => env('PAYMENT_RETURN_URL', rtrim((string) env('FRONTEND_APP_URL', 'http://localhost:4200'), '/').'/jovie/checkout/payment-result'),

    'fake' => [
        'secret' => env('FAKE_GATEWAY_SECRET', 'fake-gateway-test-secret'),
    ],

];
