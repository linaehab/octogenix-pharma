<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\Brand;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBrandsAndServicesTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsEditor(): void
    {
        $this->actingAs(AdminUser::factory()->role(AdminRole::ContentEditor)->create(), 'admin')->fromFrontend();
    }

    private function brandPayload(array $overrides = []): array
    {
        return array_merge([
            'slug' => 'New-Brand',
            'name_en' => 'New Brand',
            'name_ar' => 'علامة جديدة',
            'short_description_en' => 'A new brand.',
            'short_description_ar' => 'علامة جديدة.',
            'image_path' => '/assets/images/jovie.jpg',
            'link_type' => 'external',
            'link_url' => 'https://brand.example.com',
            'is_active' => true,
        ], $overrides);
    }

    public function test_only_content_managers_can_manage_brands_and_services(): void
    {
        $brand = Brand::factory()->create();
        $service = Service::factory()->create();
        $this->actingAs(AdminUser::factory()->role(AdminRole::StoreManager)->create(), 'admin')->fromFrontend();

        $this->getJson('/api/v1/admin/brands')->assertForbidden();
        $this->patchJson("/api/v1/admin/brands/{$brand->id}", ['is_active' => false])->assertForbidden();
        $this->getJson('/api/v1/admin/services')->assertForbidden();
        $this->deleteJson("/api/v1/admin/services/{$service->id}")->assertForbidden();
    }

    public function test_editor_creates_a_brand_without_code_changes(): void
    {
        $this->actingAsEditor();

        $this->postJson('/api/v1/admin/brands', $this->brandPayload())
            ->assertCreated()
            ->assertJsonPath('data.slug', 'new-brand')
            ->assertJsonPath('data.image_url', '/assets/images/jovie.jpg');

        $this->getJson('/api/v1/brands/new-brand')->assertOk()->assertJsonPath('data.name.ar', 'علامة جديدة');
    }

    public function test_brand_validation(): void
    {
        $this->actingAsEditor();
        Brand::factory()->create(['slug' => 'taken']);

        $this->postJson('/api/v1/admin/brands', $this->brandPayload([
            'slug' => 'Not a slug!', 'name_en' => '<b>Bold</b>', 'link_type' => 'ftp', 'image_path' => 'C:/x.jpg',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['slug', 'name_en', 'link_type', 'image_path']);

        $this->postJson('/api/v1/admin/brands', $this->brandPayload(['slug' => 'taken']))
            ->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->postJson('/api/v1/admin/brands', $this->brandPayload(['link_url' => 'http://insecure.example.com']))
            ->assertUnprocessable()->assertJsonValidationErrors('link_url');

        $this->postJson('/api/v1/admin/brands', $this->brandPayload(['link_type' => 'internal', 'link_url' => '//evil.example.com']))
            ->assertUnprocessable()->assertJsonValidationErrors('link_url');
    }

    public function test_a_brand_needs_descriptions_and_an_image_before_it_can_be_active(): void
    {
        $this->actingAsEditor();

        $this->postJson('/api/v1/admin/brands', $this->brandPayload([
            'short_description_ar' => null, 'image_path' => null,
        ]))->assertUnprocessable()->assertJsonValidationErrors(['short_description_ar', 'image_path']);

        $this->postJson('/api/v1/admin/brands', $this->brandPayload([
            'short_description_ar' => null, 'image_path' => null, 'is_active' => false,
        ]))->assertCreated();

        $brand = Brand::where('slug', 'new-brand')->sole();
        $this->patchJson("/api/v1/admin/brands/{$brand->id}", ['is_active' => true])
            ->assertUnprocessable()->assertJsonValidationErrors(['short_description_ar', 'image_path']);
        $this->patchJson("/api/v1/admin/brands/{$brand->id}", ['logo_path' => '/assets/images/jovie.jpg', 'short_description_ar' => 'وصف'])
            ->assertOk();
        $this->patchJson("/api/v1/admin/brands/{$brand->id}", ['is_active' => true])->assertOk();
    }

    public function test_deleted_brands_disappear_publicly_but_keep_their_slug(): void
    {
        $this->actingAsEditor();
        $brand = Brand::factory()->create(['slug' => 'archived']);

        $this->deleteJson("/api/v1/admin/brands/{$brand->id}")->assertNoContent();

        $this->getJson('/api/v1/brands/archived')->assertNotFound();
        $this->assertSoftDeleted($brand);
        $this->postJson('/api/v1/admin/brands', $this->brandPayload(['slug' => 'archived']))
            ->assertUnprocessable()->assertJsonValidationErrors('slug');
    }

    public function test_editor_manages_services(): void
    {
        $this->actingAsEditor();

        $id = $this->postJson('/api/v1/admin/services', [
            'category' => 'suppliers',
            'title_en' => 'Cold Chain', 'title_ar' => 'سلسلة التبريد',
            'description_en' => 'Temperature-controlled storage.', 'description_ar' => 'تخزين مبرد.',
            'image_path' => '/assets/images/hero-warehouse.jpg',
            'image_alt_en' => 'Warehouse', 'image_alt_ar' => 'مستودع',
            'is_active' => true,
        ])->assertCreated()->assertJsonPath('data.category', 'suppliers')->json('data.id');

        $this->getJson('/api/v1/services')->assertJsonPath('data.suppliers.0.title.en', 'Cold Chain');

        $this->patchJson("/api/v1/admin/services/{$id}", ['image_alt_ar' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('image_alt_ar');
        $this->patchJson("/api/v1/admin/services/{$id}", ['category' => 'partners'])
            ->assertUnprocessable()->assertJsonValidationErrors('category');

        $this->patchJson("/api/v1/admin/services/{$id}", ['is_active' => false])->assertOk();
        $this->getJson('/api/v1/services')->assertJsonCount(0, 'data.suppliers');

        $this->deleteJson("/api/v1/admin/services/{$id}")->assertNoContent();
        $this->getJson('/api/v1/admin/services')->assertJsonCount(0, 'data');
    }
}
