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

        $this->assertSame(123, ContentEntry::count());
        $this->assertSame(15, ContentEntry::where('type', 'image')->count());
        $this->assertSame(16, ContentItem::count());
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
        $this->assertSame(123, ContentEntry::count());
        $this->assertSame(2, ContentItem::where('list_key', 'about.leadership')->count());
        $this->assertSame(12, Service::count());
        $this->assertSame('Edited service', Service::orderBy('id')->value('title_en'));
        $this->assertSame(1, Brand::withTrashed()->count());
        $this->assertSame(0, Brand::count());
    }
}
