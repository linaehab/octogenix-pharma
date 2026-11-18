<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\ContentEntry;
use App\Models\ContentItem;
use Database\Seeders\ContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminContentTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/admin/content/corporate';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ContentSeeder::class);
    }

    private function actingAsEditor(): AdminUser
    {
        $admin = AdminUser::factory()->role(AdminRole::ContentEditor)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function publicTexts(): array
    {
        return $this->getJson('/api/v1/sites/corporate/content')->json('data.texts');
    }

    public function test_only_content_managers_can_edit_content(): void
    {
        foreach ([AdminRole::StoreManager, AdminRole::Support] as $role) {
            $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();

            $this->getJson(self::URL)->assertForbidden();
            $this->patchJson(self::URL.'/entries', ['entries' => ['hero.cta' => ['value_en' => 'x', 'value_ar' => 'y']]])
                ->assertForbidden();
        }
    }

    public function test_editor_sees_entries_grouped_by_section_and_all_lists(): void
    {
        $this->actingAsEditor();

        $data = $this->getJson(self::URL)->assertOk()->json('data');

        $groups = array_column($data['groups'], 'entries', 'group');
        $this->assertArrayHasKey('home.hero', $groups);
        $this->assertSame('hero.kicker', $groups['home.hero'][0]['key']);
        $this->assertSame(255, $groups['home.hero'][0]['max_length']);
        $this->assertSame(['home.hero_slides', 'about.journey', 'about.leadership'], array_column($data['lists'], 'key'));
        // Sections follow the order of the site; the sections of the final design are editable.
        $this->assertSame('shared.header', $data['groups'][0]['group']);
        foreach (['about.journey', 'about.ourValues', 'about.approach', 'about.bridge', 'about.focus', 'about.market', 'home.notes', 'home.story'] as $group) {
            $this->assertArrayHasKey($group, $groups);
        }
    }

    public function test_editing_texts_updates_the_public_payload_immediately(): void
    {
        $admin = $this->actingAsEditor();
        $this->publicTexts(); // warm the cache

        $this->patchJson(self::URL.'/entries', ['entries' => [
            'hero.titleFirst' => ['value_en' => 'Reliable Pharmaceutical', 'value_ar' => 'حلول دوائية'],
            'about.story' => ['value_en' => "Line one\nLine two", 'value_ar' => "سطر\nسطر"],
        ]])->assertOk();

        $texts = $this->publicTexts();
        $this->assertSame(['en' => 'Reliable Pharmaceutical', 'ar' => 'حلول دوائية'], $texts['hero.titleFirst']);
        $this->assertSame("Line one\nLine two", $texts['about.story']['en']);
        $this->assertSame($admin->id, ContentEntry::where('key', 'hero.titleFirst')->value('updated_by_admin_id'));
    }

    public function test_invalid_edits_are_rejected_and_nothing_is_saved(): void
    {
        $this->actingAsEditor();

        $this->patchJson(self::URL.'/entries', ['entries' => [
            'hero.cta' => ['value_en' => 'Valid', 'value_ar' => 'صحيح'],
            'hero.kicker' => ['value_en' => '<script>alert(1)</script>', 'value_ar' => 'نص'],
            'hero.titleFirst' => ['value_en' => str_repeat('a', 256), 'value_ar' => 'نص'],
            'hero.noteOne' => ['value_en' => 'Only English'],
            'contact.submit' => ['value_en' => 'Send', 'value_ar' => 'إرسال'],
            'page.about.image' => ['image_path' => '../../.env'],
        ]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'entries.hero.kicker.value_en',
                'entries.hero.titleFirst.value_en',
                'entries.hero.noteOne.value_ar',
                'entries.contact.submit',
                'entries.page.about.image.image_path',
            ]);

        $this->assertSame('About Us', ContentEntry::where('key', 'hero.cta')->value('value_en'));
    }

    public function test_image_entries_accept_uploaded_or_bundled_images_only(): void
    {
        Storage::fake('public');
        $this->actingAsEditor();

        $path = $this->postJson('/api/v1/admin/uploads/images', [
            'image' => $this->fakePng('photo.png'),
        ])->assertCreated()->json('data.path');

        $this->patchJson(self::URL.'/entries', ['entries' => [
            'page.about.image' => ['image_path' => $path, 'image_ar_path' => '/assets/images/ourbrand.jpg'],
        ]])->assertOk();

        $image = $this->getJson('/api/v1/sites/corporate/content')->json('data.images')['page.about.image'];
        $this->assertStringEndsWith($path, $image['url']);
        $this->assertSame('/assets/images/ourbrand.jpg', $image['url_ar']);

        $this->patchJson(self::URL.'/entries', ['entries' => [
            'page.about.image' => ['image_path' => 'uploads/images/2026/01/00000000-0000-0000-0000-000000000000.jpg'],
        ]])->assertUnprocessable();
    }

    public function test_list_items_can_be_added_up_to_the_maximum(): void
    {
        $this->actingAsEditor();
        $url = self::URL.'/lists/about.leadership/items';
        $leader = fn (string $name) => ['title_en' => $name, 'title_ar' => 'اسم', 'subtitle_en' => 'Director', 'subtitle_ar' => 'مدير'];

        $this->postJson($url, $leader('Dr. New Leader'))
            ->assertCreated()
            ->assertJsonPath('data.title.en', 'Dr. New Leader')
            ->assertJsonPath('data.sort_order', 3);

        $this->postJson($url, ['title_en' => 'Missing role', 'title_ar' => 'ناقص'])
            ->assertUnprocessable()->assertJsonValidationErrors(['subtitle_en', 'subtitle_ar']);

        $this->postJson($url, [...$leader('X'), 'icon' => '*'])
            ->assertUnprocessable()->assertJsonValidationErrors('icon');

        // Up to 12 leaders (3 seeded + 1 above + 8 more).
        foreach (range(1, 8) as $n) {
            $this->postJson($url, $leader("Leader {$n}"))->assertCreated();
        }
        $this->postJson($url, $leader('Thirteenth'))
            ->assertUnprocessable()->assertJsonValidationErrors('list');

        // Lists of the previous design no longer exist.
        $this->postJson(self::URL.'/lists/values.company/items', [])->assertNotFound();
        $this->postJson(self::URL.'/lists/unknown.list/items', [])->assertNotFound();
    }

    public function test_journey_years_are_added_validated_ordered_and_kept_between_six_and_twelve(): void
    {
        $this->actingAsEditor();
        $url = self::URL.'/lists/about.journey/items';
        $year = fn (string $y) => ['subtitle_en' => $y, 'title_en' => "Year {$y}", 'title_ar' => 'سنة', 'description_en' => 'Text.', 'description_ar' => 'نص.'];

        $this->postJson($url, $year('2028'))->assertCreated()
            ->assertJsonPath('data.year', '2028')->assertJsonPath('data.title.ar', 'سنة')->assertJsonPath('data.sort_order', 8);

        // A four-digit year; the Arabic subtitle column is not part of this list.
        $this->postJson($url, $year('28'))->assertUnprocessable()
            ->assertJsonPath('errors.subtitle_en.0', 'The year must be four digits, for example 2028.');
        $this->postJson($url, $year('year'))->assertUnprocessable()->assertJsonValidationErrors('subtitle_en');
        $this->postJson($url, [...$year('2029'), 'subtitle_ar' => '2029'])->assertUnprocessable()->assertJsonValidationErrors('subtitle_ar');
        $this->postJson($url, ['subtitle_en' => '2029', 'title_en' => 'Only English'])
            ->assertUnprocessable()->assertJsonValidationErrors(['title_ar', 'description_en', 'description_ar']);

        // At most 12 years.
        foreach (['2029', '2030', '2031'] as $y) {
            $this->postJson($url, $year($y))->assertCreated();
        }
        $this->postJson($url, $year('2032'))->assertUnprocessable()->assertJsonValidationErrors('list');

        // Reordered years reach the site in the new order.
        $ids = ContentItem::where('list_key', 'about.journey')->orderBy('sort_order')->pluck('id')->all();
        $this->putJson(self::URL.'/lists/about.journey/order', ['ids' => array_reverse($ids)])->assertNoContent();
        $years = $this->getJson('/api/v1/sites/corporate/content')->json('data.lists')['about.journey'];
        $this->assertSame(['2031', '2030', '2029', '2028', '2027'], array_slice(array_column($years, 'year'), 0, 5));

        // At least 6 published years: hiding or deleting below that is refused.
        $all = ContentItem::where('list_key', 'about.journey')->pluck('id')->all();
        foreach (array_slice($all, 0, 6) as $id) {
            $this->deleteJson("/api/v1/admin/content-items/{$id}")->assertNoContent();
        }
        $remaining = ContentItem::where('list_key', 'about.journey')->pluck('id')->all();
        $this->assertCount(6, $remaining);
        $this->patchJson("/api/v1/admin/content-items/{$remaining[0]}", ['is_active' => false])
            ->assertUnprocessable()->assertJsonValidationErrors('list');
        $this->deleteJson("/api/v1/admin/content-items/{$remaining[0]}")
            ->assertUnprocessable()->assertJsonValidationErrors('list');
    }

    public function test_lists_cannot_drop_below_their_minimum_active_items(): void
    {
        $this->actingAsEditor();
        $slides = ContentItem::where('list_key', 'home.hero_slides')->orderBy('id')->get();

        $this->deleteJson("/api/v1/admin/content-items/{$slides[0]->id}")->assertNoContent();
        $this->patchJson("/api/v1/admin/content-items/{$slides[1]->id}", ['is_active' => false])->assertOk();

        $this->deleteJson("/api/v1/admin/content-items/{$slides[2]->id}")
            ->assertUnprocessable()->assertJsonValidationErrors('list');
        $this->assertSame(2, ContentItem::where('list_key', 'home.hero_slides')->count());
    }

    public function test_reorder_requires_every_item_exactly_once(): void
    {
        $this->actingAsEditor();
        $ids = ContentItem::where('list_key', 'about.leadership')->orderBy('sort_order')->pluck('id')->all();
        $url = self::URL.'/lists/about.leadership/order';

        $this->putJson($url, ['ids' => [$ids[0], $ids[1]]])->assertUnprocessable();
        $this->putJson($url, ['ids' => array_reverse($ids)])->assertNoContent();

        $leaders = $this->getJson('/api/v1/sites/corporate/content')->json('data.lists')['about.leadership'];
        $this->assertSame(array_reverse($ids), array_column($leaders, 'id'));
    }
}
