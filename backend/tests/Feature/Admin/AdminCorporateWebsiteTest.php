<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminAuditLog;
use App\Models\AdminUser;
use App\Models\Brand;
use App\Models\ContentItem;
use App\Models\Product;
use App\Models\Service;
use App\Services\SettingsService;
use Database\Seeders\ContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Phase 11.6: the corporate website section of the dashboard — brands, services, company
 * information and page content — its permissions, ordering, publishing and audit log, and what
 * the public corporate API then serves. Test database only.
 */
class AdminCorporateWebsiteTest extends TestCase
{
    use RefreshDatabase;

    private function as(AdminRole $role): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function brand(array $overrides = []): array
    {
        return array_merge([
            'slug' => 'nova-pharma', 'name_en' => 'Nova Pharma', 'name_ar' => 'نوفا فارما',
            'short_description_en' => 'Respiratory care.', 'short_description_ar' => 'رعاية الجهاز التنفسي.',
            'logo_path' => '/assets/images/jovie.jpg', 'link_type' => 'external', 'link_url' => 'https://nova.example.com',
            'is_active' => true,
        ], $overrides);
    }

    private function service(string $category, string $title, array $overrides = []): array
    {
        return array_merge([
            'category' => $category, 'title_en' => $title, 'title_ar' => "خدمة {$title}",
            'description_en' => "{$title} description.", 'description_ar' => 'وصف الخدمة.', 'is_active' => true,
        ], $overrides);
    }

    private function publicBrands(): array
    {
        $this->app['auth']->forgetGuards();

        return array_column($this->getJson('/api/v1/brands')->assertOk()->json('data'), 'slug');
    }

    public function test_roles_that_manage_content_reach_the_section_and_others_do_not(): void
    {
        foreach (['/api/v1/admin/brands', '/api/v1/admin/services', '/api/v1/admin/company-info'] as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
        foreach ([AdminRole::SuperAdmin, AdminRole::ContentManager, AdminRole::ContentEditor] as $role) {
            $this->as($role);
            foreach (['/api/v1/admin/brands', '/api/v1/admin/services', '/api/v1/admin/company-info'] as $url) {
                $this->getJson($url)->assertOk();
            }
        }
        foreach ([AdminRole::StoreManager, AdminRole::ProductManager, AdminRole::OrderManager, AdminRole::Support] as $role) {
            $this->as($role);
            $this->getJson('/api/v1/admin/brands')->assertForbidden();
            $this->postJson('/api/v1/admin/brands', $this->brand())->assertForbidden();
            $this->putJson('/api/v1/admin/services/order', ['category' => 'customers', 'ids' => [1]])->assertForbidden();
            $this->patchJson('/api/v1/admin/company-info', ['settings' => ['contact.email' => 'x@example.com']])->assertForbidden();
        }
        // The content manager still cannot reach store settings.
        $this->as(AdminRole::ContentManager);
        $this->getJson('/api/v1/admin/settings')->assertForbidden();
    }

    public function test_a_new_brand_is_published_ordered_edited_and_audited(): void
    {
        $jovie = Brand::factory()->create(['slug' => 'jovie', 'is_active' => true, 'sort_order' => 0]);
        $admin = $this->as(AdminRole::ContentManager);

        $id = $this->postJson('/api/v1/admin/brands', $this->brand())->assertCreated()
            ->assertJsonPath('data.sort_order', 1)->assertJsonPath('data.products_count', 0)->json('data.id');
        $this->assertSame(['jovie', 'nova-pharma'], $this->publicBrands());
        $created = AdminAuditLog::where('action', 'website.brand_created')->sole();
        $this->assertSame([$admin->id, 'website', 'Nova Pharma'], [$created->admin_user_id, $created->category, $created->subject_label]);
        $this->assertSame('نوفا فارما', $created->changes['name_ar']['to']);

        // Reorder: Nova first, on the public site too.
        $this->as(AdminRole::ContentManager);
        $this->putJson('/api/v1/admin/brands/order', ['ids' => [$id, $jovie->id]])->assertOk()
            ->assertJsonPath('data.0.id', $id);
        $this->assertSame(['nova-pharma', 'jovie'], $this->publicBrands());
        $this->assertSame(1, AdminAuditLog::where('action', 'website.brands_reordered')->count());
        $this->as(AdminRole::ContentManager);
        $this->putJson('/api/v1/admin/brands/order', ['ids' => [$id]])->assertUnprocessable()->assertJsonValidationErrors('ids');

        // Edit with an image change (before/after in the audit log), then deactivate: gone from the public list.
        $updatedAt = $this->getJson("/api/v1/admin/brands/{$id}")->json('data.updated_at');
        $this->travel(2)->seconds();
        $this->patchJson("/api/v1/admin/brands/{$id}", ['name_ar' => 'نوفا', 'logo_path' => '/assets/images/mom.jpg', 'expected_updated_at' => $updatedAt])
            ->assertOk()->assertJsonPath('data.name_ar', 'نوفا');
        $updated = AdminAuditLog::where('action', 'website.brand_updated')->sole();
        $this->assertEquals(['from' => '/assets/images/jovie.jpg', 'to' => '/assets/images/mom.jpg'], $updated->changes['logo_path']);
        // A stale form changes nothing.
        $this->patchJson("/api/v1/admin/brands/{$id}", ['name_en' => 'Stale', 'expected_updated_at' => $updatedAt])
            ->assertStatus(409)->assertJsonPath('current.name_ar', 'نوفا');

        $this->patchJson("/api/v1/admin/brands/{$id}", ['is_active' => false])->assertOk();
        $this->assertSame(1, AdminAuditLog::where('action', 'website.brand_deactivated')->count());
        $this->assertSame(['jovie'], $this->publicBrands());
        $this->as(AdminRole::ContentManager);
        $this->patchJson("/api/v1/admin/brands/{$id}", ['is_active' => true])->assertOk();
        $this->assertSame(1, AdminAuditLog::where('action', 'website.brand_activated')->count());

        // The public API serves both languages.
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/brands/nova-pharma')->assertOk()
            ->assertJsonPath('data.name.ar', 'نوفا')->assertJsonPath('data.name.en', 'Nova Pharma')
            ->assertJsonPath('data.link.url', 'https://nova.example.com');
    }

    public function test_brands_with_store_products_are_deactivated_not_deleted(): void
    {
        $jovie = Brand::factory()->create(['slug' => 'jovie', 'is_active' => true]);
        Product::factory()->create(['brand_id' => $jovie->id]);
        $other = Brand::factory()->create(['slug' => 'old-brand']);
        $this->as(AdminRole::SuperAdmin);

        $this->assertSame(1, $this->getJson("/api/v1/admin/brands/{$jovie->id}")->json('data.products_count'));
        $this->deleteJson("/api/v1/admin/brands/{$jovie->id}")->assertUnprocessable()->assertJsonValidationErrors('brand');
        $this->assertNotSoftDeleted($jovie);

        $this->deleteJson("/api/v1/admin/brands/{$other->id}")->assertNoContent();
        $this->assertSoftDeleted($other);
        $this->assertSame(1, AdminAuditLog::where('action', 'website.brand_deleted')->count());
        // A deleted brand's slug is never reused.
        $this->postJson('/api/v1/admin/brands', $this->brand(['slug' => 'old-brand']))->assertUnprocessable()->assertJsonValidationErrors('slug');
    }

    public function test_services_are_managed_per_tab_ordered_and_published(): void
    {
        $this->as(AdminRole::ContentEditor);
        $a = $this->postJson('/api/v1/admin/services', $this->service('customers', 'Distribution'))->assertCreated()->json('data');
        $b = $this->postJson('/api/v1/admin/services', $this->service('customers', 'Storage'))->assertCreated()->json('data');
        $s = $this->postJson('/api/v1/admin/services', $this->service('suppliers', 'Registration'))->assertCreated()->json('data');
        $this->assertSame([1, 2, 1], [$a['sort_order'], $b['sort_order'], $s['sort_order']]);
        $this->assertSame(3, AdminAuditLog::where('action', 'website.service_created')->count());

        $this->putJson('/api/v1/admin/services/order', ['category' => 'customers', 'ids' => [$b['id'], $a['id']]])->assertOk()
            ->assertJsonPath('data.0.title_en', 'Storage');
        // Only the services of that tab, each exactly once.
        $this->putJson('/api/v1/admin/services/order', ['category' => 'customers', 'ids' => [$b['id'], $s['id']]])->assertUnprocessable();

        $this->patchJson("/api/v1/admin/services/{$a['id']}", ['is_active' => false])->assertOk();
        $this->assertSame(1, AdminAuditLog::where('action', 'website.service_deactivated')->count());
        $this->patchJson("/api/v1/admin/services/{$s['id']}", ['image_path' => '/assets/images/jovie.jpg'])
            ->assertUnprocessable()->assertJsonValidationErrors(['image_alt_en', 'image_alt_ar']);

        $this->app['auth']->forgetGuards();
        $public = $this->getJson('/api/v1/services')->assertOk()->json('data');
        $this->assertSame(['Storage'], array_column(array_column($public['customers'], 'title'), 'en'));
        $this->assertSame(['خدمة Registration'], array_column(array_column($public['suppliers'], 'title'), 'ar'));

        $this->as(AdminRole::ContentEditor);
        $this->deleteJson("/api/v1/admin/services/{$b['id']}")->assertNoContent();
        $this->assertSoftDeleted(Service::find($b['id']) ?? Service::withTrashed()->find($b['id']));
        $this->assertSame(1, AdminAuditLog::where('action', 'website.service_deleted')->count());
    }

    public function test_company_information_and_social_links(): void
    {
        $admin = $this->as(AdminRole::ContentManager);
        $data = collect($this->getJson('/api/v1/admin/company-info')->assertOk()->json('data'))->pluck('value', 'key');
        $this->assertSame(['contact.phones', 'contact.email', 'social.facebook', 'social.instagram', 'social.linkedin'], $data->keys()->all());
        $this->assertNull($data['social.facebook']);

        $this->patchJson('/api/v1/admin/company-info', ['settings' => [
            'contact.phones' => ['+201000000001'], 'contact.email' => 'hello@octogenix.test', 'social.linkedin' => 'https://www.linkedin.com/company/octogenix',
        ], 'expected' => ['contact.email' => $data['contact.email']]])->assertOk();

        $log = AdminAuditLog::where('action', 'website.company_info_updated')->sole();
        $this->assertSame($admin->id, $log->admin_user_id);
        $this->assertSame('hello@octogenix.test', $log->changes['contact.email']['to']);

        // Validation: https only, phone format, only these keys, stale values.
        $this->patchJson('/api/v1/admin/company-info', ['settings' => ['social.facebook' => 'http://facebook.com/x']])
            ->assertUnprocessable()->assertJsonValidationErrors('settings.social.facebook');
        $this->patchJson('/api/v1/admin/company-info', ['settings' => ['contact.phones' => ['call us']]])
            ->assertUnprocessable()->assertJsonValidationErrors('settings.contact.phones');
        $this->patchJson('/api/v1/admin/company-info', ['settings' => ['store.enabled' => true]])
            ->assertUnprocessable()->assertJsonValidationErrors('settings');
        $this->patchJson('/api/v1/admin/company-info', ['settings' => ['contact.email' => 'x@octogenix.test'], 'expected' => ['contact.email' => $data['contact.email']]])
            ->assertStatus(409);

        $this->app['auth']->forgetGuards();
        $public = $this->getJson('/api/v1/settings')->assertOk()->json('data');
        $this->assertSame(['+201000000001'], $public['contact.phones']);
        $this->assertSame('hello@octogenix.test', $public['contact.email']);
        $this->assertSame('https://www.linkedin.com/company/octogenix', $public['social.linkedin']);
        $this->assertNull($public['social.facebook']);
        $this->assertArrayNotHasKey('contact.notification_recipients', $public);
    }

    public function test_a_settings_cache_built_before_new_keys_existed_does_not_break_the_page(): void
    {
        // As on a server that cached its settings before Phase 11.6 added the social links.
        Cache::forever(SettingsService::CACHE_KEY, ['contact.phones' => ['+201090075087'], 'contact.email' => 'info@octogenixpharma.com']);
        $this->as(AdminRole::ContentManager);

        $data = collect($this->getJson('/api/v1/admin/company-info')->assertOk()->json('data'))->pluck('value', 'key');
        $this->assertNotEmpty($data['contact.phones'], 'Rebuilt from the database and the registry defaults.');
        $this->assertNull($data['social.linkedin']);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/settings')->assertOk()->assertJsonPath('data.social\.facebook', null);
    }

    public function test_page_content_edits_reach_the_public_site_in_both_languages_and_are_audited(): void
    {
        $this->seed(ContentSeeder::class);
        $admin = $this->as(AdminRole::ContentManager);

        $this->patchJson('/api/v1/admin/content/corporate/entries', ['entries' => [
            'contact.address' => ['value_en' => '12 Nile St, Cairo', 'value_ar' => '12 شارع النيل، القاهرة'],
            'contact.image' => ['image_path' => '/assets/images/mom.jpg'],
        ]])->assertOk();

        $log = AdminAuditLog::where('action', 'website.content_updated')->sole();
        $this->assertSame([$admin->id, 'website'], [$log->admin_user_id, $log->category]);
        $this->assertSame('12 شارع النيل، القاهرة', $log->changes['contact.address.value_ar']['to']);
        $this->assertSame('/assets/images/mom.jpg', $log->changes['contact.image.image_path']['to']);

        $this->app['auth']->forgetGuards();
        $public = $this->getJson('/api/v1/sites/corporate/content')->assertOk()->json('data');
        $this->assertSame(['en' => '12 Nile St, Cairo', 'ar' => '12 شارع النيل، القاهرة'], [
            'en' => $public['texts']['en']['contact.address'] ?? $public['texts']['contact.address']['en'] ?? null,
            'ar' => $public['texts']['ar']['contact.address'] ?? $public['texts']['contact.address']['ar'] ?? null,
        ]);

        // List items: deactivating and reordering are audited too.
        $this->as(AdminRole::ContentManager);
        $items = ContentItem::query()->where('list_key', 'values.company')->orderBy('sort_order')->pluck('id')->all();
        $this->patchJson("/api/v1/admin/content-items/{$items[0]}", ['is_active' => false])->assertOk();
        $this->putJson('/api/v1/admin/content/corporate/lists/values.company/order', ['ids' => array_reverse($items)])->assertNoContent();
        $this->assertSame(1, AdminAuditLog::where('action', 'website.list_item_deactivated')->count());
        $this->assertSame(1, AdminAuditLog::where('action', 'website.list_reordered')->count());
    }

    public function test_content_managers_upload_images_and_unsafe_files_are_refused(): void
    {
        Storage::fake('public');
        $this->as(AdminRole::ContentManager);

        $path = $this->postJson('/api/v1/admin/uploads/images', ['image' => $this->fakePng('logo.png')])
            ->assertCreated()->json('data.path');
        Storage::disk('public')->assertExists($path);
        $this->postJson('/api/v1/admin/brands', $this->brand(['logo_path' => $path]))->assertCreated()
            ->assertJsonPath('data.logo_path', $path);

        $this->postJson('/api/v1/admin/uploads/images', ['image' => UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')])
            ->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->postJson('/api/v1/admin/uploads/images', ['image' => $this->fakePng('huge.png', reportedKilobytes: 6000)])
            ->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->postJson('/api/v1/admin/brands', $this->brand(['slug' => 'bad', 'logo_path' => '../../etc/passwd']))
            ->assertUnprocessable()->assertJsonValidationErrors('logo_path');

        $this->as(AdminRole::Support);
        $this->postJson('/api/v1/admin/uploads/images', ['image' => $this->fakePng()])->assertForbidden();
    }
}
