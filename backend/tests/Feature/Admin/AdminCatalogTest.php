<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\Brand;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCatalogTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsRole(AdminRole $role): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function productPayload(array $overrides = []): array
    {
        return array_merge([
            'brand_id' => Brand::factory()->create(['has_store' => true])->id,
            'slug' => 'New-Formula',
            'name_en' => 'New Formula',
            'name_ar' => 'تركيبة جديدة',
            'stage' => 1,
            'age_from_months' => 0,
            'age_to_months' => 6,
            'nutrition_facts' => [['label_en' => 'Energy', 'label_ar' => 'الطاقة', 'unit' => 'kcal', 'per_100g' => '500', 'per_100ml' => '66']],
        ], $overrides);
    }

    public function test_only_catalog_managers_can_manage_products(): void
    {
        $product = Product::factory()->create();

        foreach ([AdminRole::ContentEditor, AdminRole::Support] as $role) {
            $this->actingAsRole($role);
            $this->getJson('/api/v1/admin/products')->assertForbidden();
            $this->patchJson("/api/v1/admin/products/{$product->id}", ['name_en' => 'X'])->assertForbidden();
            $this->postJson("/api/v1/admin/products/{$product->id}/variants", ['sku' => 'X1', 'name_en' => 'a', 'name_ar' => 'ب'])
                ->assertForbidden();
        }
    }

    public function test_store_manager_builds_and_activates_a_product(): void
    {
        $admin = $this->actingAsRole(AdminRole::StoreManager);

        $id = $this->postJson('/api/v1/admin/products', $this->productPayload())
            ->assertCreated()
            ->assertJsonPath('data.slug', 'new-formula')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.nutrition_facts.0.label_ar', 'الطاقة')
            ->json('data.id');

        $this->patchJson("/api/v1/admin/products/{$id}", ['is_active' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('is_active');

        $variantId = $this->postJson("/api/v1/admin/products/{$id}/variants", [
            'sku' => ' nf-400 ', 'name_en' => '400 g', 'name_ar' => '400 جم', 'net_weight_grams' => 400, 'initial_stock' => 25,
        ])
            ->assertCreated()
            ->assertJsonPath('data.sku', 'NF-400')
            ->assertJsonPath('data.is_default', true)
            ->assertJsonPath('data.stock_quantity', 25)
            ->json('data.id');

        $movement = InventoryMovement::sole();
        $this->assertSame([$variantId, 25, 25, 'initial_stock', $admin->id],
            [$movement->product_variant_id, $movement->quantity_change, $movement->stock_after, $movement->reason->value, $movement->admin_user_id]);

        $this->postJson("/api/v1/admin/products/{$id}/images", ['path' => '/assets/images/jovie.jpg', 'alt_en' => 'Tin', 'alt_ar' => 'علبة'])
            ->assertCreated()->assertJsonPath('data.is_primary', true);

        $this->patchJson("/api/v1/admin/products/{$id}", ['is_active' => true])->assertOk();

        $this->patchJson("/api/v1/admin/products/{$id}", ['is_purchasable' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('is_purchasable');
        $this->patchJson("/api/v1/admin/product-variants/{$variantId}", ['price_piastres' => 52000])->assertOk();
        $this->patchJson("/api/v1/admin/products/{$id}", ['is_purchasable' => true])->assertOk();
    }

    public function test_product_validation(): void
    {
        $this->actingAsRole(AdminRole::StoreManager);
        Product::factory()->create(['slug' => 'taken']);

        $this->postJson('/api/v1/admin/products', $this->productPayload([
            'slug' => 'taken', 'name_en' => '<b>x</b>', 'age_from_months' => 12, 'age_to_months' => 6,
            'nutrition_facts' => [['label_en' => 'Energy', 'evil' => 'x']],
        ]))->assertUnprocessable()->assertJsonValidationErrors(['slug', 'name_en', 'nutrition_facts.0', 'nutrition_facts.0.label_ar']);

        $this->postJson('/api/v1/admin/products', $this->productPayload(['age_from_months' => 12, 'age_to_months' => 6]))
            ->assertUnprocessable()->assertJsonValidationErrors('age_to_months');
    }

    public function test_variant_rules(): void
    {
        $this->actingAsRole(AdminRole::StoreManager);
        $product = Product::factory()->create();
        ProductVariant::factory()->create(['sku' => 'TAKEN-1']);
        $url = "/api/v1/admin/products/{$product->id}/variants";

        $this->postJson($url, ['sku' => 'taken-1', 'name_en' => 'a', 'name_ar' => 'ب', 'barcode' => '12'])
            ->assertUnprocessable()->assertJsonValidationErrors(['sku', 'barcode']);
        $this->postJson($url, ['sku' => 'A-1', 'name_en' => 'a', 'name_ar' => 'ب', 'compare_at_price_piastres' => 1000])
            ->assertUnprocessable()->assertJsonValidationErrors('compare_at_price_piastres');
        $this->postJson($url, ['sku' => 'A-1', 'name_en' => 'a', 'name_ar' => 'ب', 'price_piastres' => 1000, 'compare_at_price_piastres' => 900])
            ->assertUnprocessable()->assertJsonValidationErrors('compare_at_price_piastres');

        $first = $this->postJson($url, ['sku' => 'A-1', 'name_en' => '400 g', 'name_ar' => '400 جم'])->assertCreated()->json('data.id');
        $second = $this->postJson($url, ['sku' => 'A-2', 'name_en' => '800 g', 'name_ar' => '800 جم', 'is_default' => true])
            ->assertCreated()->json('data.id');

        $this->assertFalse(ProductVariant::find($first)->is_default);
        $this->assertTrue(ProductVariant::find($second)->is_default);

        $this->patchJson("/api/v1/admin/product-variants/{$first}", ['stock_quantity' => 999])
            ->assertUnprocessable()->assertJsonValidationErrors('stock_quantity');
        $this->patchJson("/api/v1/admin/product-variants/{$second}", ['is_default' => false])
            ->assertUnprocessable()->assertJsonValidationErrors('is_default');

        $this->deleteJson("/api/v1/admin/product-variants/{$second}")->assertNoContent();
        $this->assertTrue(ProductVariant::find($first)->is_default, 'The remaining variant becomes the default.');
        $this->assertSoftDeleted('product_variants', ['id' => $second]);
    }

    public function test_an_active_product_keeps_an_active_variant_and_an_image(): void
    {
        $this->actingAsRole(AdminRole::StoreManager);
        $product = Product::factory()->sellable()->create();
        $variant = $product->variants()->sole();
        $image = $product->images()->sole();

        $this->patchJson("/api/v1/admin/product-variants/{$variant->id}", ['is_active' => false])
            ->assertUnprocessable()->assertJsonValidationErrors('is_active');
        $this->deleteJson("/api/v1/admin/product-variants/{$variant->id}")->assertUnprocessable();
        $this->deleteJson("/api/v1/admin/product-images/{$image->id}")
            ->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_images_primary_switching_deletion_and_order(): void
    {
        $this->actingAsRole(AdminRole::StoreManager);
        $product = Product::factory()->create();
        $url = "/api/v1/admin/products/{$product->id}/images";

        $a = $this->postJson($url, ['path' => '/assets/images/jovie.jpg'])->json('data.id');
        $b = $this->postJson($url, ['path' => '/assets/images/mom.jpg'])->assertJsonPath('data.is_primary', false)->json('data.id');
        $c = $this->postJson($url, ['path' => '/assets/images/ourbrand.jpg', 'is_primary' => true])->json('data.id');
        $this->postJson($url, ['path' => 'not/allowed.jpg'])->assertUnprocessable();

        $primary = fn () => $product->images()->where('is_primary', true)->value('id');
        $this->assertSame($c, $primary());

        $this->patchJson("/api/v1/admin/product-images/{$a}", ['is_primary' => true])->assertOk();
        $this->assertSame($a, $primary());

        $this->deleteJson("/api/v1/admin/product-images/{$a}")->assertNoContent();
        $this->assertNotNull($primary(), 'Another image becomes the main image.');

        $this->putJson("{$url}/order", ['ids' => [$c]])->assertUnprocessable();
        $this->putJson("{$url}/order", ['ids' => [$c, $b]])->assertNoContent();
        $this->assertSame([$c, $b], $product->images()->reorder()->orderBy('sort_order')->pluck('id')->all());
    }

    /**
     * The controller also refuses opening stock to admins without inventory.manage, but no current
     * role has catalog.manage without inventory.manage, so only the allowed path is reachable here.
     */
    public function test_super_admin_can_set_opening_stock_when_creating_a_variant(): void
    {
        $this->actingAsRole(AdminRole::SuperAdmin);
        $product = Product::factory()->create();

        $this->postJson("/api/v1/admin/products/{$product->id}/variants", [
            'sku' => 'OPEN-1', 'name_en' => 'a', 'name_ar' => 'ب', 'initial_stock' => 5,
        ])->assertCreated()->assertJsonPath('data.stock_quantity', 5);
    }
}
