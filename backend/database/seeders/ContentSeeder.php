<?php

namespace Database\Seeders;

use App\Content\ContentRegistry;
use App\Enums\Site;
use App\Models\Brand;
use App\Models\ContentEntry;
use App\Models\ContentItem;
use App\Models\Service;
use App\Services\ContentService;
use Illuminate\Database\Seeder;

/**
 * Seeds the current Angular site's texts, images, lists, services and the Jovie brand.
 * Safe to run repeatedly: existing rows and admin edits are never overwritten.
 */
class ContentSeeder extends Seeder
{
    public function run(ContentRegistry $registry, ContentService $content): void
    {
        foreach (Site::cases() as $site) {
            foreach ($registry->entries($site) as $key => $definition) {
                ContentEntry::query()->firstOrCreate(
                    ['site' => $site->value, 'key' => $key],
                    [
                        'group' => $definition['group'],
                        'type' => $definition['type'],
                        'value_en' => $definition['en'] ?? null,
                        'value_ar' => $definition['ar'] ?? null,
                        'image_path' => $definition['image'] ?? null,
                    ],
                );
            }
        }

        $corporate = require database_path('seeders/data/corporate.php');

        foreach ($corporate['lists'] as $listKey => $items) {
            if (ContentItem::query()->inList(Site::Corporate, $listKey)->exists()) {
                continue;
            }

            foreach (array_values($items) as $position => $item) {
                ContentItem::create([...$item, 'site' => Site::Corporate, 'list_key' => $listKey, 'sort_order' => $position]);
            }
        }

        if (! Service::withTrashed()->exists()) {
            foreach (array_values($corporate['services']) as $position => $service) {
                Service::create([...$service, 'sort_order' => $position, 'is_active' => true]);
            }
        }

        foreach ($corporate['brands'] as $position => $brand) {
            Brand::withTrashed()->firstOrCreate(['slug' => $brand['slug']], [...$brand, 'sort_order' => $position]);
        }

        foreach (Site::cases() as $site) {
            $content->flush($site);
        }
    }
}
