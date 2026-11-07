<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\SettingsChangedException;
use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Routes require the settings.manage permission. */
class SettingsController extends Controller
{
    public function index(SettingsService $settings): JsonResponse
    {
        $values = $settings->all();

        $data = [];
        foreach ($settings->registry() as $key => $definition) {
            $data[] = [
                'key' => $key,
                'group' => $definition['group'],
                'type' => $definition['type'],
                'is_public' => $definition['public'],
                'value' => $values[$key],
            ];
        }

        return response()->json([
            'data' => $data,
            // Read-only facts the settings page explains (they come from the server configuration, not from settings).
            'meta' => [
                'currency' => 'EGP',
                'test_mode' => (bool) config('payments.test_mode'),
                'card_providers' => array_keys(config('payments.drivers', [])),
            ],
        ]);
    }

    /**
     * Body: { "settings": { "<key>": <value>, ... }, "expected": { "<key>": <value the admin saw>, ... } }
     * — all-or-nothing. If a value in "expected" is no longer current, nothing is saved (409 with
     * the current values), so an admin never overwrites a change they have not seen.
     */
    public function update(Request $request, SettingsService $settings): JsonResponse
    {
        $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'expected' => ['sometimes', 'array'],
        ]);

        $expected = $request->input('expected', []);
        $unknown = array_diff(array_keys($expected), array_keys($settings->registry()));
        if ($unknown !== []) {
            throw ValidationException::withMessages(['expected' => 'Unknown setting: '.implode(', ', $unknown).'.']);
        }

        $current = $settings->all();
        $changed = [];
        foreach ($expected as $key => $value) {
            if ($value !== $current[$key]) {
                $changed[$key] = $current[$key];
            }
        }
        if ($changed !== []) {
            throw new SettingsChangedException($changed);
        }

        $settings->update($request->input('settings'), $request->user('admin'));

        return $this->index($settings);
    }
}
