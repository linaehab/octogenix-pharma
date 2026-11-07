<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\Governorate;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Payments\FakeCardGateway;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/** Phase 4: order list, details, actions, payments, warnings and permissions (test database only). */
class AdminOrderManagementTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        config(['payments.drivers' => ['fake' => FakeCardGateway::class]]);
        FakeCardGateway::$results = [];
        $this->openStore();
        app(SettingsService::class)->update(['store.card_provider' => 'fake', 'store.card_payments_enabled' => true]);
        $this->variant = $this->variant(stock: 20, price: 45000);
    }

    /** @return array{0: Order, 1: string} */
    private function order(string $method = 'cod', int $quantity = 2, array $overrides = []): array
    {
        $this->app['auth']->forgetGuards();
        $response = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => $quantity], ['payment_method' => $method, ...$overrides]))->assertCreated();

        return [Order::where('order_number', $response->json('data.order_number'))->sole(), $response->json('meta.guest_access_token')];
    }

    private function as(AdminRole $role): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create(['name' => "{$role->value} admin"]);
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function setStatus(Order $order, array $body)
    {
        return $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", $body);
    }

    private function pay(Order $order, string $token): Payment
    {
        return $this->succeed($this->startPayment($order, $token));
    }

    private function startPayment(Order $order, string $token): string
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->assertCreated()->json('data.merchant_reference');
    }

    /** The provider reports the attempt as paid (signed webhook). */
    private function succeed(string $reference): Payment
    {
        $payment = Payment::where('merchant_reference', $reference)->sole();
        $body = json_encode(['event_id' => 'evt_'.Str::random(10), 'type' => 'payment.updated', 'merchant_reference' => $reference,
            'transaction_id' => 'txn_'.Str::random(8), 'status' => 'succeeded', 'amount_piastres' => $payment->amount_piastres,
            'currency' => 'EGP', 'card' => ['brand' => 'visa', 'last4' => '4242']]);
        $this->call('POST', '/api/v1/payments/webhooks/fake', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'HTTP_X_FAKE_SIGNATURE' => FakeCardGateway::sign($body),
        ], $body)->assertOk();

        return $payment->refresh();
    }

    public function test_list_shows_only_what_the_list_needs_with_search_filters_and_pages(): void
    {
        $this->travelTo(Carbon::parse('2026-11-05 21:30:00', 'UTC')); // 23:30 on 5 November in Cairo
        [$first] = $this->order('cod', 3);
        $alex = Governorate::factory()->deliverable()->create(['name_en' => 'Alexandria', 'name_ar' => 'الإسكندرية']);
        $this->travelTo(Carbon::parse('2026-11-05 22:30:00', 'UTC')); // 00:30 on 6 November in Cairo
        [$second] = $this->order('card', 1, [
            'contact' => ['first_name' => 'Omar', 'last_name' => 'Fathy', 'email' => 'omar@example.com', 'phone' => '01122334455'],
            'address' => ['governorate_id' => $alex->id],
        ]);
        $this->as(AdminRole::Support);

        $list = $this->getJson('/api/v1/admin/orders')->assertOk();
        $this->assertSame([$second->order_number, $first->order_number], array_column($list->json('data'), 'order_number'));
        $row = $list->json('data.1');
        // 3 × 450 + 50 shipping + 10 COD fee.
        $this->assertSame([3, 1, 141000, 'Cairo', 'pending_confirmation', 'unpaid', 'cod', 'Mona'],
            [$row['items_count'], $row['lines_count'], $row['total']['amount_piastres'], $row['governorate']['en'], $row['status'], $row['payment_status'], $row['payment_method'], $row['customer']['first_name']]);
        foreach (['contact', 'shipping_address', 'items', 'admin_note', 'payments', 'history'] as $hidden) {
            $this->assertArrayNotHasKey($hidden, $row, "The list does not include {$hidden}.");
        }
        $this->assertArrayNotHasKey('email', $row['customer']);
        $this->assertEqualsCanonicalizing(['Cairo', 'Alexandria'], array_column($list->json('options.governorates'), 'en'));

        $numbers = fn (string $q) => array_column($this->getJson('/api/v1/admin/orders?'.$q)->assertOk()->json('data'), 'order_number');
        $this->assertSame([$first->order_number], $numbers('search='.$first->order_number));
        $this->assertSame([$second->order_number], $numbers('search=Omar'));
        $this->assertSame([$second->order_number], $numbers('search='.urlencode('Omar Fathy')));
        $this->assertSame([$second->order_number], $numbers('search=01122334455'));
        // Both: the first order's contact phone, and the second order's delivery phone (left at the default).
        $this->assertEqualsCanonicalizing([$first->order_number, $second->order_number], $numbers('search='.urlencode('+201012345678')));
        $this->assertSame([$second->order_number], $numbers('status=pending_payment'));
        $this->assertSame([$first->order_number], $numbers('payment_method=cod'));
        $this->assertSame([$first->order_number, $second->order_number], array_reverse($numbers('payment_status=unpaid')));
        $this->assertSame([$second->order_number], $numbers("governorate_id={$alex->id}"));
        $this->assertSame([$first->order_number], $numbers('from=2026-11-05&to=2026-11-05'));
        $this->assertSame([$second->order_number], $numbers('from=2026-11-06'));
        $this->getJson('/api/v1/admin/orders?from=2026-11-06&to=2026-11-01')->assertUnprocessable();
        $this->getJson('/api/v1/admin/orders?per_page=1&page=2')->assertJsonPath('meta.current_page', 2)->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.order_number', $first->order_number);
    }

    public function test_details_use_the_historical_snapshot(): void
    {
        [$order] = $this->order('cod', 2);
        $product = $this->variant->product;
        // The catalogue changes after the order: name, price, and the product is archived.
        $product->update(['name_en' => 'Renamed later']);
        $this->variant->update(['price_piastres' => 99900]);
        $product->delete();
        $this->as(AdminRole::Support);

        $data = $this->getJson("/api/v1/admin/orders/{$order->order_number}")->assertOk()->json('data');
        $item = $data['items'][0];
        $this->assertSame([45000, 2, 90000, $this->variant->sku], [$item['unit_price']['amount_piastres'], $item['quantity'], $item['line_total']['amount_piastres'], $item['sku']]);
        $this->assertNotSame('Renamed later', $item['product_name']['en']);
        $this->assertSame([90000, 5000, 1000, 0, 96000], array_map(fn ($k) => $data['totals'][$k]['amount_piastres'], ['subtotal', 'shipping_fee', 'cod_fee', 'discount', 'total']));
        $this->assertSame([0, 96000], [$data['amounts']['received']['amount_piastres'], $data['amounts']['outstanding']['amount_piastres']]);
        $this->assertSame('Nasr City', $data['shipping_address']['city']);
        $this->assertSame('mona@example.com', $data['contact']['email']);
        $this->assertSame([['order_reserved', -2]], array_map(fn ($m) => [$m['reason'], $m['quantity_change']], $data['stock_movements']));
        $this->assertSame([null, 'pending_confirmation'], [$data['history'][0]['from'], $data['history'][0]['to']]);
        $this->assertSame([], $data['warnings']);
        // Support may look, not act.
        $this->assertSame([], $data['actions']['statuses']);
        $this->assertFalse($data['actions']['cod_collect'] || $data['actions']['edit_note']);
    }

    public function test_cod_order_actions_follow_the_state_machine_and_cash_is_recorded_once(): void
    {
        [$order] = $this->order('cod', 2);
        $admin = $this->as(AdminRole::SuperAdmin);
        $actions = fn () => $this->getJson("/api/v1/admin/orders/{$order->order_number}")->json('data.actions');

        $this->assertSame(['confirmed', 'cancelled'], $actions()['statuses']);
        $this->setStatus($order, ['status' => 'delivered'])->assertUnprocessable()->assertJsonValidationErrors('status');
        foreach (['confirmed' => ['processing', 'cancelled'], 'processing' => ['shipped', 'cancelled'], 'shipped' => ['delivered', 'returned'], 'delivered' => []] as $to => $next) {
            $current = $order->refresh()->status->value;
            $this->setStatus($order, ['status' => $to, 'expected_status' => $current])->assertOk()->assertJsonPath('data.status', $to)
                ->assertJsonPath('data.actions.statuses', $next);
        }
        $this->assertTrue($actions()['cod_collect']);
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected", ['note' => 'Courier paid', 'expected_payment_status' => 'unpaid'])
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.amounts.received.amount_piastres', 96000)
            ->assertJsonPath('data.amounts.outstanding.amount_piastres', 0)
            ->assertJsonPath('data.payments.0.collected_by.name', $admin->name)
            ->assertJsonPath('data.actions.cod_collect', false);
        // A second click: the stale check answers first, and the rule refuses it anyway.
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected", ['expected_payment_status' => 'unpaid'])->assertStatus(409);
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected")->assertUnprocessable();
        $this->assertSame(1, Payment::where('status', 'succeeded')->count());
        $this->assertSame(18, $this->variant->refresh()->stock_quantity);
    }

    public function test_cancelling_needs_a_reason_restores_stock_once_and_refuses_stale_actions(): void
    {
        [$order] = $this->order('cod', 3);
        $this->as(AdminRole::StoreManager);

        $this->setStatus($order, ['status' => 'cancelled'])->assertUnprocessable()->assertJsonValidationErrors('note');
        // Another admin confirmed the order after this admin opened it.
        $this->setStatus($order, ['status' => 'confirmed'])->assertOk();
        $this->setStatus($order, ['status' => 'cancelled', 'note' => 'Out of area', 'expected_status' => 'pending_confirmation'])
            ->assertStatus(409)->assertJsonPath('current_status', 'confirmed');
        $this->assertSame('confirmed', $order->refresh()->status->value);
        $this->assertSame(17, $this->variant->refresh()->stock_quantity);

        $this->setStatus($order, ['status' => 'cancelled', 'note' => 'Customer asked', 'expected_status' => 'confirmed'])->assertOk()
            ->assertJsonPath('data.cancellation_reason', 'Customer asked')
            ->assertJsonPath('data.amounts.outstanding.amount_piastres', 0)
            ->assertJsonPath('data.actions.statuses', []);
        $this->setStatus($order, ['status' => 'cancelled', 'note' => 'Again', 'expected_status' => 'confirmed'])->assertStatus(409);
        $this->setStatus($order, ['status' => 'cancelled', 'note' => 'Again'])->assertUnprocessable();

        $this->assertSame(20, $this->variant->refresh()->stock_quantity);
        $this->assertSame(1, InventoryMovement::where('order_id', $order->id)->where('reason', 'order_released')->count());
    }

    public function test_card_orders_only_offer_what_the_rules_allow(): void
    {
        [$order, $token] = $this->order('card', 1);
        $this->as(AdminRole::StoreManager);
        $this->assertSame(['cancelled'], $this->getJson("/api/v1/admin/orders/{$order->order_number}")->json('data.actions.statuses'),
            'An unpaid card order is confirmed by its payment, not by an admin.');
        $this->setStatus($order, ['status' => 'confirmed'])->assertUnprocessable();

        $payment = $this->pay($order, $token);
        $this->as(AdminRole::StoreManager);
        $data = $this->getJson("/api/v1/admin/orders/{$order->order_number}")->assertOk()->json('data');
        $this->assertSame(['confirmed', 'paid'], [$data['status'], $data['payment_status']]);
        $this->assertSame(['processing'], $data['actions']['statuses'], 'A paid card order cannot be cancelled until refunds exist.');
        $this->assertFalse($data['actions']['cod_collect']);
        $this->assertSame([$payment->merchant_reference, $payment->provider_transaction_id, 'visa', '4242', 'succeeded'],
            [$data['payments'][0]['merchant_reference'], $data['payments'][0]['provider_transaction_id'], $data['payments'][0]['card_brand'], $data['payments'][0]['card_last4'], $data['payments'][0]['status']]);
        $this->assertSame([45000 + 5000, 0], [$data['amounts']['received']['amount_piastres'], $data['amounts']['outstanding']['amount_piastres']]);
        $this->setStatus($order, ['status' => 'cancelled', 'note' => 'x'])->assertUnprocessable();
    }

    public function test_expired_order_paid_late_is_flagged_for_a_refund_and_offers_no_actions(): void
    {
        [$order, $token] = $this->order('card', 2);
        $this->app['auth']->forgetGuards();
        $reference = $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->json('data.merchant_reference');
        $this->travel(31)->minutes();
        $this->artisan('orders:expire-unpaid')->assertSuccessful();
        $this->assertSame(20, $this->variant->refresh()->stock_quantity);

        // The provider confirms the old attempt after the order expired.
        $payment = Payment::where('merchant_reference', $reference)->sole();
        $body = json_encode(['event_id' => 'evt_late', 'type' => 'payment.updated', 'merchant_reference' => $reference, 'transaction_id' => 'txn_late',
            'status' => 'succeeded', 'amount_piastres' => $payment->amount_piastres, 'currency' => 'EGP', 'card' => ['brand' => 'visa', 'last4' => '4242']]);
        $this->call('POST', '/api/v1/payments/webhooks/fake', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_FAKE_SIGNATURE' => FakeCardGateway::sign($body)], $body)->assertOk();

        $this->as(AdminRole::SuperAdmin);
        $data = $this->getJson("/api/v1/admin/orders/{$order->order_number}")->assertOk()->json('data');
        $this->assertSame(['expired', 'paid'], [$data['status'], $data['payment_status']]);
        // The automated tests pay through the fake gateway, whose attempts are marked as test payments.
        $this->assertSame(['refund_may_be_due', 'test_payment'], $data['warnings']);
        $this->assertSame([], $data['actions']['statuses']);
        $this->assertSame(0, $data['amounts']['outstanding']['amount_piastres']);
        $this->assertStringContainsString('Refund or reinstate', collect($data['history'])->last()['note']);
        $this->assertFalse(collect($data['history'])->last()['customer_visible']);
        $this->assertSame(20, $this->variant->refresh()->stock_quantity, 'The late payment does not take the stock again.');
        $this->assertTrue($this->getJson('/api/v1/admin/orders?search='.$order->order_number)->json('data.0.refund_review'));
    }

    public function test_a_second_successful_payment_is_flagged_as_duplicate(): void
    {
        [$order, $token] = $this->order('card', 1);
        // Two attempts started (the first is abandoned), then the provider completes both.
        $first = $this->startPayment($order, $token);
        $second = $this->startPayment($order, $token);
        $this->succeed($second);
        $this->succeed($first);

        $this->as(AdminRole::StoreManager);
        $data = $this->getJson("/api/v1/admin/orders/{$order->order_number}")->json('data');
        $this->assertContains('duplicate_payment', $data['warnings']);
        $this->assertSame(100000, $data['amounts']['received']['amount_piastres']);
    }

    public function test_returned_goods_restock_action_appears_once(): void
    {
        [$order] = $this->order('cod', 2);
        $this->as(AdminRole::StoreManager);
        foreach (['confirmed', 'processing', 'shipped', 'returned'] as $to) {
            $this->setStatus($order, ['status' => $to])->assertOk();
        }
        $this->assertTrue($this->getJson("/api/v1/admin/orders/{$order->order_number}")->json('data.actions.restock_returned'));
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/restock-returned", ['note' => 'Tins sealed'])->assertOk();
        $this->assertFalse($this->getJson("/api/v1/admin/orders/{$order->order_number}")->json('data.actions.restock_returned'));
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/restock-returned", ['note' => 'Again'])->assertUnprocessable();
        $this->assertSame(20, $this->variant->refresh()->stock_quantity);
    }

    public function test_actions_never_change_the_historical_items(): void
    {
        [$order] = $this->order('cod', 2);
        $before = OrderItem::where('order_id', $order->id)->get()->toArray();
        $this->as(AdminRole::SuperAdmin);

        $this->setStatus($order, ['status' => 'confirmed'])->assertOk();
        $this->patchJson("/api/v1/admin/orders/{$order->order_number}/note", ['admin_note' => 'Call first', 'items' => [], 'total_piastres' => 1])->assertOk();
        $this->setStatus($order, ['status' => 'cancelled', 'note' => 'Test', 'total_piastres' => 1])->assertOk();

        $this->assertSame($before, OrderItem::where('order_id', $order->id)->get()->toArray());
        $this->assertSame(96000, $order->refresh()->total_piastres);
        $this->deleteJson("/api/v1/admin/orders/{$order->order_number}")->assertStatus(405);
        $this->assertNotNull($order->fresh());
    }

    public function test_permissions(): void
    {
        [$order] = $this->order('cod', 1);
        $n = $order->order_number;
        $view = [['getJson', '/api/v1/admin/orders', []], ['getJson', "/api/v1/admin/orders/{$n}", []]];
        $act = [
            ['postJson', "/api/v1/admin/orders/{$n}/status", ['status' => 'confirmed']],
            ['patchJson', "/api/v1/admin/orders/{$n}/note", ['admin_note' => 'x']],
            ['postJson', "/api/v1/admin/orders/{$n}/cod-collected", []],
            ['postJson', "/api/v1/admin/orders/{$n}/restock-returned", ['note' => 'x']],
        ];

        $this->app['auth']->forgetGuards();
        foreach ([...$view, ...$act] as [$method, $url, $body]) {
            $this->fromFrontend()->{$method}($url, $body)->assertUnauthorized();
        }
        $this->as(AdminRole::ContentEditor);
        foreach ([...$view, ...$act] as [$method, $url, $body]) {
            $this->{$method}($url, $body)->assertForbidden();
        }
        $this->as(AdminRole::Support);
        foreach ($view as [$method, $url, $body]) {
            $this->{$method}($url, $body)->assertOk();
        }
        foreach ($act as [$method, $url, $body]) {
            $this->{$method}($url, $body)->assertForbidden();
        }
        $this->actingAs(AdminUser::factory()->superAdmin()->inactive()->create(), 'admin')->fromFrontend();
        $this->getJson('/api/v1/admin/orders')->assertForbidden();

        $this->assertSame(['pending_confirmation', null], [$order->refresh()->status->value, $order->admin_note]);
    }
}
