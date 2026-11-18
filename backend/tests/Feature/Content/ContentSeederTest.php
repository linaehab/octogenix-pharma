<?php

namespace Tests\Feature\Content;

use App\Models\Brand;
use App\Models\ContentEntry;
use App\Models\ContentItem;
use App\Models\Service;
use Database\Seeders\ContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_the_current_site_content(): void
    {
        $this->seed(ContentSeeder::class);

        $this->assertSame(156, ContentEntry::count());
        $this->assertSame(8, ContentEntry::where('type', 'image')->count());
        // Three top section photographs, eight journey years and three leaders.
        $this->assertSame(14, ContentItem::count());
        $this->assertSame(['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027'],
            ContentItem::where('list_key', 'about.journey')->orderBy('sort_order')->pluck('subtitle_en')->all());
        $this->assertSame(
            ['/assets/images/corporate-v3/hero-hands-capsules.webp', '/assets/images/corporate-v3/hero-hands-care.webp', '/assets/images/corporate-v3/hero-hands-tablets.webp'],
            ContentItem::where('list_key', 'home.hero_slides')->orderBy('sort_order')->pluck('image_path')->all(),
        );
        $this->assertSame(12, Service::where('is_active', true)->count());
        $this->assertTrue(Brand::where('slug', 'jovie')->where('has_store', true)->exists());

        // Every text entry has both languages.
        $this->assertSame(0, ContentEntry::where('type', '!=', 'image')
            ->where(fn ($q) => $q->whereNull('value_en')->orWhereNull('value_ar')->orWhere('value_ar', ''))
            ->count());
    }

    public function test_reseeding_never_overwrites_admin_edits_or_duplicates_rows(): void
    {
        $this->seed(ContentSeeder::class);
        ContentEntry::where('key', 'hero.titleFirst')->update(['value_en' => 'Edited']);
        ContentItem::where('list_key', 'about.leadership')->first()->delete();
        Service::first()->update(['title_en' => 'Edited service']);
        Brand::where('slug', 'jovie')->first()->delete();

        $this->seed(ContentSeeder::class);

        $this->assertSame('Edited', ContentEntry::where('key', 'hero.titleFirst')->value('value_en'));
        $this->assertSame(156, ContentEntry::count());
        $this->assertSame(2, ContentItem::where('list_key', 'about.leadership')->count());
        $this->assertSame(12, Service::count());
        $this->assertSame('Edited service', Service::orderBy('id')->value('title_en'));
        $this->assertSame(1, Brand::withTrashed()->count());
        $this->assertSame(0, Brand::count());
    }
}
