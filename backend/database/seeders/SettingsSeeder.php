<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Services\SettingsService;
use Illuminate\Database\Seeder;

/**
 * Creates every registered setting that does not exist yet. Safe to run repeatedly:
 * metadata (group, type, visibility) follows the registry, saved values are never overwritten.
 */
class SettingsSeeder extends Seeder
{
    public function run(SettingsService $settings): void
    {
        foreach ($settings->registry() as $key => $definition) {
            $setting = Setting::query()->firstOrNew(['key' => $key]);

            if (! $setting->exists) {
                $setting->value = $definition['default'];
            }

            $setting->fill([
                'group' => $definition['group'],
                'type' => $definition['type'],
                'is_public' => $definition['public'],
            ])->save();
        }

        $settings->flush();
    }
}
