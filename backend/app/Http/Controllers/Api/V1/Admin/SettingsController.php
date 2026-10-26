<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        return response()->json(['data' => $data]);
    }

    /** Body: { "settings": { "<key>": <value>, ... } } — all-or-nothing. */
    public function update(Request $request, SettingsService $settings): JsonResponse
    {
        $request->validate(['settings' => ['required', 'array', 'min:1']]);

        $settings->update($request->input('settings'), $request->user('admin'));

        return $this->index($settings);
    }
}
