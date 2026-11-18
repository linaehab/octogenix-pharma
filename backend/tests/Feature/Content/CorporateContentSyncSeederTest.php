<?php

namespace Tests\Feature\Content;

use App\Models\ContentEntry;
use App\Models\ContentItem;
use Database\Seeders\ContentSeeder;
use Database\Seeders\CorporateContentSyncSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CorporateContentSyncSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_stored_content_of_the_previous_design_is_brought_in_line_with_the_final_site(): void
    {
        $this->seed(ContentSeeder::class);
        // As in an existing database: earlier images and uploads, the old tagline, old slides,
        // an edited text and a text of the final site that has no row yet.
        ContentEntry::where('key', 'page.about.image')->update(['image_path' => 'uploads/images/2026/11/old.jpg', 'image_ar_path' => '/assets/images/old.jpg']);
        ContentEntry::where('key', 'contact.image')->update(['image_path' => '/assets/images/hero-partnership.jpg']);
        ContentEntry::where('key', 'header.tagline')->update(['value_en' => 'Trusted pharmaceutical Distribution Company', 'value_ar' => 'حلول صيدلانية موثوقة']);
        ContentEntry::where('key', 'hero.titleFirst')->update(['value_en' => 'Edited by an admin']);
        ContentEntry::where('key', 'bridge.title')->delete();
        ContentItem::where('list_key', 'about.journey')->delete();
        ContentItem::where('list_key', 'home.hero_slides')->orderBy('sort_order')->first()->update(['image_path' => '/assets/images/factory-worker-packaging-boxes.jpg']);
        $old = ContentEntry::create(['site' => 'corporate', 'key' => 'about.aside', 'group' => 'about.intro', 'type' => 'textarea', 'value_en' => 'Old', 'value_ar' => 'قديم']);

        $this->seed(CorporateContentSyncSeeder::class);

        $entry = fn (string $key) => ContentEntry::where('key', $key)->first();
        $this->assertSame('/assets/images/corporate-v3/banner-about.webp', $entry('page.about.image')->image_path);
        $this->assertNull($entry('page.about.image')->image_ar_path);
        $this->assertSame('/assets/images/corporate-v2/contact-team.jpg', $entry('contact.image')->image_path);
        $this->assertSame(['A Trusted Pharmaceutical Distribution Company', 'شركة موثوقة في توزيع المنتجات الدوائية'],
            [$entry('header.tagline')->value_en, $entry('header.tagline')->value_ar]);
        $this->assertSame('Edited by an admin', $entry('hero.titleFirst')->value_en, 'Saved texts are kept.');
        $this->assertNotEmpty($entry('bridge.title')->value_ar);
        $this->assertSame(['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027'],
            ContentItem::where('list_key', 'about.journey')->orderBy('sort_order')->pluck('subtitle_en')->all());
        $this->assertSame(CorporateContentSyncSeeder::HERO_SLIDES,
            ContentItem::where('list_key', 'home.hero_slides')->orderBy('sort_order')->pluck('image_path')->all());
        $this->assertTrue($old->fresh()->exists(), 'Rows of the previous design are only removed after review.');

        // What the website receives.
        $data = $this->getJson('/api/v1/sites/corporate/content')->json('data');
        $this->assertSame('/assets/images/corporate-v3/banner-about.webp', $data['images']['page.about.image']['url_ar']);
        $this->assertSame('شركة موثوقة في توزيع المنتجات الدوائية', $data['texts']['header.tagline']['ar']);

        // Running it again changes nothing.
        $before = ContentEntry::orderBy('id')->get(['key', 'value_en', 'value_ar', 'image_path', 'updated_at'])->toArray();
        $this->seed(CorporateContentSyncSeeder::class);
        $this->assertSame($before, ContentEntry::orderBy('id')->get(['key', 'value_en', 'value_ar', 'image_path', 'updated_at'])->toArray());
    }

    public function test_journey_years_edited_in_the_dashboard_are_never_reseeded_or_duplicated(): void
    {
        $this->seed(ContentSeeder::class);
        $first = ContentItem::where('list_key', 'about.journey')->orderBy('sort_order')->first();
        $first->update(['title_en' => 'Edited by an admin', 'is_active' => false]);
        ContentItem::where('list_key', 'about.journey')->orderBy('sort_order', 'desc')->first()->delete();

        $this->seed(CorporateContentSyncSeeder::class);
        $this->seed(CorporateContentSyncSeeder::class);
        $this->seed(ContentSeeder::class);

        $this->assertSame(7, ContentItem::where('list_key', 'about.journey')->count());
        $this->assertSame('Edited by an admin', $first->fresh()->title_en);
        $this->assertFalse($first->fresh()->is_active);
    }
}
