<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\ShippingChangedException;
use App\Http\Controllers\Controller;
use App\Models\Governorate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Shipping configuration per governorate (decision C4). Routes require shipping.manage.
 * No fee is assumed: a governorate becomes deliverable only after an admin sets its fee.
 *
 * A fee applies to orders placed after it is saved: checkout copies the fee into the order
 * (orders.shipping_fee_piastres), and nothing here touches existing orders.
 */
class GovernorateController extends Controller
{
    private const FIELDS = ['id', 'code', 'name_en', 'name_ar', 'shipping_fee_piastres', 'delivery_days_min',
        'delivery_days_max', 'cod_available', 'is_deliverable', 'sort_order'];

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Governorate::query()->ordered()->get()->map(fn (Governorate $g) => $this->present($g)),
        ]);
    }

    /**
     * Optional expected_shipping_fee_piastres / expected_is_deliverable: the values the admin saw.
     * If the governorate changed since, nothing is saved (409 with the current values).
     */
    public function update(Request $request, Governorate $governorate): JsonResponse
    {
        $data = $request->validate([
            'shipping_fee_piastres' => ['sometimes', 'nullable', 'integer:strict', 'min:0', 'max:4294967295'],
            'delivery_days_min' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:60'],
            'delivery_days_max' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:60'],
            'cod_available' => ['sometimes', 'boolean'],
            'is_deliverable' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'expected_shipping_fee_piastres' => ['sometimes', 'nullable', 'integer:strict', 'min:0'],
            'expected_is_deliverable' => ['sometimes', 'boolean'],
        ]);

        $expected = array_intersect_key($data, array_flip(['expected_shipping_fee_piastres', 'expected_is_deliverable']));
        $changes = array_diff_key($data, $expected);

        $governorate = DB::transaction(function () use ($governorate, $expected, $changes) {
            $locked = Governorate::query()->lockForUpdate()->findOrFail($governorate->id);

            if (array_key_exists('expected_shipping_fee_piastres', $expected)
                && $expected['expected_shipping_fee_piastres'] !== $locked->shipping_fee_piastres) {
                throw new ShippingChangedException($this->present($locked));
            }
            if (array_key_exists('expected_is_deliverable', $expected)
                && filter_var($expected['expected_is_deliverable'], FILTER_VALIDATE_BOOLEAN) !== $locked->is_deliverable) {
                throw new ShippingChangedException($this->present($locked));
            }

            // The governorate as it will be after saving.
            $state = array_merge(
                $locked->only(['shipping_fee_piastres', 'delivery_days_min', 'delivery_days_max', 'is_deliverable']),
                $changes,
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

            $locked->update($changes);

            return $locked;
        });

        return response()->json(['data' => $this->present($governorate)]);
    }

    /** @return array<string, mixed> */
    private function present(Governorate $governorate): array
    {
        return [
            ...$governorate->only(self::FIELDS),
            'updated_at' => $governorate->updated_at?->toIso8601String(),
        ];
    }
}
