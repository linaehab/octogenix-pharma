<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\InventoryReason;
use App\Exceptions\InsufficientStockException;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminInventoryTest extends TestCase
{
    use RefreshDatabase;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->variant = ProductVariant::factory()->create(['low_stock_threshold' => 5]);
    }

    private function url(string $suffix = 'stock-adjustments'): string
    {
        return "/api/v1/admin/product-variants/{$this->variant->id}/{$suffix}";
    }

    private function stock(): int
    {
        return $this->variant->refresh()->stock_quantity;
    }

    public function test_only_inventory_managers_can_change_stock(): void
    {
        foreach ([AdminRole::ContentEditor, AdminRole::Support] as $role) {
            $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();
            $this->postJson($this->url(), ['reason' => 'restock', 'quantity' => 5])->assertForbidden();
        }
        $this->assertSame(0, $this->stock());
    }

    public function test_restock_write_off_adjustment_and_count_are_recorded(): void
    {
        $admin = AdminUser::factory()->role(AdminRole::StoreManager)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        $this->postJson($this->url(), ['reason' => 'restock', 'quantity' => 20])
            ->assertCreated()
            ->assertJsonPath('data.movement.quantity_change', 20)
            ->assertJsonPath('data.variant.stock_quantity', 20);
        $this->postJson($this->url(), ['reason' => 'write_off', 'quantity' => 3, 'note' => 'Damaged tins'])
            ->assertCreated()->assertJsonPath('data.movement.quantity_change', -3);
        $this->postJson($this->url(), ['reason' => 'manual_adjustment', 'quantity' => -2, 'note' => 'Sample for exhibition'])
            ->assertCreated();
        $this->postJson($this->url(), ['reason' => 'stock_count_correction', 'counted_quantity' => 12, 'note' => 'Monthly count'])
            ->assertCreated()->assertJsonPath('data.movement.quantity_change', -3)->assertJsonPath('data.movement.stock_after', 12);

        $this->assertSame(12, $this->stock());
        $this->assertSame([20, 17, 15, 12], InventoryMovement::orderBy('id')->pluck('stock_after')->all());
        $this->assertSame(4, InventoryMovement::where('admin_user_id', $admin->id)->count());

        $this->getJson($this->url('stock-movements'))
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.reason', 'stock_count_correction')
            ->assertJsonPath('data.0.admin.name', $admin->name);
    }

    public function test_stock_can_never_go_below_zero(): void
    {
        $this->actingAs(AdminUser::factory()->role(AdminRole::StoreManager)->create(), 'admin')->fromFrontend();
        $this->postJson($this->url(), ['reason' => 'restock', 'quantity' => 2])->assertCreated();

        $this->postJson($this->url(), ['reason' => 'write_off', 'quantity' => 3, 'note' => 'Too many'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.quantity.0', 'Only 2 unit(s) are in stock.');

        $this->assertSame(2, $this->stock());
        $this->assertSame(1, InventoryMovement::count());
    }

    public function test_adjustment_validation(): void
    {
        $this->actingAs(AdminUser::factory()->role(AdminRole::StoreManager)->create(), 'admin')->fromFrontend();

        $this->postJson($this->url(), ['reason' => 'order_reserved', 'quantity' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->postJson($this->url(), ['reason' => 'restock', 'quantity' => -4])
            ->assertUnprocessable()->assertJsonValidationErrors('quantity');
        $this->postJson($this->url(), ['reason' => 'write_off', 'quantity' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->postJson($this->url(), ['reason' => 'manual_adjustment', 'quantity' => 0, 'note' => 'x'])
            ->assertUnprocessable()->assertJsonValidationErrors('quantity');
        $this->postJson($this->url(), ['reason' => 'stock_count_correction', 'counted_quantity' => 0, 'note' => 'Same'])
            ->assertUnprocessable()->assertJsonValidationErrors('counted_quantity');
    }

    public function test_low_stock_list(): void
    {
        $this->actingAs(AdminUser::factory()->role(AdminRole::StoreManager)->create(), 'admin')->fromFrontend();
        $healthy = ProductVariant::factory()->create(['low_stock_threshold' => 5]);
        app(InventoryService::class)->adjust($healthy, 50, InventoryReason::Restock);
        app(InventoryService::class)->adjust($this->variant, 4, InventoryReason::Restock);

        $this->getJson('/api/v1/admin/inventory/low-stock')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->variant->id)
            ->assertJsonPath('data.0.is_low_on_stock', true);
    }

    public function test_service_refuses_order_reasons_without_an_order_and_zero_changes(): void
    {
        $service = app(InventoryService::class);

        $this->expectException(\InvalidArgumentException::class);
        $service->adjust($this->variant, -1, InventoryReason::OrderReserved);
    }

    public function test_service_throws_insufficient_stock_without_changing_anything(): void
    {
        $this->expectException(InsufficientStockException::class);

        try {
            app(InventoryService::class)->adjust($this->variant, -1, InventoryReason::ManualAdjustment, note: 'x');
        } finally {
            $this->assertSame(0, $this->stock());
            $this->assertSame(0, InventoryMovement::count());
        }
    }
}
