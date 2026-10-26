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
        $this->assertSame(['home.hero_slides', 'values.core', 'values.company', 'about.leadership'], array_column($data['lists'], 'key'));
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
            'quality.image' => ['image_path' => '../../.env'],
        ]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'entries.hero.kicker.value_en',
                'entries.hero.titleFirst.value_en',
                'entries.hero.noteOne.value_ar',
                'entries.contact.submit',
                'entries.quality.image.image_path',
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
            'quality.image' => ['image_path' => $path, 'image_ar_path' => '/assets/images/ourbrand.jpg'],
        ]])->assertOk();

        $image = $this->getJson('/api/v1/sites/corporate/content')->json('data.images')['quality.image'];
        $this->assertStringEndsWith($path, $image['url']);
        $this->assertSame('/assets/images/ourbrand.jpg', $image['url_ar']);

        $this->patchJson(self::URL.'/entries', ['entries' => [
            'quality.image' => ['image_path' => 'uploads/images/2026/01/00000000-0000-0000-0000-000000000000.jpg'],
        ]])->assertUnprocessable();
    }

    public function test_list_items_can_be_added_up_to_the_maximum(): void
    {
        $this->actingAsEditor();
        $url = self::URL.'/lists/values.company/items';

        $this->postJson($url, ['title_en' => 'Care', 'title_ar' => 'رعاية', 'description_en' => 'We care.', 'description_ar' => 'نهتم.'])
            ->assertCreated()
            ->assertJsonPath('data.title.en', 'Care')
            ->assertJsonPath('data.sort_order', 5);

        $this->postJson($url, ['title_en' => 'Missing description', 'title_ar' => 'ناقص'])
            ->assertUnprocessable()->assertJsonValidationErrors(['description_en', 'description_ar']);

        $this->postJson($url, ['title_en' => 'X', 'title_ar' => 'س', 'description_en' => 'd', 'description_ar' => 'د', 'icon' => '*'])
            ->assertUnprocessable()->assertJsonValidationErrors('icon');

        $this->postJson($url, ['title_en' => 'Seven', 'title_ar' => 'س', 'description_en' => 'd', 'description_ar' => 'د'])
            ->assertCreated();
        $this->postJson($url, ['title_en' => 'Eight', 'title_ar' => 'س', 'description_en' => 'd', 'description_ar' => 'د'])
            ->assertCreated();
        $this->postJson($url, ['title_en' => 'Nine', 'title_ar' => 'س', 'description_en' => 'd', 'description_ar' => 'د'])
            ->assertUnprocessable()->assertJsonValidationErrors('list');

        $this->postJson(self::URL.'/lists/unknown.list/items', [])->assertNotFound();
    }

    public function test_core_values_only_accept_the_icons_the_page_can_draw(): void
    {
        $this->actingAsEditor();
        $url = self::URL.'/lists/values.core/items';

        $this->postJson($url, ['title_en' => 'Care', 'title_ar' => 'رعاية', 'icon' => '★'])
            ->assertUnprocessable()->assertJsonValidationErrors('icon');
        $this->postJson($url, ['title_en' => 'Care', 'title_ar' => 'رعاية', 'icon' => '◈', 'image_path' => '/assets/images/jovie.jpg'])
            ->assertUnprocessable()->assertJsonValidationErrors('image_path');
        $this->postJson($url, ['title_en' => 'Care', 'title_ar' => 'رعاية', 'icon' => '◈'])
            ->assertCreated()->assertJsonPath('data.icon', '◈');
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
