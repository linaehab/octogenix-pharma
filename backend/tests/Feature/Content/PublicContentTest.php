<?php

namespace Tests\Feature\Content;

use App\Models\Brand;
use App\Models\ContentItem;
use App\Models\Service;
use Database\Seeders\ContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_corporate_content_has_both_languages_images_and_lists(): void
    {
        $this->seed(ContentSeeder::class);

        $data = $this->getJson('/api/v1/sites/corporate/content')->assertOk()->json('data');

        $this->assertSame('Trusted Pharmaceutical', $data['texts']['hero.titleFirst']['en']);
        $this->assertNotEmpty($data['texts']['hero.titleFirst']['ar']);
        $this->assertSame('A Trusted Pharmaceutical Distribution Company', $data['texts']['header.tagline']['en']);
        $this->assertSame('شركة موثوقة في توزيع المنتجات الدوائية', $data['texts']['header.tagline']['ar']);
        // The sections of the final site are editable: journey, values, approach, focus, market, statement.
        foreach (['journey.title', 'ourValues.trustText', 'approach.commercial', 'focus.infant.text', 'market.clinics', 'bridge.title', 'hero.tagMarketing'] as $key) {
            $this->assertNotEmpty($data['texts'][$key]['en'], $key);
            $this->assertNotEmpty($data['texts'][$key]['ar'], $key);
        }
        $this->assertSame(
            ['url' => '/assets/images/corporate-v3/banner-about.webp', 'url_ar' => '/assets/images/corporate-v3/banner-about.webp'],
            $data['images']['page.about.image']
        );
        $images = ['story.image', 'values.teamImage', 'bridge.image', 'contact.image', 'page.about.image', 'page.services.image', 'page.brands.image', 'page.contact.image'];
        $this->assertEqualsCanonicalizing($images, array_keys($data['images']));
        $this->assertSame(['home.hero_slides', 'about.journey', 'about.leadership'], array_keys($data['lists']));
        $this->assertCount(8, $data['lists']['about.journey']);
        $this->assertSame(['id', 'year', 'title', 'description'], array_keys($data['lists']['about.journey'][0]));
        $this->assertSame('2020', $data['lists']['about.journey'][0]['year']);
        $this->assertNotEmpty($data['lists']['about.journey'][0]['title']['ar']);
        $this->assertArrayNotHasKey('journey.2020.title', $data['texts'], 'The years are a list, not fixed texts.');
        $this->assertCount(3, $data['lists']['home.hero_slides']);
        $this->assertSame(['id', 'image'], array_keys($data['lists']['home.hero_slides'][0]));
        $this->assertSame(['id', 'title', 'subtitle'], array_keys($data['lists']['about.leadership'][0]));

        // Content of the previous design is no longer part of the payload.
        foreach (['about.aside', 'companyImpact.services', 'quality.description', 'values.coreTitle'] as $key) {
            $this->assertArrayNotHasKey($key, $data['texts']);
        }

        // Fixed UI labels stay in Angular and are not part of the editable payload.
        $this->assertArrayNotHasKey('contact.submit', $data['texts']);
        $this->assertArrayNotHasKey('header.home', $data['texts']);
    }

    public function test_inactive_list_items_are_hidden_and_order_is_respected(): void
    {
        ContentItem::factory()->create(['title_en' => 'Second', 'sort_order' => 2]);
        ContentItem::factory()->create(['title_en' => 'First', 'sort_order' => 1]);
        ContentItem::factory()->create(['title_en' => 'Hidden', 'is_active' => false]);

        $items = $this->getJson('/api/v1/sites/corporate/content')->json('data')['lists']['about.leadership'];

        $this->assertSame(['First', 'Second'], array_column(array_column($items, 'title'), 'en'));
    }

    public function test_jovie_site_exists_but_is_empty_until_its_pages_are_built(): void
    {
        $this->getJson('/api/v1/sites/jovie/content')
            ->assertOk()
            ->assertExactJson(['data' => ['texts' => [], 'images' => [], 'lists' => []]]);
    }

    public function test_unknown_site_is_not_found(): void
    {
        $this->getJson('/api/v1/sites/admin/content')->assertNotFound();
    }

    public function test_brands_endpoint_lists_only_active_brands_in_order(): void
    {
        $this->seed(ContentSeeder::class);
        Brand::factory()->inactive()->create(['slug' => 'hidden']);
        Brand::factory()->create(['slug' => 'second', 'sort_order' => 5]);

        $this->getJson('/api/v1/brands')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.slug', 'jovie')
            ->assertJsonPath('data.0.name.en', 'Jovie')
            // The Jovie card shows the official logo; no earlier photograph or draft texts.
            ->assertJsonPath('data.0.logo_url', '/assets/images/jovie/logo-official-yellow.png')
            ->assertJsonPath('data.0.image_url', null)
            ->assertJsonPath('data.0.hover_image_url', null)
            ->assertJsonPath('data.0.label', ['en' => null, 'ar' => null])
            ->assertJsonPath('data.0.short_description', ['en' => null, 'ar' => null])
            ->assertJsonPath('data.0.cta_label.en', 'Contact us about our portfolio')
            ->assertJsonPath('data.0.link', ['type' => 'internal', 'url' => '/contact'])
            ->assertJsonPath('data.0.has_store', true)
            ->assertJsonPath('data.1.slug', 'second');

        $this->getJson('/api/v1/brands/jovie')->assertOk()->assertJsonPath('data.slug', 'jovie');
        $this->getJson('/api/v1/brands/hidden')->assertNotFound();
    }

    public function test_services_are_grouped_by_tab_in_display_order(): void
    {
        $this->seed(ContentSeeder::class);
        Service::factory()->inactive()->create();

        $data = $this->getJson('/api/v1/services')->assertOk()->json('data');

        $this->assertSame(['customers', 'suppliers'], array_keys($data));
        $this->assertCount(5, $data['customers']);
        $this->assertCount(7, $data['suppliers']);
        $this->assertSame('Contracting and Documentation', $data['customers'][0]['title']['en']);
        $this->assertSame(['id', 'title', 'description'], array_keys($data['suppliers'][1]));
        $this->assertSame(0, Service::whereNotNull('image_path')->orWhereNotNull('hover_image_path')->count());
    }
}
