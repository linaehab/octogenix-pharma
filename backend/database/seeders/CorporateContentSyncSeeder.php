<?php

namespace Database\Seeders;

use App\Content\ContentRegistry;
use App\Enums\ContentType;
use App\Enums\Site;
use App\Models\ContentEntry;
use App\Models\ContentItem;
use App\Services\ContentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Brings the stored corporate content in line with the final Octogenix website (approved by the
 * client on 2026-11-17). Run once per environment:
 *
 *     php artisan db:seed --class=CorporateContentSyncSeeder
 *
 * - Every text and image of the registry gets its row (texts keep any value already saved).
 * - Images are set to the photographs the final site uses, replacing earlier ones and uploads.
 * - The header tagline is set to the approved wording.
 * - The top section photographs (home.hero_slides) become the final site's three photographs.
 * - The journey years (about.journey) are added with the site's texts, only while that list is
 *   empty: years an admin has added, edited, ordered or hidden are never touched.
 * - Group and type of each row follow the registry.
 *
 * It only updates and inserts: rows the final site no longer uses are left for a reviewed delete,
 * and nothing of the Jovie store is touched. Running it again changes nothing.
 */
class CorporateContentSyncSeeder extends Seeder
{
    /** Approved wording (2026-11-17). */
    public const TAGLINE = [
        'en' => 'A Trusted Pharmaceutical Distribution Company',
        'ar' => 'شركة موثوقة في توزيع المنتجات الدوائية',
    ];

    public const HERO_SLIDES = [
        '/assets/images/corporate-v3/hero-hands-capsules.webp',
        '/assets/images/corporate-v3/hero-hands-care.webp',
        '/assets/images/corporate-v3/hero-hands-tablets.webp',
    ];

    public function run(ContentRegistry $registry, ContentService $content): void
    {
        $site = Site::Corporate;

        DB::transaction(function () use ($registry, $site) {
            $rows = ContentEntry::query()->where('site', $site->value)->get()->keyBy('key');

            foreach ($registry->entries($site) as $key => $definition) {
                $row = $rows->get($key) ?? new ContentEntry(['site' => $site->value, 'key' => $key]);
                $row->group = $definition['group'];
                $row->type = $definition['type'];

                if ($definition['type'] === ContentType::Image->value) {
                    $row->image_path = $definition['image'];
                    $row->image_ar_path = null;
                } elseif ($key === 'header.tagline') {
                    $row->value_en = self::TAGLINE['en'];
                    $row->value_ar = self::TAGLINE['ar'];
                } elseif (! $row->exists) {
                    $row->value_en = $definition['en'];
                    $row->value_ar = $definition['ar'];
                }

                if ($row->isDirty()) {
                    $row->save();
                }
            }

            $slides = ContentItem::query()->inList($site, 'home.hero_slides')->ordered()->get()->values();
            foreach (self::HERO_SLIDES as $position => $path) {
                $slide = $slides->get($position);
                if ($slide === null) {
                    ContentItem::create([
                        'site' => $site, 'list_key' => 'home.hero_slides', 'image_path' => $path,
                        'sort_order' => $position, 'is_active' => true,
                    ]);

                    continue;
                }
                $slide->fill(['image_path' => $path, 'sort_order' => $position, 'is_active' => true]);
                if ($slide->isDirty()) {
                    $slide->save();
                }
            }

            if (! ContentItem::query()->inList($site, 'about.journey')->exists()) {
                $journey = (require database_path('seeders/data/corporate.php'))['lists']['about.journey'];
                foreach (array_values($journey) as $position => $stop) {
                    ContentItem::create([...$stop, 'site' => $site, 'list_key' => 'about.journey', 'sort_order' => $position, 'is_active' => true]);
                }
            }
        });

        $content->flush($site);
    }
}
