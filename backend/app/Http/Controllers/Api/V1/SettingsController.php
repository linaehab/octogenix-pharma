<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Public settings for the Angular app (contact details, store switches), plus store.test_mode:
     * true only in TEST MODE (config/payments.php), so the store can label test prices, test fees
     * and simulated payments as such.
     */
    public function __invoke(SettingsService $settings): JsonResponse
    {
        return response()->json(['data' => [...$settings->publicValues(), 'store.test_mode' => (bool) config('payments.test_mode')]]);
    }
}
