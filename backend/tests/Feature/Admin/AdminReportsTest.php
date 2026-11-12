<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\InventoryReason;
use App\Models\AdminUser;
use App\Models\Governorate;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Payments\FakeCardGateway;
use App\Services\InventoryService;
use App\Services\SettingsService;
use App\Support\CsvExport;
use App\Support\XlsxWorkbook;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/**
 * Phase 7: read-only reports and CSV exports (test database only).
 *
 * The timeline (Egyptian time; November is UTC+2). Period under test: 3–4 November 2026.
 * Every order is 1 unit at EGP 450 + EGP 50 shipping (+ EGP 10 COD fee): COD 51000, card 50000 piastres.
 *  A  COD  2 Nov 23:59:59  (outside, one second before the period)
 *  B  COD  3 Nov 00:00:00  delivered, cash collected 4 Nov
 *  C  COD  3 Nov           delivered, cash NOT collected
 *  D  card 3 Nov           awaiting payment
 *  E  card 3 Nov           paid with a test (simulated) payment
 *  G  COD  3 Nov (Giza)    cancelled
 *  H  card 3 Nov           two successful real payments (duplicate)
 *  R  card 3 Nov           paid (real), shipped, returned 4 Nov (refunds are not recorded)
 *  I  COD  5 Nov 00:00:00  (outside, first second after the period)
 */
class AdminReportsTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private const PERIOD = 'from=2026-11-03&to=2026-11-04';

    private ProductVariant $product;

    private Governorate $giza;

    /** @var array<string, Order> */
    private array $orders = [];

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        config(['payments.drivers' => ['fake' => FakeCardGateway::class]]);
        FakeCardGateway::$results = [];
        $this->openStore(codFee: 1000);
        app(SettingsService::class)->update(['store.card_provider' => 'fake', 'store.card_payments_enabled' => true]);
        $this->giza = Governorate::factory()->deliverable(5000)->create(['name_en' => 'Giza', 'name_ar' => 'الجيزة']);
        $this->product = $this->variant(stock: 50, price: 45000);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function at(string $cairo): void
    {
        Carbon::setTestNow(Carbon::parse($cairo, 'Africa/Cairo')->utc());
    }

    private function asAdmin(AdminRole $role = AdminRole::StoreManager): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    /** @return array{0: Order, 1: string} a guest order and its access token */
    private function order(string $method, array $overrides = []): array
    {
        $this->app['auth']->forgetGuards();
        $response = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->product->id => 1], ['payment_method' => $method, ...$overrides]))->assertCreated();

        return [Order::where('order_number', $response->json('data.order_number'))->sole(), $response->json('meta.guest_access_token')];
    }

    private function startPayment(Order $order, string $token): string
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->assertCreated()->json('data.merchant_reference');
    }

    private function succeed(string $reference): void
    {
        $payment = Payment::where('merchant_reference', $reference)->sole();
        $body = json_encode(['event_id' => 'evt_'.Str::random(10), 'type' => 'payment.updated', 'merchant_reference' => $reference,
            'transaction_id' => 'txn_'.Str::random(8), 'status' => 'succeeded', 'amount_piastres' => $payment->amount_piastres,
            'currency' => 'EGP', 'card' => ['brand' => 'visa', 'last4' => '4242']]);
        $this->call('POST', '/api/v1/payments/webhooks/fake', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'HTTP_X_FAKE_SIGNATURE' => FakeCardGateway::sign($body),
        ], $body)->assertOk();
    }

    /** The test gateway marks its payments as test payments; this fixture stands in for a real gateway. */
    private function markReal(Order $order): void
    {
        Payment::where('order_id', $order->id)->update(['is_test' => false]);
    }

    private function moveTo(Order $order, array $statuses): void
    {
        $this->asAdmin(AdminRole::SuperAdmin);
        foreach ($statuses as $status) {
            $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", ['status' => $status, 'note' => 'Report test'])->assertOk();
        }
    }

    private function buildTimeline(): void
    {
        $this->at('2026-11-02 23:59:59');
        [$this->orders['A']] = $this->order('cod');

        $this->at('2026-11-03 00:00:00');
        [$this->orders['B']] = $this->order('cod');
        $this->at('2026-11-03 09:00:00');
        [$this->orders['C']] = $this->order('cod');
        [$this->orders['D']] = $this->order('card');
        [$this->orders['E'], $token] = $this->order('card');
        $this->succeed($this->startPayment($this->orders['E'], $token));
        [$this->orders['G']] = $this->order('cod', ['address' => ['governorate_id' => $this->giza->id]]);
        $this->moveTo($this->orders['G'], ['cancelled']);
        [$this->orders['H'], $token] = $this->order('card');
        $first = $this->startPayment($this->orders['H'], $token);
        $second = $this->startPayment($this->orders['H'], $token);
        $this->succeed($first);
        $this->succeed($second);
        $this->markReal($this->orders['H']);
        [$this->orders['R'], $token] = $this->order('card');
        $this->succeed($this->startPayment($this->orders['R'], $token));
        $this->markReal($this->orders['R']);
        $this->moveTo($this->orders['B'], ['confirmed', 'processing', 'shipped', 'delivered']);
        $this->moveTo($this->orders['C'], ['confirmed', 'processing', 'shipped', 'delivered']);
        $this->moveTo($this->orders['R'], ['processing', 'shipped']);

        $this->at('2026-11-04 10:00:00');
        $this->postJson("/api/v1/admin/orders/{$this->orders['B']->order_number}/cod-collected", [])->assertOk();
        $this->moveTo($this->orders['R'], ['returned']);

        $this->at('2026-11-05 00:00:00');
        [$this->orders['I']] = $this->order('cod');
        $this->at('2026-11-06 12:00:00');
        foreach ($this->orders as $order) {
            $order->refresh();
        }
    }

    /** @return list<list<string>> */
    private function csv(TestResponse $response): array
    {
        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);

        return array_map(fn (string $line) => str_getcsv($line, escape: ''), array_values(array_filter(explode("\n", substr($content, 3)), fn ($l) => $l !== '')));
    }

    // --- Access ---------------------------------------------------------------------------------

    public function test_reports_need_orders_view_and_payments_manage_and_inventory_needs_inventory_manage(): void
    {
        $urls = ['sales', 'orders', 'products', 'inventory', 'sales/export', 'orders/export', 'products/export', 'inventory/export'];

        foreach ($urls as $url) {
            $this->getJson("/api/v1/admin/reports/{$url}?".self::PERIOD)->assertUnauthorized();
        }
        // Support can see orders but not money; content editors neither.
        foreach ([AdminRole::Support, AdminRole::ContentEditor] as $role) {
            $this->asAdmin($role);
            foreach ($urls as $url) {
                $this->getJson("/api/v1/admin/reports/{$url}?".self::PERIOD)->assertForbidden();
            }
        }
        foreach ([AdminRole::StoreManager, AdminRole::SuperAdmin] as $role) {
            $this->asAdmin($role);
            foreach ($urls as $url) {
                $this->get("/api/v1/admin/reports/{$url}?".self::PERIOD, ['Accept' => 'application/json'])->assertOk();
            }
        }
        // Read-only: nothing but GET exists.
        $this->postJson('/api/v1/admin/reports/sales?'.self::PERIOD)->assertMethodNotAllowed();
    }

    public function test_dates_are_validated(): void
    {
        $this->asAdmin();
        $this->getJson('/api/v1/admin/reports/sales')->assertUnprocessable()->assertJsonValidationErrors(['from', 'to']);
        $this->getJson('/api/v1/admin/reports/sales?from=2026-11-05&to=2026-11-01')->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson('/api/v1/admin/reports/sales?from=2025-01-01&to=2026-11-01')->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson('/api/v1/admin/reports/sales?from=2026-02-30&to=2026-03-01')->assertUnprocessable()->assertJsonValidationErrors('from');
        $this->getJson('/api/v1/admin/reports/orders?'.self::PERIOD.'&status=lost&payment_method=cash')
            ->assertUnprocessable()->assertJsonValidationErrors(['status', 'payment_method']);
        $this->get('/api/v1/admin/reports/orders/export?'.self::PERIOD.'&lang=fr', ['Accept' => 'application/json'])->assertUnprocessable();
    }

    // --- Sales ----------------------------------------------------------------------------------

    public function test_sales_separates_order_value_collected_payments_outstanding_and_refund_review(): void
    {
        $this->buildTimeline();
        $this->asAdmin();

        $sales = $this->getJson('/api/v1/admin/reports/sales?'.self::PERIOD)->assertOk()->json('data');

        $this->assertSame(['from' => '2026-11-03', 'to' => '2026-11-04', 'timezone' => 'Africa/Cairo', 'days' => 2, 'grouping' => 'day'], $sales['period']);
        $this->assertSame(['count' => 7, 'value_piastres' => 353000], $sales['orders']['placed']);
        $this->assertSame(['count' => 4, 'value_piastres' => 201000], $sales['orders']['paid']);
        $this->assertSame(['count' => 2, 'value_piastres' => 102000], $sales['orders']['by_status']['delivered']);
        $this->assertSame(['count' => 1, 'value_piastres' => 51000], $sales['orders']['by_status']['cancelled']);
        $this->assertSame(['count' => 1, 'value_piastres' => 50000], $sales['orders']['by_status']['returned']);
        $this->assertSame(['count' => 1, 'value_piastres' => 50000], $sales['orders']['by_status']['pending_payment']);
        $this->assertSame(['count' => 0, 'value_piastres' => 0], $sales['orders']['by_status']['expired']);

        // Real successful payments only: B's cash (4 Nov), H twice and R (3 Nov). E's test payment is apart;
        // C (delivered, cash not recorded) and D (card awaiting payment) are not collected.
        $this->assertSame(['count' => 4, 'amount_piastres' => 201000], $sales['payments']['collected']);
        $this->assertSame(['count' => 1, 'amount_piastres' => 50000], $sales['payments']['test']);
        $this->assertSame(['count' => 1, 'amount_piastres' => 50000], $sales['payments']['refund_review']);
        $this->assertSame(['orders_count' => 1, 'extra_piastres' => 50000], $sales['payments']['possible_duplicates']);

        $this->assertSame(['count' => 2, 'value_piastres' => 101000], $sales['outstanding']['total']);
        $this->assertSame(['count' => 1, 'value_piastres' => 50000], $sales['outstanding']['card_awaiting_payment']);
        $this->assertSame(['count' => 1, 'value_piastres' => 51000], $sales['outstanding']['cod_not_collected']);
        $this->assertSame(['count' => 1, 'value_piastres' => 51000], $sales['outstanding']['cod_delivered_not_collected']);

        $this->assertSame([
            ['method' => 'card', 'orders_count' => 4, 'order_value_piastres' => 200000, 'collected_count' => 3, 'collected_piastres' => 150000],
            ['method' => 'cod', 'orders_count' => 3, 'order_value_piastres' => 153000, 'collected_count' => 1, 'collected_piastres' => 51000],
        ], $sales['by_method']);

        $this->assertSame([
            ['period' => '2026-11-03', 'orders_count' => 7, 'order_value_piastres' => 353000, 'collected_piastres' => 150000],
            ['period' => '2026-11-04', 'orders_count' => 0, 'order_value_piastres' => 0, 'collected_piastres' => 51000],
        ], $sales['trend']);
    }

    public function test_cash_counts_as_collected_only_once_it_is_recorded(): void
    {
        $this->at('2026-11-03 10:00:00');
        [$order] = $this->order('cod');
        $this->moveTo($order, ['confirmed', 'processing', 'shipped', 'delivered']);
        $this->asAdmin();
        $collected = fn () => $this->getJson('/api/v1/admin/reports/sales?'.self::PERIOD)->json('data.payments.collected');

        $this->assertSame(['count' => 0, 'amount_piastres' => 0], $collected());
        $this->assertSame(1, $this->getJson('/api/v1/admin/reports/sales?'.self::PERIOD)->json('data.outstanding.cod_delivered_not_collected.count'));

        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected", [])->assertOk();
        $this->assertSame(['count' => 1, 'amount_piastres' => 51000], $collected());
        $this->assertSame(0, $this->getJson('/api/v1/admin/reports/sales?'.self::PERIOD)->json('data.outstanding.total.count'));
    }

    public function test_cairo_day_boundaries_never_lose_or_double_count_an_order(): void
    {
        $this->buildTimeline();
        $this->asAdmin();
        $placed = fn (string $from, string $to) => $this->getJson("/api/v1/admin/reports/sales?from={$from}&to={$to}")->json('data.orders.placed.count');

        $this->assertSame(1, $placed('2026-11-02', '2026-11-02'));   // A at 23:59:59
        $this->assertSame(7, $placed('2026-11-03', '2026-11-03'));   // B at 00:00:00 belongs to the 3rd
        $this->assertSame(1, $placed('2026-11-05', '2026-11-05'));   // I at 00:00:00 belongs to the 5th
        $this->assertSame(9, $placed('2026-11-01', '2026-11-30'));
        $this->assertSame($placed('2026-11-01', '2026-11-30'),
            $placed('2026-11-01', '2026-11-02') + $placed('2026-11-03', '2026-11-04') + $placed('2026-11-05', '2026-11-30'));

        $long = $this->getJson('/api/v1/admin/reports/sales?from=2026-01-01&to=2026-12-31')->assertOk()->json('data');
        $this->assertSame('month', $long['period']['grouping']);
        $this->assertCount(12, $long['trend']);
        $this->assertSame(['period' => '2026-11', 'orders_count' => 9, 'order_value_piastres' => 455000, 'collected_piastres' => 201000], $long['trend'][10]);
    }

    // --- Orders ---------------------------------------------------------------------------------

    public function test_orders_report_filters_pages_and_uses_the_saved_totals(): void
    {
        $this->buildTimeline();
        $this->asAdmin();
        // Today's fee changes must not affect what the orders were charged.
        $this->governorate->update(['shipping_fee_piastres' => 99900]);
        $numbers = fn (string $q = '') => array_column($this->getJson('/api/v1/admin/reports/orders?'.self::PERIOD.'&per_page=100'.$q)->assertOk()->json('data'), 'order_number');
        $o = fn (string ...$keys) => array_map(fn ($k) => $this->orders[$k]->order_number, $keys);

        $this->assertEqualsCanonicalizing($o('B', 'C', 'D', 'E', 'G', 'H', 'R'), $numbers());
        $this->assertEqualsCanonicalizing($o('B', 'C'), $numbers('&status=delivered'));
        $this->assertEqualsCanonicalizing($o('B', 'E', 'H', 'R'), $numbers('&payment_status=paid'));
        $this->assertEqualsCanonicalizing($o('D', 'E', 'H', 'R'), $numbers('&payment_method=card'));
        $this->assertEqualsCanonicalizing($o('G'), $numbers("&governorate_id={$this->giza->id}"));

        $page = $this->getJson('/api/v1/admin/reports/orders?'.self::PERIOD.'&per_page=3&page=3')->assertOk();
        $page->assertJsonPath('meta.total', 7)->assertJsonPath('meta.last_page', 3)->assertJsonCount(1, 'data');
        $page->assertJsonPath('meta.summary', [
            'count' => 7, 'value_piastres' => 353000,
            'paid' => ['count' => 4, 'value_piastres' => 201000],
            'outstanding' => ['count' => 2, 'value_piastres' => 101000],
        ]);
        $row = $page->json('data.0');
        $this->assertSame(['order_number', 'placed_at', 'customer_name', 'governorate', 'status', 'payment_status', 'payment_method', 'total_piastres'], array_keys($row));
        $this->assertSame([$this->orders['B']->order_number, 51000, 'Mona Hassan'], [$row['order_number'], $row['total_piastres'], $row['customer_name']]);
    }

    public function test_orders_export_matches_the_filters_and_is_safe_for_spreadsheets(): void
    {
        $this->buildTimeline();
        $this->orders['G']->forceFill(['customer_first_name' => '=HYPERLINK("http://x")', 'customer_last_name' => '+1'])->save();
        $this->asAdmin();

        $response = $this->get('/api/v1/admin/reports/orders/export?'.self::PERIOD.'&payment_method=cod');
        $response->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('jovie-orders-report_2026-11-03_to_2026-11-04.csv', $response->headers->get('Content-Disposition'));

        $rows = $this->csv($response);
        $this->assertSame(['Order number', 'Order date (Cairo)', 'Customer name', 'Governorate', 'Order status', 'Payment status', 'Payment method', 'Total (EGP)'], $rows[0]);
        $this->assertCount(4, $rows); // B, C, G (oldest first)
        $this->assertSame([$this->orders['B']->order_number, '2026-11-03 00:00', 'Mona Hassan', 'Cairo', 'Delivered', 'Paid', 'Cash on delivery', '510.00'], $rows[1]);
        $this->assertSame('\'=HYPERLINK("http://x") +1', $rows[3][2]);
        $this->assertStringNotContainsString('mona@example.com', $response->streamedContent());
        $this->assertStringNotContainsString('01012345678', $response->streamedContent());

        $arabic = $this->csv($this->get('/api/v1/admin/reports/orders/export?'.self::PERIOD.'&payment_method=cod&lang=ar'));
        $this->assertSame('رقم الطلب', $arabic[0][0]);
        $this->assertSame(['القاهرة', 'تم التسليم', 'مدفوع', 'الدفع عند الاستلام'], array_slice($arabic[1], 3, 4));
        $this->assertSame(['الجيزة', 'ملغى'], array_slice($arabic[3], 3, 2));
    }

    public function test_sales_export_has_the_same_figures(): void
    {
        $this->buildTimeline();
        $this->asAdmin();

        $rows = $this->csv($this->get('/api/v1/admin/reports/sales/export?'.self::PERIOD));
        $this->assertSame(['Metric', 'Value'], $rows[0]);
        $values = array_column(array_filter($rows, fn ($r) => count($r) === 2), 1, 0);
        $this->assertSame('7', $values['Orders placed']);
        $this->assertSame('3530.00', $values['Order value (EGP)']);
        $this->assertSame('2010.00', $values['Collected payments (EGP)']);
        $this->assertSame('1010.00', $values['Outstanding (EGP)']);
        $this->assertSame('500.00', $values['Test payments, not real money (EGP)']);
        $this->assertContains(['2026-11-04', '0', '0.00', '510.00'], $rows);
    }

    // --- Products -------------------------------------------------------------------------------

    public function test_products_use_the_order_item_snapshots_not_todays_prices(): void
    {
        $unsold = $this->variant(stock: 4, price: 30000);
        $this->buildTimeline();
        $this->product->forceFill(['price_piastres' => 99900])->save();
        $this->asAdmin();

        $rows = collect($this->getJson('/api/v1/admin/reports/products?'.self::PERIOD)->assertOk()->json('data'))->keyBy('variant_id');

        // B, C, D, E, H, R count as ordered; G (cancelled) does not; R is also counted as returned.
        $sold = $rows[$this->product->id];
        $this->assertSame([6, 6, 270000, 1, 1, 99900, $this->product->refresh()->stock_quantity],
            [$sold['units_ordered'], $sold['orders_count'], $sold['gross_value_piastres'], $sold['returned_units'], $sold['cancelled_units'],
                $sold['current_price_piastres'], $sold['current_stock']]);
        $this->assertSame([0, 0, 0, 30000], [$rows[$unsold->id]['units_ordered'], $rows[$unsold->id]['orders_count'],
            $rows[$unsold->id]['gross_value_piastres'], $rows[$unsold->id]['current_price_piastres']]);
        $this->assertSame($this->product->id, $rows->keys()->first(), 'Best sellers first.');
        $this->assertSame(270000, (int) OrderItem::whereIn('order_id', array_map(fn ($k) => $this->orders[$k]->id, ['B', 'C', 'D', 'E', 'H', 'R']))->sum('line_total_piastres'));

        $csv = $this->csv($this->get('/api/v1/admin/reports/products/export?'.self::PERIOD.'&lang=ar'));
        $this->assertSame('الكمية المطلوبة', $csv[0][2]);
        $this->assertSame(['6', '6', '2700.00', '1', '1', '999.00'], array_slice($csv[1], 2, 6));
    }

    // --- Inventory ------------------------------------------------------------------------------

    public function test_inventory_report_summarises_movements_with_opening_and_closing_stock(): void
    {
        $inventory = app(InventoryService::class);
        $tracked = Product::factory()->sellable(0, 20000)->create()->variants()->sole();
        $tracked->forceFill(['low_stock_threshold' => 40])->save();
        $this->at('2026-11-01 12:00:00');
        $inventory->adjust($tracked, 20, InventoryReason::InitialStock);
        $this->at('2026-11-03 00:00:00');
        $inventory->adjust($tracked, 10, InventoryReason::Restock);
        $this->at('2026-11-04 23:59:59');
        $inventory->adjust($tracked, -2, InventoryReason::WriteOff, note: 'Damaged');
        $this->at('2026-11-05 00:00:00');
        $inventory->adjust($tracked, 5, InventoryReason::Restock);
        $empty = Product::factory()->sellable(0)->create()->variants()->sole();
        $this->at('2026-11-06 12:00:00');
        $movementsBefore = InventoryMovement::count();
        $this->asAdmin();

        $report = $this->getJson('/api/v1/admin/reports/inventory?'.self::PERIOD)->assertOk()->json('data');
        $rows = collect($report['rows'])->keyBy('variant_id');

        $this->assertSame([33, 'low_stock', 20, 10, 2, 28, 2, true], [
            $rows[$tracked->id]['current_stock'], $rows[$tracked->id]['stock_status'], $rows[$tracked->id]['opening_stock'],
            $rows[$tracked->id]['increase'], $rows[$tracked->id]['decrease'], $rows[$tracked->id]['closing_stock'],
            $rows[$tracked->id]['movements'], $rows[$tracked->id]['history_complete'],
        ]);
        // Stock set without any movement (the test factory does that): opening/closing are not guessed.
        $this->assertSame([50, false, null, null], [$rows[$this->product->id]['current_stock'], $rows[$this->product->id]['history_complete'],
            $rows[$this->product->id]['opening_stock'], $rows[$this->product->id]['closing_stock']]);
        $this->assertSame('out_of_stock', $rows[$empty->id]['stock_status']);
        $this->assertSame(['increase' => 10, 'decrease' => 0, 'count' => 1], $report['reasons']['restock']);
        $this->assertSame(['increase' => 0, 'decrease' => 2, 'count' => 1], $report['reasons']['write_off']);
        $this->assertSame(['tracked' => 3, 'in_stock' => 1, 'low_stock' => 1, 'out_of_stock' => 1, 'increase' => 10, 'decrease' => 2], $report['summary']);

        $csv = $this->csv($this->get('/api/v1/admin/reports/inventory/export?'.self::PERIOD));
        $this->assertContains(['Movement reason', 'Increase', 'Decrease', 'Movements'], $csv);
        $this->assertContains(['Damaged or missing', '0', '2', '1'], $csv);
        $this->assertSame($movementsBefore, InventoryMovement::count(), 'Reports never record movements.');
    }

    // --- Safety ---------------------------------------------------------------------------------

    public function test_reports_and_exports_change_nothing(): void
    {
        $this->buildTimeline();
        $snapshot = fn () => [
            Order::orderBy('id')->get()->map->only(['id', 'status', 'payment_status', 'total_piastres', 'shipping_fee_piastres', 'updated_at'])->all(),
            Payment::orderBy('id')->get()->map->only(['id', 'status', 'amount_piastres', 'is_test', 'updated_at'])->all(),
            OrderItem::orderBy('id')->get()->map->only(['id', 'unit_price_piastres', 'quantity', 'line_total_piastres'])->all(),
            InventoryMovement::count(),
            ProductVariant::orderBy('id')->get()->map->only(['id', 'stock_quantity', 'price_piastres', 'updated_at'])->all(),
        ];
        $before = $snapshot();
        $this->asAdmin(AdminRole::SuperAdmin);

        foreach (['sales', 'orders', 'products', 'inventory'] as $report) {
            $this->getJson("/api/v1/admin/reports/{$report}?".self::PERIOD)->assertOk();
            $this->get("/api/v1/admin/reports/{$report}/export?".self::PERIOD)->assertOk()->streamedContent();
        }

        $this->assertEquals($before, $snapshot());
    }

    public function test_csv_cells_are_guarded_and_amounts_use_integer_piastres(): void
    {
        foreach (['=1+1', '+20101', '-cmd', '@SUM(A1)', "\tx", "\rx"] as $danger) {
            $this->assertSame("'".$danger, CsvExport::cell($danger));
        }
        $this->assertSame('-5', CsvExport::cell('-5'));
        $this->assertSame('-12.50', CsvExport::cell(CsvExport::egp(-1250)));
        $this->assertSame(-3, CsvExport::cell(-3));
        $this->assertSame('القاهرة', CsvExport::cell('القاهرة'));
        $this->assertSame(['0.00', '0.05', '520.10', '1000000.00'], array_map(CsvExport::egp(...), [0, 5, 52010, 100000000]));
    }

    // --- Excel (.xlsx) exports --------------------------------------------------------------------

    /**
     * Reads a downloaded workbook: sheet name => rows (cell values as OpenSpout reads them), plus
     * the raw XML of its worksheets for checks on formulas and right-to-left.
     *
     * @return array{sheets: array<string, list<list<mixed>>>, xml: string}
     */
    private function xlsx(TestResponse $response): array
    {
        $response->assertOk()->assertHeader('Content-Type', XlsxWorkbook::MIME);
        $path = $response->baseResponse->getFile()->getPathname();
        $this->assertSame('PK', substr((string) file_get_contents($path), 0, 2), 'A real .xlsx file is a zip package.');

        $sheets = [];
        $reader = new XlsxReader;
        $reader->open($path);
        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $sheets[$sheet->getName()][] = $row->toArray();
            }
        }
        $reader->close();

        $zip = new \ZipArchive;
        $zip->open($path);
        $xml = '';
        for ($i = 0; $i < $zip->numFiles; $i++) {
            if (str_starts_with($zip->getNameIndex($i), 'xl/worksheets/')) {
                $xml .= $zip->getFromIndex($i);
            }
        }
        $zip->close();
        @unlink($path);

        return ['sheets' => $sheets, 'xml' => $xml];
    }

    /** @param  list<list<mixed>>  $rows */
    private function valueOf(array $rows, string $label): mixed
    {
        foreach ($rows as $row) {
            if (($row[0] ?? null) === $label) {
                return $row[1];
            }
        }
        $this->fail("No row labelled \"{$label}\".");
    }

    public function test_sales_excel_has_the_report_figures_in_numbers_and_keeps_test_money_apart(): void
    {
        $this->buildTimeline();
        $this->asAdmin();
        $api = $this->getJson('/api/v1/admin/reports/sales?'.self::PERIOD)->json('data');

        $response = $this->get('/api/v1/admin/reports/sales/export?'.self::PERIOD.'&format=xlsx');
        $this->assertStringContainsString('jovie-sales-report_2026-11-03_to_2026-11-04.xlsx', $response->headers->get('Content-Disposition'));
        $book = $this->xlsx($response);

        $this->assertSame(['Summary', 'By status', 'By payment method', 'Daily trend'], array_keys($book['sheets']));
        $summary = $book['sheets']['Summary'];
        $this->assertSame('Sales & revenue report', $summary[0][0]);
        $this->assertSame(['Period', '2026-11-03 to 2026-11-04 (Africa/Cairo)'], $summary[1]);
        $this->assertSame(7, $this->valueOf($summary, 'Orders placed'));
        $this->assertEquals(3530, $this->valueOf($summary, 'Order value (EGP) — what orders are worth, not money received'));
        $this->assertEquals($api['payments']['collected']['amount_piastres'] / 100, $this->valueOf($summary, 'Collected payments (EGP, real money)'));
        $this->assertEquals(2010, $this->valueOf($summary, 'Collected payments (EGP, real money)'));
        $this->assertEquals(1010, $this->valueOf($summary, 'Outstanding (EGP)'));
        $this->assertEquals(500, $this->valueOf($summary, 'TEST payments — simulated, not real money (EGP)'));
        $this->assertSame(1, $this->valueOf($summary, 'Possible duplicate payments (orders)'));

        $byStatus = array_column(array_slice($book['sheets']['By status'], 1), null, 0);
        $this->assertSame(1, $byStatus['Cancelled'][1]);
        $this->assertSame(1, $byStatus['Returned'][1]);
        $this->assertContains(['2026-11-04', 0, 0, 510], array_map(fn ($r) => array_map(fn ($v) => is_float($v) && floor($v) === $v ? (int) $v : $v, $r), $book['sheets']['Daily trend']));
        $this->assertStringContainsString('rightToLeft="false"', $book['xml']);
    }

    public function test_orders_excel_matches_the_filters_and_is_arabic_right_to_left_and_formula_safe(): void
    {
        $this->buildTimeline();
        $this->orders['G']->forceFill(['customer_first_name' => '=HYPERLINK("http://x")', 'customer_last_name' => '+1'])->save();
        $this->asAdmin();

        $book = $this->xlsx($this->get('/api/v1/admin/reports/orders/export?'.self::PERIOD.'&payment_method=cod&format=xlsx'));
        $rows = $book['sheets']['Orders'];
        $this->assertSame(['Payment method', 'Cash on delivery'], $rows[3]);
        $headingAt = array_search('Order number', array_column($rows, 0), true);
        $this->assertSame(['Order number', 'Order date (Cairo)', 'Customer name', 'Governorate', 'Order status', 'Payment status', 'Payment method', 'Total (EGP)'], $rows[$headingAt]);
        $data = array_slice($rows, $headingAt + 1);
        $this->assertCount(3, $data); // B, C, G — the same orders as the CSV and the report
        $this->assertSame($this->orders['B']->order_number, $data[0][0]);
        $this->assertSame('2026-11-03 00:00', $data[0][1]->format('Y-m-d H:i'), 'Cairo time, as a real date');
        $this->assertSame(['Mona Hassan', 'Cairo', 'Delivered', 'Paid', 'Cash on delivery'], array_slice($data[0], 2, 5));
        $this->assertEquals(510, $data[0][7]);
        $this->assertSame('=HYPERLINK("http://x") +1', $data[2][2], 'Shown as text…');
        $this->assertStringNotContainsString('<f>', $book['xml'], '…and never stored as a formula.');
        $this->assertStringNotContainsString('mona@example.com', $book['xml']);
        $this->assertStringNotContainsString('01012345678', $book['xml']);

        $arabic = $this->xlsx($this->get('/api/v1/admin/reports/orders/export?'.self::PERIOD.'&payment_method=cod&format=xlsx&lang=ar'));
        $this->assertSame(['الطلبات'], array_keys($arabic['sheets']));
        $rows = $arabic['sheets']['الطلبات'];
        $this->assertSame('تقرير الطلبات', $rows[0][0]);
        $headingAt = array_search('رقم الطلب', array_column($rows, 0), true);
        $this->assertSame(['القاهرة', 'تم التسليم', 'مدفوع', 'الدفع عند الاستلام'], array_slice($rows[$headingAt + 1], 3, 4));
        $this->assertStringContainsString('rightToLeft="true"', $arabic['xml']);
    }

    public function test_products_and_inventory_excel_keep_snapshots_and_never_guess_history(): void
    {
        $this->buildTimeline();
        $this->asAdmin(AdminRole::SuperAdmin);

        $products = $this->xlsx($this->get('/api/v1/admin/reports/products/export?'.self::PERIOD.'&format=xlsx'))['sheets']['Products'];
        $headingAt = array_search('Product', array_column($products, 0), true);
        $this->assertSame('Gross sales value (EGP, prices at order time)', $products[$headingAt][4]);
        $this->assertContains(['Note', 'Gross sales value uses the prices saved on each order; it is not profit.'], $products);
        $row = $products[$headingAt + 1];
        $api = collect($this->getJson('/api/v1/admin/reports/products?'.self::PERIOD)->json('data'))->firstWhere('sku', $row[1]);
        $this->assertSame([$api['units_ordered'], $api['orders_count']], [$row[2], $row[3]]);
        $this->assertEquals($api['gross_value_piastres'] / 100, $row[4]);
        $this->assertSame([$api['returned_units'], $api['cancelled_units']], [$row[5], $row[6]]);
        $this->assertEquals(450, $row[7]);

        $inventory = $this->xlsx($this->get('/api/v1/admin/reports/inventory/export?'.self::PERIOD.'&format=xlsx&lang=ar'));
        $this->assertSame(['المخزون', 'الحركات حسب السبب'], array_keys($inventory['sheets']));
        $rows = $inventory['sheets']['المخزون'];
        $headingAt = array_search('المنتج', array_column($rows, 0), true);
        // The test product's stock was set without movements: opening/closing are not guessed.
        $this->assertSame(['السجل غير مكتمل', 'السجل غير مكتمل'], [$rows[$headingAt + 1][5], $rows[$headingAt + 1][8]]);
    }

    public function test_excel_exports_use_the_report_permissions_and_validate_their_filters(): void
    {
        $this->get('/api/v1/admin/reports/sales/export?'.self::PERIOD.'&format=xlsx', ['Accept' => 'application/json'])->assertUnauthorized();

        $this->asAdmin(AdminRole::Support);
        $this->getJson('/api/v1/admin/reports/orders/export?'.self::PERIOD.'&format=xlsx')->assertForbidden();
        $this->getJson('/api/v1/admin/orders/export')->assertForbidden();

        $manager = AdminUser::factory()->role(AdminRole::StoreManager)->create();
        $this->actingAs($manager, 'admin');
        $this->getJson('/api/v1/admin/reports/sales/export?'.self::PERIOD.'&format=pdf')->assertUnprocessable()->assertJsonValidationErrors('format');
        $this->getJson('/api/v1/admin/reports/sales/export?from=2026-11-04&to=2026-11-03&format=xlsx')->assertUnprocessable();
        $this->getJson('/api/v1/admin/reports/orders/export?'.self::PERIOD.'&format=xlsx&status=lost')->assertUnprocessable();

        // CSV stays the default and is unchanged.
        $this->get('/api/v1/admin/reports/sales/export?'.self::PERIOD)->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    public function test_an_empty_period_still_gives_a_valid_workbook(): void
    {
        $this->asAdmin();

        $book = $this->xlsx($this->get('/api/v1/admin/reports/orders/export?from=2020-01-01&to=2020-01-31&format=xlsx'));
        $rows = $book['sheets']['Orders'];
        $this->assertSame('Order number', end($rows)[0], 'Only the headings, no data rows.');

        $sales = $this->xlsx($this->get('/api/v1/admin/reports/sales/export?from=2020-01-01&to=2020-01-31&format=xlsx'));
        $this->assertSame(0, $this->valueOf($sales['sheets']['Summary'], 'Orders placed'));
        $this->assertCount(32, $sales['sheets']['Daily trend'], 'Heading + one row per day.');
    }

    public function test_orders_management_export_has_every_matching_order_not_one_page(): void
    {
        $this->at('2026-11-03 10:00:00');
        for ($i = 0; $i < 27; $i++) {
            if ($i % 9 === 8) {
                // Checkout allows 10 orders a minute per address.
                $this->at('2026-11-03 10:0'.(intdiv($i, 9) + 1).':00');
            }
            $this->order('cod');
        }
        [$card] = $this->order('card');
        $this->at('2026-11-06 12:00:00');
        $this->asAdmin();

        $this->getJson('/api/v1/admin/orders?per_page=25')->assertJsonPath('meta.total', 28)->assertJsonCount(25, 'data');

        $response = $this->get('/api/v1/admin/orders/export?payment_method=cod&from=2026-11-01&to=2026-11-05');
        $this->assertStringContainsString('jovie-orders_all_2026-11-01_to_2026-11-05_exported-2026-11-06.xlsx', $response->headers->get('Content-Disposition'));
        $rows = $this->xlsx($response)['sheets']['Orders'];
        $headingAt = array_search('Order number', array_column($rows, 0), true);
        $this->assertSame(['Order number', 'Order date (Cairo)', 'Customer name', 'Governorate', 'Order status', 'Payment status', 'Payment method',
            'Lines', 'Units', 'Subtotal (EGP)', 'Discount (EGP)', 'Shipping (EGP)', 'Cash on delivery fee (EGP)', 'Total (EGP)', 'Promo code'], $rows[$headingAt]);
        $this->assertContains(['Payment method', 'Cash on delivery'], $rows);
        $this->assertContains(['From (Cairo time)', '2026-11-01'], $rows);
        $data = array_slice($rows, $headingAt + 1);
        $this->assertCount(27, $data, 'All matching orders, beyond the 25 of one page; the card order is filtered out.');
        $this->assertNotContains($card->order_number, array_column($data, 0));
        $this->assertSame([1, 1], [$data[0][7], $data[0][8]]);
        $this->assertEquals([450, 0, 50, 10, 510], array_slice($data[0], 9, 5));

        $this->getJson('/api/v1/admin/orders/export?status=lost')->assertUnprocessable();
        $this->assertSame(28, Order::count(), 'Exports change nothing.');
    }
}
