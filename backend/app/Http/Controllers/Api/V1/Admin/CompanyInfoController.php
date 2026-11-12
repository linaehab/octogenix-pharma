<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\SettingsChangedException;
use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Company contact details and social links shown on the corporate website (routes require
 * content.manage). Only these setting keys: store, payment and notification settings stay
 * under settings.manage. Saved through SettingsService (validation, cache, audit).
 */
class CompanyInfoController extends Controller
{
    public const KEYS = ['contact.phones', 'contact.email', 'social.facebook', 'social.instagram', 'social.linkedin'];

    public function index(SettingsService $settings): JsonResponse
    {
        $values = $settings->all();
        $registry = $settings->registry();

        return response()->json(['data' => array_map(fn (string $key) => [
            'key' => $key,
            'type' => $registry[$key]['type'],
            'value' => $values[$key],
        ], self::KEYS)]);
    }

    /**
     * Body: { "settings": { "<key>": <value> }, "expected": { "<key>": <value the admin saw> } }.
     * All-or-nothing; if an expected value is no longer current, nothing is saved (409).
     */
    public function update(Request $request, SettingsService $settings): JsonResponse
    {
        $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'expected' => ['sometimes', 'array'],
        ]);

        $outside = array_diff(array_keys([...$request->input('settings'), ...$request->input('expected', [])]), self::KEYS);
        if ($outside !== []) {
            throw ValidationException::withMessages(['settings' => 'Only company contact details and social links can be changed here: '.implode(', ', $outside).'.']);
        }

        $current = $settings->all();
        $changed = [];
        foreach ($request->input('expected', []) as $key => $value) {
            if ($value !== $current[$key]) {
                $changed[$key] = $current[$key];
            }
        }
        if ($changed !== []) {
            throw new SettingsChangedException($changed);
        }

        $settings->update($request->input('settings'), $request->user('admin'), 'website.company_info_updated');

        return $this->index($settings);
    }
}
