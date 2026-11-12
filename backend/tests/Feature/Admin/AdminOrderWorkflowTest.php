<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Models\AdminAuditLog;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Payments\FakeCardGateway;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/**
 * Phase 11.5: the order fulfillment workflow (stages, admin corrections with notes), its timeline,
 * payment kept separate, and the orders list's date-and-time filters. Test database only.
 */
class AdminOrderWorkflowTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        config(['payments.drivers' => ['fake' => FakeCardGateway::class]]);
        $this->openStore(codFee: 1000);
        app(SettingsService::class)->update(['store.card_provider' => 'fake', 'store.card_payments_enabled' => true]);
        $this->variant = $this->variant(stock: 50, price: 45000);
    }

    private function order(array $overrides = [], int $quantity = 1): Order
    {
        $this->app['auth']->forgetGuards();
        $number = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => $quantity], $overrides))->assertCreated()->json('data.order_number');

        return Order::where('order_number', $number)->sole();
    }

    private function as(AdminRole $role): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create(['name' => "{$role->value} admin"]);
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function move(Order $order, string $status, ?string $note = null)
    {
        return $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", array_filter([
            'status' => $status, 'note' => $note, 'expected_status' => $order->refresh()->status->value,
        ], fn ($v) => $v !== null));
    }

    public function test_the_normal_steps_need_no_note_and_corrections_need_one_and_everything_is_in_the_timeline(): void
    {
        $order = $this->order();
        $admin = $this->as(AdminRole::OrderManager);

        foreach (['confirmed', 'processing', 'shipped', 'delivered'] as $stage) {
            $this->move($order, $stage)->assertOk()->assertJsonPath('data.status', $stage);
        }
        $this->assertNotNull($order->refresh()->delivered_at);

        // Back from Delivered to Preparing: a correction, so a note is required.
        $this->move($order, 'processing')->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->move($order, 'processing', 'Driver brought it back: wrong address')->assertOk()
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.timestamps.delivered_at', null);
        $this->assertNull($order->refresh()->shipped_at, 'Later stages no longer apply after moving back.');

        $history = $this->getJson("/api/v1/admin/orders/{$order->order_number}")->json('data.history');
        $last = end($history);
        $this->assertSame(['status', 'delivered', 'processing', 'admin', $admin->id, 'Driver brought it back: wrong address'],
            [$last['field'], $last['from'], $last['to'], $last['actor'], $last['admin']['id'], $last['note']]);
        $this->assertNotEmpty($last['at']);

        $audit = AdminAuditLog::where('action', 'orders.status_corrected')->sole();
        $this->assertEquals(['from' => 'delivered', 'to' => 'processing'], $audit->changes['status']);
        $this->assertSame('Driver brought it back: wrong address', $audit->changes['reason']['to']);
        $this->assertSame(4, AdminAuditLog::where('action', 'orders.status_changed')->count());

        // Customers see the stages, never the internal notes or the admin.
        $customerTimeline = $this->getJson("/api/v1/admin/orders/{$order->order_number}")->json('data.timeline');
        $this->assertArrayNotHasKey('note', $customerTimeline[0]);
        $this->assertArrayNotHasKey('admin', $customerTimeline[0]);
    }

    public function test_the_guardrails_keep_stock_and_payments_consistent(): void
    {
        $delivered = $this->order();
        $prepared = $this->order(quantity: 2);
        $card = $this->order(['payment_method' => 'card']);
        $unpaid = $this->order(['payment_method' => 'card']);
        $this->as(AdminRole::StoreManager);

        // Delivered is never cancelled; finals stay final; Returned from Delivered is allowed.
        $this->move($delivered, 'delivered', 'Delivered by hand')->assertOk();
        $this->move($delivered, 'cancelled', 'Too late')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->move($delivered, 'returned', 'Customer refused after delivery')->assertOk();
        $this->move($delivered, 'confirmed', 'Reopen')->assertUnprocessable()->assertJsonValidationErrors('status');

        // Cancelling from Prepared gives the stock back exactly once.
        $stock = $this->variant->refresh()->stock_quantity;
        $this->move($prepared, 'shipped', 'Skipped preparing in the system')->assertOk();
        $this->move($prepared, 'cancelled', 'Customer cancelled at the door')->assertOk();
        $this->assertSame($stock + 2, $this->variant->refresh()->stock_quantity);
        $this->move($prepared, 'confirmed', 'Reopen')->assertUnprocessable();
        $this->assertSame(1, InventoryMovement::where('order_id', $prepared->id)->where('reason', 'order_released')->count());

        // A card order's new stage is its payment: no "New" for card orders, no manual confirmation before payment.
        DB::table('orders')->where('id', $card->id)->update(['status' => 'confirmed', 'payment_status' => 'paid']);
        $this->move($card, 'pending_confirmation', 'Back to new')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->move($unpaid, 'confirmed', 'Confirm anyway')->assertUnprocessable();
    }

    public function test_payment_status_never_follows_the_fulfillment_stage(): void
    {
        $order = $this->order();
        $this->as(AdminRole::OrderManager);

        foreach (['confirmed', 'processing', 'shipped', 'delivered'] as $stage) {
            $this->move($order, $stage)->assertOk()->assertJsonPath('data.payment_status', 'unpaid');
        }
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected", ['expected_payment_status' => 'unpaid'])
            ->assertOk()->assertJsonPath('data.payment_status', 'paid');

        // Moving a paid order back does not undo the payment.
        $this->move($order, 'shipped', 'Recount at the warehouse')->assertOk()->assertJsonPath('data.payment_status', 'paid');
        $this->assertSame(OrderPaymentStatus::Paid, $order->refresh()->payment_status);
        $this->assertSame(OrderStatus::Shipped, $order->status);
    }

    public function test_only_admins_who_manage_orders_change_stages(): void
    {
        $order = $this->order();

        $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", ['status' => 'confirmed'])->assertUnauthorized();
        foreach ([AdminRole::Support, AdminRole::ProductManager, AdminRole::ContentManager] as $role) {
            $this->as($role);
            $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", ['status' => 'confirmed'])->assertForbidden();
        }
        $this->as(AdminRole::Support);
        $this->getJson("/api/v1/admin/orders/{$order->order_number}")->assertOk()->assertJsonPath('data.actions.statuses', []);
        $this->assertSame(OrderStatus::PendingConfirmation, $order->refresh()->status);

        // COD cash stays a separate action with its own permissions.
        $this->as(AdminRole::ContentEditor);
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected")->assertForbidden();
    }

    public function test_the_list_filters_by_exact_date_and_time_with_status_and_payment(): void
    {
        $at = fn (string $cairo) => Carbon::setTestNow(Carbon::parse($cairo, 'Africa/Cairo')->utc());
        $at('2026-11-01 08:59:00');
        $before = $this->order();
        $at('2026-11-01 09:00:00');
        $first = $this->order();
        $at('2026-11-10 18:30:45');
        $last = $this->order();
        $at('2026-11-10 18:31:00');
        $after = $this->order();
        $at('2026-11-05 12:00:00');
        $paid = $this->order();
        Carbon::setTestNow();
        DB::table('orders')->where('id', $paid->id)->update(['status' => 'delivered', 'payment_status' => 'paid']);

        $this->as(AdminRole::OrderManager);
        $numbers = fn (string $query) => array_column($this->getJson("/api/v1/admin/orders?{$query}")->assertOk()->json('data'), 'order_number');

        $range = 'from=2026-11-01 09:00&to=2026-11-10 18:30';
        $this->assertEqualsCanonicalizing([$first->order_number, $last->order_number, $paid->order_number], $numbers($range));
        $this->assertEqualsCanonicalizing([$first->order_number, $last->order_number, $paid->order_number], $numbers('from=2026-11-01T09:00&to=2026-11-10T18:30'));
        $this->assertSame([$paid->order_number], $numbers("{$range}&status=delivered&payment_status=paid"));
        $this->assertEqualsCanonicalizing([$first->order_number, $last->order_number], $numbers("{$range}&status=pending_confirmation&payment_status=unpaid"));
        $this->assertSame([$last->order_number], $numbers("{$range}&search={$last->order_number}"));

        // A date alone still means the whole Cairo day.
        $this->assertEqualsCanonicalizing([$before->order_number, $first->order_number], $numbers('from=2026-11-01&to=2026-11-01'));
        $this->assertEqualsCanonicalizing([$last->order_number, $after->order_number], $numbers('from=2026-11-10'));

        $this->getJson('/api/v1/admin/orders?from=2026-11-10 18:30&to=2026-11-01 09:00')->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson('/api/v1/admin/orders?from=2026-11-01 9am')->assertUnprocessable()->assertJsonValidationErrors('from');

        $row = collect($this->getJson('/api/v1/admin/orders')->json('data'))->firstWhere('order_number', $first->order_number);
        $this->assertNotNull($row['last_status_at'], 'The list shows when the stage last changed.');

        // The Excel export (unchanged) accepts the same date-and-time filters.
        $this->as(AdminRole::StoreManager);
        $this->get('/api/v1/admin/orders/export?from=2026-11-01T09:00&to=2026-11-10T18:30')->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
}
