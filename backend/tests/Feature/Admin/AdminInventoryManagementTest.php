<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\InventoryReason;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/** Phase 3: inventory overview, adjustments, thresholds, movement history and permissions (test database only). */
class AdminInventoryManagementTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private AdminUser $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->admin = AdminUser::factory()->role(AdminRole::StoreManager)->create(['name' => 'Stock Keeper']);
        $this->actingAs($this->admin, 'admin')->fromFrontend();
    }

    /** A product with its single size, at the given stock (recorded as opening stock) and threshold. */
    private function stocked(string $name, int $stock, ?int $threshold, array $product = []): ProductVariant
    {
        $variant = Product::factory()->create(['name_en' => $name, 'name_ar' => "{$name} ع", ...$product])
            ->variants()->create(['sku' => strtoupper(str_replace(' ', '-', $name)), 'name_en' => '400 g', 'name_ar' => '400 جم',
                'is_default' => true, 'low_stock_threshold' => $threshold]);
        if ($stock > 0) {
            app(InventoryService::class)->adjust($variant, $stock, InventoryReason::InitialStock);
        }

        return $variant->refresh();
    }

    private function adjust(ProductVariant $variant, array $body)
    {
        return $this->postJson("/api/v1/admin/product-variants/{$variant->id}/stock-adjustments", $body);
    }

    public function test_classification_follows_the_threshold(): void
    {
        $cases = [[0, 5, 'out_of_stock'], [3, 5, 'low_stock'], [5, 5, 'low_stock'], [6, 5, 'in_stock'], [4, null, 'in_stock'], [0, null, 'out_of_stock'], [1, 0, 'in_stock']];
        foreach ($cases as $i => [$stock, $threshold, $status]) {
            $this->assertSame($status, $this->stocked("P{$i}", $stock, $threshold)->stockStatus(), "{$stock}/{$threshold}");
        }
    }

    public function test_overview_lists_stock_with_summary_filters_and_search(): void
    {
        $out = $this->stocked('Alpha Empty', 0, 5);
        $low = $this->stocked('Beta Low', 3, 5);
        $ok = $this->stocked('Gamma Plenty', 40, 5);
        $this->stocked('Delta Hidden', 7, null, ['is_active' => false]);
        $archived = $this->stocked('Old Archived', 9, 5);
        $archived->product->delete();

        $response = $this->getJson('/api/v1/admin/inventory')->assertOk();
        $this->assertSame(['tracked' => 4, 'in_stock' => 2, 'low_stock' => 1, 'out_of_stock' => 1, 'without_threshold' => 1], $response->json('meta.summary'));
        // Most urgent first.
        $this->assertSame(['Alpha Empty', 'Beta Low'], array_slice(array_column($response->json('data'), 'name_en'), 0, 2));
        $row = collect($response->json('data'))->firstWhere('variant_id', $ok->id);
        $this->assertSame([40, 5, 'in_stock', 'GAMMA-PLENTY'], [$row['stock_quantity'], $row['low_stock_threshold'], $row['stock_status'], $row['sku']]);
        $this->assertNotNull($row['last_movement_at']);
        $this->assertNull(collect($response->json('data'))->firstWhere('variant_id', $out->id)['last_movement_at']);

        $names = fn (string $q) => array_column($this->getJson('/api/v1/admin/inventory?'.$q)->assertOk()->json('data'), 'name_en');
        $this->assertSame(['Alpha Empty'], $names('status=out_of_stock'));
        $this->assertSame(['Beta Low'], $names('status=low_stock'));
        $this->assertEqualsCanonicalizing(['Gamma Plenty', 'Delta Hidden'], $names('status=in_stock'));
        $this->assertSame(['Beta Low'], $names('search=beta-low'));
        $this->assertSame(['Gamma Plenty'], $names('search=Gamma'));
        $this->assertSame([], $names('search=Archived'));
        $this->getJson('/api/v1/admin/inventory?status=nonsense')->assertUnprocessable();
        $this->getJson('/api/v1/admin/inventory?per_page=1&page=2')->assertJsonPath('meta.current_page', 2)->assertJsonPath('meta.total', 4);
        $this->assertSame($low->id, $this->getJson('/api/v1/admin/inventory?status=low_stock')->json('data.0.variant_id'));
    }

    public function test_increase_and_decrease_record_movements_with_the_admin_and_balances(): void
    {
        $variant = $this->stocked('Tin', 10, 5);
        $this->travelTo(Carbon::parse('2026-11-07 09:00:00', 'UTC'));

        $this->adjust($variant, ['reason' => 'restock', 'quantity' => 24, 'note' => 'Shipment 42', 'expected_stock' => 10])
            ->assertCreated()->assertJsonPath('data.variant.stock_quantity', 34)
            ->assertJsonPath('data.movement.admin.name', 'Stock Keeper');
        $this->adjust($variant, ['reason' => 'write_off', 'quantity' => 4, 'note' => 'Damaged tins', 'expected_stock' => 34])
            ->assertCreated()->assertJsonPath('data.movement.quantity_change', -4);
        $this->adjust($variant, ['reason' => 'manual_adjustment', 'quantity' => -2, 'note' => 'Missing after count', 'expected_stock' => 30])->assertCreated();

        $this->assertSame(28, $variant->refresh()->stock_quantity);
        $history = $this->getJson("/api/v1/admin/inventory/movements?variant_id={$variant->id}")->assertOk()->json('data');
        $this->assertSame([[-2, 30, 28], [-4, 34, 30], [24, 10, 34], [10, 0, 10]],
            array_map(fn ($m) => [$m['quantity_change'], $m['stock_before'], $m['stock_after']], $history));
        $this->assertSame(['manual_adjustment', 'Missing after count', $this->admin->id, '2026-11-07T09:00:00+00:00'],
            [$history[0]['reason'], $history[0]['note'], $history[0]['admin']['id'], $history[0]['created_at']]);
        $this->assertSame([null, 'TIN', 'Tin'], [$history[3]['admin'], $history[3]['sku'], $history[3]['name_en']]);
    }

    public function test_invalid_quantities_reasons_and_notes_are_refused(): void
    {
        $variant = $this->stocked('Tin', 5, 2);
        $cases = [
            [['reason' => 'restock', 'quantity' => 0], 'quantity'],
            [['reason' => 'restock', 'quantity' => -3], 'quantity'],
            [['reason' => 'restock', 'quantity' => 1.5], 'quantity'],
            [['reason' => 'restock', 'quantity' => 'ten'], 'quantity'],
            [['reason' => 'restock', 'quantity' => 2000000], 'quantity'],
            [['reason' => 'manual_adjustment', 'quantity' => 0, 'note' => 'x'], 'quantity'],
            [['reason' => 'write_off', 'quantity' => 1], 'note'],
            [['reason' => 'manual_adjustment', 'quantity' => 1], 'note'],
            [['reason' => 'stock_count_correction', 'counted_quantity' => 3], 'note'],
            [['quantity' => 3, 'note' => 'x'], 'reason'],
            [['reason' => 'order_released', 'quantity' => 3, 'note' => 'x'], 'reason'],
            [['reason' => 'restock', 'quantity' => 3, 'expected_stock' => -1], 'expected_stock'],
        ];
        foreach ($cases as [$body, $error]) {
            $this->adjust($variant, $body)->assertUnprocessable()->assertJsonValidationErrors($error);
        }
        // Stock can never go below zero.
        $this->adjust($variant, ['reason' => 'write_off', 'quantity' => 6, 'note' => 'Too many'])
            ->assertUnprocessable()->assertJsonPath('errors.quantity.0', 'Only 5 unit(s) are in stock.');

        $this->assertSame(5, $variant->refresh()->stock_quantity);
        $this->assertSame(1, InventoryMovement::count(), 'Only the opening stock.');
    }

    public function test_a_repeated_or_outdated_adjustment_is_refused(): void
    {
        $variant = $this->stocked('Tin', 10, 5);
        $body = ['reason' => 'restock', 'quantity' => 5, 'expected_stock' => 10];

        $this->adjust($variant, $body)->assertCreated();
        // The same submission again (double click, retry): the stock is no longer 10.
        $this->adjust($variant, $body)->assertStatus(409)->assertJsonPath('current_stock', 15);
        $this->assertSame(15, $variant->refresh()->stock_quantity);

        // An order reserved stock after the admin looked at it.
        $this->openStore();
        $variant->product->update(['is_active' => true, 'is_purchasable' => true]);
        $variant->product->images()->create(['path' => '/assets/images/jovie.jpg', 'is_primary' => true]);
        $variant->update(['price_piastres' => 30000]);
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 2]))->assertCreated();
        $this->actingAs($this->admin, 'admin')->fromFrontend();
        $this->adjust($variant, ['reason' => 'stock_count_correction', 'counted_quantity' => 15, 'note' => 'Count', 'expected_stock' => 15])
            ->assertStatus(409)->assertJsonPath('current_stock', 13);

        $this->assertSame(13, $variant->refresh()->stock_quantity);
        $this->assertSame(3, InventoryMovement::count(), 'Opening stock, the first restock and the order reservation only.');
    }

    public function test_thresholds_are_set_and_cleared_by_inventory_managers(): void
    {
        $variant = $this->stocked('Tin', 4, null);
        $url = "/api/v1/admin/product-variants/{$variant->id}/low-stock-threshold";

        $this->putJson($url, ['low_stock_threshold' => 5])->assertOk()
            ->assertJsonPath('data.low_stock_threshold', 5)->assertJsonPath('data.stock_status', 'low_stock');
        $this->getJson('/api/v1/admin/dashboard/summary')->assertJsonPath('data.inventory.low_stock', 1);
        $this->putJson($url, ['low_stock_threshold' => 3])->assertOk()->assertJsonPath('data.stock_status', 'in_stock');
        $this->putJson($url, ['low_stock_threshold' => null])->assertOk()->assertJsonPath('data.low_stock_threshold', null);

        foreach ([['low_stock_threshold' => -1], ['low_stock_threshold' => 'x'], ['low_stock_threshold' => 2.5], []] as $body) {
            $this->putJson($url, $body)->assertUnprocessable()->assertJsonValidationErrors('low_stock_threshold');
        }
        // Changing the threshold never touches the stock or the history.
        $this->assertSame([4, 1], [$variant->refresh()->stock_quantity, InventoryMovement::count()]);
    }

    public function test_history_filters(): void
    {
        $a = $this->stocked('Alpha', 10, 5);
        $b = $this->stocked('Beta', 10, 5);
        $this->travelTo(Carbon::parse('2026-11-05 21:30:00', 'UTC')); // 23:30 on 5 November in Cairo
        $this->adjust($a, ['reason' => 'restock', 'quantity' => 1])->assertCreated();
        $this->travelTo(Carbon::parse('2026-11-05 22:30:00', 'UTC')); // 00:30 on 6 November in Cairo
        $this->adjust($b, ['reason' => 'write_off', 'quantity' => 1, 'note' => 'Damaged'])->assertCreated();

        $ids = fn (string $q) => array_column($this->getJson('/api/v1/admin/inventory/movements?'.$q)->assertOk()->json('data'), 'variant_id');
        $this->assertSame([$b->id], $ids('reason=write_off'));
        $this->assertSame([$b->id], $ids('from=2026-11-06&to=2026-11-06'));
        $this->assertSame([$a->id], $ids('from=2026-11-05&to=2026-11-05&admin_id='.$this->admin->id));
        $this->assertSame([$a->id, $a->id], $ids("variant_id={$a->id}"));
        $this->getJson('/api/v1/admin/inventory/movements?from=2026-11-06&to=2026-11-01')->assertUnprocessable();

        $options = $this->getJson('/api/v1/admin/inventory/movements')->json('meta.options');
        $this->assertSame([['id' => $this->admin->id, 'name' => 'Stock Keeper']], $options['admins']);
        $this->assertSame(['ALPHA', 'BETA'], array_column($options['products'], 'sku'));
    }

    public function test_history_by_order_number(): void
    {
        $this->openStore();
        $variant = $this->variant(stock: 10);
        $number = $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 2]))->assertCreated()->json('data.order_number');
        $this->actingAs($this->admin, 'admin')->fromFrontend();

        $rows = $this->getJson('/api/v1/admin/inventory/movements?order='.substr($number, -5))->assertOk()->json('data');
        $this->assertCount(1, $rows);
        $this->assertSame(['order_reserved', -2, $number], [$rows[0]['reason'], $rows[0]['quantity_change'], $rows[0]['order']['order_number']]);
    }

    public function test_movements_are_read_only(): void
    {
        $variant = $this->stocked('Tin', 10, 5);
        $id = InventoryMovement::sole()->id;

        $this->patchJson("/api/v1/admin/inventory/movements/{$id}", ['quantity_change' => 99])->assertNotFound();
        $this->deleteJson("/api/v1/admin/inventory/movements/{$id}")->assertNotFound();
        $this->putJson('/api/v1/admin/inventory/movements', [])->assertStatus(405);
        $this->assertSame([10, 10], [InventoryMovement::sole()->quantity_change, $variant->refresh()->stock_quantity]);
    }

    public function test_product_endpoints_cannot_change_stock(): void
    {
        $variant = $this->stocked('Tin', 10, 5);
        $product = $variant->product;

        $this->patchJson("/api/v1/admin/products/{$product->id}", ['stock_quantity' => 99, 'variant' => ['stock_quantity' => 99]])
            ->assertUnprocessable()->assertJsonValidationErrors(['stock_quantity', 'variant.stock_quantity']);
        $this->patchJson("/api/v1/admin/product-variants/{$variant->id}", ['stock_quantity' => 99])
            ->assertUnprocessable()->assertJsonValidationErrors('stock_quantity');
        $this->assertSame(10, $variant->refresh()->stock_quantity);
    }

    public function test_permissions(): void
    {
        $variant = $this->stocked('Tin', 10, 5);
        $calls = [
            ['getJson', '/api/v1/admin/inventory', []],
            ['getJson', '/api/v1/admin/inventory/movements', []],
            ['getJson', '/api/v1/admin/inventory/low-stock', []],
            ['getJson', "/api/v1/admin/product-variants/{$variant->id}/stock-movements", []],
            ['postJson', "/api/v1/admin/product-variants/{$variant->id}/stock-adjustments", ['reason' => 'restock', 'quantity' => 5]],
            ['putJson', "/api/v1/admin/product-variants/{$variant->id}/low-stock-threshold", ['low_stock_threshold' => 1]],
        ];

        $this->app['auth']->forgetGuards();
        foreach ($calls as [$method, $url, $body]) {
            $this->fromFrontend()->{$method}($url, $body)->assertUnauthorized();
        }
        foreach ([AdminRole::Support, AdminRole::ContentEditor] as $role) {
            $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();
            foreach ($calls as [$method, $url, $body]) {
                $this->{$method}($url, $body)->assertForbidden();
            }
        }
        $this->actingAs(AdminUser::factory()->superAdmin()->inactive()->create(), 'admin')->fromFrontend();
        $this->getJson('/api/v1/admin/inventory')->assertForbidden();

        $this->assertSame([10, 5, 1], [$variant->refresh()->stock_quantity, $variant->low_stock_threshold, InventoryMovement::count()]);
    }
}
