<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminAuditLog;
use App\Models\AdminUser;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Payments\FakeCardGateway;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/**
 * The orders list's status tabs (display groups over the real statuses), their counts, and the
 * row actions (normal next step + other actions) that come from the existing order rules.
 */
class AdminOrderTabsTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private ProductVariant $variant;

    /** @var array<string, Order> */
    private array $orders = [];

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        config(['payments.drivers' => ['fake' => FakeCardGateway::class]]);
        $this->openStore();
        app(SettingsService::class)->update(['store.card_provider' => 'fake', 'store.card_payments_enabled' => true]);
        $this->variant = $this->variant(stock: 100, price: 45000);
    }

    private function order(string $status, string $method = 'cod', string $payment = 'unpaid'): Order
    {
        $this->app['auth']->forgetGuards();
        $this->travel(7)->seconds(); // stays under the checkout rate limit
        $number = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => 1], ['payment_method' => $method]))
            ->assertCreated()->json('data.order_number');
        DB::table('orders')->where('order_number', $number)->update(['status' => $status, 'payment_status' => $payment]);

        return Order::where('order_number', $number)->sole();
    }

    private function seedOrders(): void
    {
        foreach ([
            'new1' => ['pending_confirmation'], 'new2' => ['pending_confirmation'], 'card' => ['pending_payment', 'card'],
            'confirmed' => ['confirmed'], 'prep1' => ['processing'], 'prep2' => ['processing'],
            'ready' => ['shipped'], 'delivered' => ['delivered', 'cod', 'paid'],
            'cancelled' => ['cancelled'], 'returned' => ['returned'], 'expired' => ['expired', 'card'],
        ] as $key => $args) {
            $this->orders[$key] = $this->order(...$args);
        }
    }

    private function as(AdminRole $role): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    /** @return array<string, int> */
    private function counts(string $query = ''): array
    {
        return collect($this->getJson("/api/v1/admin/orders?{$query}")->assertOk()->json('options.tabs'))->pluck('count', 'key')->all();
    }

    private function numbers(string $query): array
    {
        return array_column($this->getJson("/api/v1/admin/orders?{$query}")->assertOk()->json('data'), 'order_number');
    }

    private function numbersOf(string ...$keys): array
    {
        return array_map(fn ($k) => $this->orders[$k]->order_number, $keys);
    }

    public function test_tabs_group_the_real_statuses_with_counts_and_paging(): void
    {
        $this->seedOrders();
        $this->as(AdminRole::OrderManager);

        $tabs = $this->getJson('/api/v1/admin/orders')->assertOk()->json('options.tabs');
        $this->assertSame(['all', 'new', 'in_progress', 'ready', 'delivered', 'closed'], array_column($tabs, 'key'));
        $this->assertSame(['pending_confirmation', 'pending_payment'], $tabs[1]['statuses']);
        $this->assertSame(['confirmed', 'processing'], $tabs[2]['statuses']);
        $this->assertSame(['shipped'], $tabs[3]['statuses']);
        $this->assertSame(['cancelled', 'returned', 'expired'], $tabs[5]['statuses']);
        $this->assertSame(['all' => 11, 'new' => 3, 'in_progress' => 3, 'ready' => 1, 'delivered' => 1, 'closed' => 3], $this->counts());

        $this->assertEqualsCanonicalizing($this->numbersOf('new1', 'new2', 'card'), $this->numbers('tab=new'));
        $this->assertEqualsCanonicalizing($this->numbersOf('confirmed', 'prep1', 'prep2'), $this->numbers('tab=in_progress'));
        $this->assertSame($this->numbersOf('ready'), $this->numbers('tab=ready'));
        $this->assertSame($this->numbersOf('delivered'), $this->numbers('tab=delivered'));
        $this->assertEqualsCanonicalizing($this->numbersOf('cancelled', 'returned', 'expired'), $this->numbers('tab=closed'));
        // Cancelled and returned stay distinguishable inside the tab.
        $this->assertSame($this->numbersOf('returned'), $this->numbers('tab=closed&status=returned'));
        $this->assertSame([], $this->numbers('tab=ready&status=delivered'));

        // Server-side paging inside a tab.
        $page1 = $this->getJson('/api/v1/admin/orders?tab=new&per_page=2&page=1')->json();
        $this->assertSame([1, 2, 3], [$page1['meta']['current_page'], $page1['meta']['last_page'], $page1['meta']['total']]);
        $this->assertCount(2, $page1['data']);
        $this->assertCount(1, $this->getJson('/api/v1/admin/orders?tab=new&per_page=2&page=2')->json('data'));

        // Counts follow the other filters, but not the tab or the stage.
        $this->assertSame(['all' => 1, 'new' => 0, 'in_progress' => 0, 'ready' => 0, 'delivered' => 1, 'closed' => 0], $this->counts('payment_status=paid'));
        $this->assertSame($this->counts(), $this->counts('tab=ready&status=shipped'));
        $this->assertSame(1, $this->counts("search={$this->orders['prep1']->order_number}")['in_progress']);
        $this->assertSame(0, $this->counts('from=2000-01-01T00:00&to=2000-01-01T23:59')['all']);

        $this->getJson('/api/v1/admin/orders?tab=shipped')->assertUnprocessable()->assertJsonValidationErrors('tab');
    }

    public function test_rows_carry_the_next_normal_step_and_the_other_actions_from_the_rules(): void
    {
        $this->seedOrders();
        $this->as(AdminRole::OrderManager);
        $rows = collect($this->getJson('/api/v1/admin/orders?per_page=50')->json('data'))->keyBy('order_number');
        $actions = fn (string $key) => $rows[$this->orders[$key]->order_number]['actions'];

        $this->assertSame(['next' => 'confirmed', 'other' => ['processing', 'shipped', 'delivered', 'cancelled']], $actions('new1'));
        $this->assertSame('processing', $actions('confirmed')['next']);
        $this->assertSame('shipped', $actions('prep1')['next']);
        $this->assertSame(['next' => 'delivered', 'other' => ['pending_confirmation', 'confirmed', 'processing', 'cancelled', 'returned']], $actions('ready'));
        $this->assertSame(['next' => null, 'other' => ['pending_confirmation', 'confirmed', 'processing', 'shipped', 'returned']], $actions('delivered'));
        // An unpaid card order is confirmed by its payment, not by an admin.
        $this->assertSame(['next' => null, 'other' => ['cancelled']], $actions('card'));
        foreach (['cancelled', 'returned', 'expired'] as $final) {
            $this->assertSame(['next' => null, 'other' => []], $actions($final));
        }

        // Without orders.manage there are no row actions at all.
        $this->as(AdminRole::Support);
        $this->assertNull($this->getJson('/api/v1/admin/orders')->json('data.0.actions'));
    }

    public function test_quick_and_other_actions_use_the_existing_transition_rules_and_audit(): void
    {
        $order = $this->order('pending_confirmation');
        $admin = $this->as(AdminRole::OrderManager);
        $move = fn (string $to, ?string $note = null) => $this->postJson("/api/v1/admin/orders/{$order->order_number}/status",
            array_filter(['status' => $to, 'note' => $note, 'expected_status' => $order->refresh()->status->value]));

        foreach (['confirmed', 'processing', 'shipped'] as $step) {
            $move($step)->assertOk()->assertJsonPath('data.status', $step);
            $this->assertSame($step, $this->getJson('/api/v1/admin/orders')->json('data.0.status'));
        }
        // A stale row (expected status no longer true) changes nothing.
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", ['status' => 'processing', 'expected_status' => 'confirmed'])
            ->assertStatus(409);

        // Return from Prepared is an "other action": its note is kept in the history and the audit log.
        $move('returned', 'Customer refused at the door')->assertOk();
        $history = collect($this->getJson("/api/v1/admin/orders/{$order->order_number}")->json('data.history'))->last();
        $this->assertSame(['shipped', 'returned', $admin->id, 'Customer refused at the door'], [$history['from'], $history['to'], $history['admin']['id'], $history['note']]);
        $audit = AdminAuditLog::where('subject_id', $order->id)->latest('id')->first();
        $this->assertSame('orders.status_changed', $audit->action);
        $this->assertSame('Customer refused at the door', $audit->changes['reason']['to']);
        $this->assertSame($admin->id, $audit->admin_user_id);

        // Final: nothing is offered and the API refuses.
        $this->assertSame(['next' => null, 'other' => []], $this->getJson('/api/v1/admin/orders')->json('data.0.actions'));
        $move('confirmed', 'Reopen')->assertUnprocessable();
    }
}
