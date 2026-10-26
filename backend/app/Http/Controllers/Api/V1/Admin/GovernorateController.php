<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Governorate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Shipping configuration per governorate (decision C4). Routes require shipping.manage.
 * No fee is assumed: a governorate becomes deliverable only after an admin sets its fee.
 */
class GovernorateController extends Controller
{
    private const FIELDS = ['id', 'code', 'name_en', 'name_ar', 'shipping_fee_piastres', 'delivery_days_min',
        'delivery_days_max', 'cod_available', 'is_deliverable', 'sort_order'];

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Governorate::query()->ordered()->get()->map(fn (Governorate $g) => $g->only(self::FIELDS)),
        ]);
    }

    public function update(Request $request, Governorate $governorate): JsonResponse
    {
        $data = $request->validate([
            'shipping_fee_piastres' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:4294967295'],
            'delivery_days_min' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:60'],
            'delivery_days_max' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:60'],
            'cod_available' => ['sometimes', 'boolean'],
            'is_deliverable' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ]);

        // The governorate as it will be after saving.
        $state = array_merge(
            $governorate->only(['shipping_fee_piastres', 'delivery_days_min', 'delivery_days_max', 'is_deliverable']),
            $data,
        );

        if (! empty($state['is_deliverable']) && $state['shipping_fee_piastres'] === null) {
            throw ValidationException::withMessages([
                'shipping_fee_piastres' => 'Set the shipping fee (0 is allowed) before enabling delivery.',
            ]);
        }
        if ($state['delivery_days_min'] !== null && $state['delivery_days_max'] !== null
            && $state['delivery_days_min'] > $state['delivery_days_max']) {
            throw ValidationException::withMessages(['delivery_days_max' => 'The maximum must not be below the minimum.']);
        }

        $governorate->update($data);

        return response()->json(['data' => $governorate->only(self::FIELDS)]);
    }
}
