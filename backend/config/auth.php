<?php

use App\Models\AdminUser;
use App\Models\Customer;

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | Routes always name their guard explicitly (auth:admin, later auth:customer);
    | the default only matters for code that runs outside such a route.
    |
    */

    'defaults' => [
        'guard' => 'admin',
        'passwords' => 'admin_users',
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    |
    | Session (cookie) guards used through Sanctum's stateful SPA middleware.
    | Admins and customers are separate tables and separate guards (design v0.3 §7.6).
    |
    */

    'guards' => [
        'admin' => [
            'driver' => 'session',
            'provider' => 'admin_users',
        ],
        'customer' => [
            'driver' => 'session',
            'provider' => 'customers',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    */

    'providers' => [
        'admin_users' => [
            'driver' => 'eloquent',
            'model' => AdminUser::class,
        ],
        'customers' => [
            'driver' => 'eloquent',
            'model' => Customer::class,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    |
    | "expire" is the token lifetime in minutes; "throttle" is the number of
    | seconds before another link can be requested for the same account.
    |
    */

    'passwords' => [
        'admin_users' => [
            'provider' => 'admin_users',
            'table' => 'admin_password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
        'customers' => [
            'provider' => 'customers',
            'table' => 'customer_password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
