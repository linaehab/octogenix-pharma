<?php

/*
|--------------------------------------------------------------------------
| Settings registry (design v0.3 §5.B)
|--------------------------------------------------------------------------
|
| The only setting keys that exist. SettingsSeeder creates missing rows with these
| defaults and never overwrites values an admin has saved. Admins can edit values
| but cannot add or remove keys.
|
| Defaults are placeholders, not confirmed business values:
| - contact.phones / contact.email are copied from the current Angular contact page
|   and must be confirmed by the client.
| - Store switches are off and fees are null until the client provides them.
| - store.pending_payment_ttl_minutes is a technical default.
|
| Types: string, email, email_list, phone_list, url, boolean, integer, money (piastres).
|
*/

return [

    'contact.phones' => [
        'group' => 'contact', 'type' => 'phone_list', 'public' => true,
        'default' => ['+201090075087', '+201018302408', '+20572070371'],
    ],
    'contact.email' => [
        'group' => 'contact', 'type' => 'email', 'public' => true,
        'default' => 'info@octogenixpharma.com',
    ],
    'contact.notification_recipients' => [
        'group' => 'notifications', 'type' => 'email_list', 'public' => false,
        'default' => [],
    ],
    'orders.notification_recipients' => [
        'group' => 'notifications', 'type' => 'email_list', 'public' => false,
        'default' => [],
    ],

    'store.enabled' => [
        'group' => 'store', 'type' => 'boolean', 'public' => true, 'default' => false,
    ],
    'store.card_payments_enabled' => [
        'group' => 'store', 'type' => 'boolean', 'public' => true, 'default' => false,
    ],
    'store.card_provider' => [
        'group' => 'store', 'type' => 'string', 'public' => false, 'default' => null,
    ],
    'store.cod_enabled' => [
        'group' => 'store', 'type' => 'boolean', 'public' => true, 'default' => false,
    ],
    'store.cod_fee_piastres' => [
        'group' => 'store', 'type' => 'money', 'public' => true, 'default' => null,
    ],
    'store.free_shipping_threshold_piastres' => [
        'group' => 'store', 'type' => 'money', 'public' => true, 'default' => null,
    ],
    'store.pending_payment_ttl_minutes' => [
        'group' => 'store', 'type' => 'integer', 'public' => false, 'default' => 30,
        'min' => 5, 'max' => 1440,
    ],

];
