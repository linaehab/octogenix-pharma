<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /** Public settings for the Angular app (contact details, store switches). */
    public function __invoke(SettingsService $settings): JsonResponse
    {
        return response()->json(['data' => $settings->publicValues()]);
    }
}
