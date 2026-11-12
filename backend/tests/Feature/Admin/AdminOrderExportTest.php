<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminPermission as P;
use App\Enums\AdminRole;
use App\Models\AdminAuditLog;
use App\Models\AdminUser;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Payments\FakeCardGateway;
use App\Services\SettingsService;
use App\Support\XlsxWorkbook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/**
 * The orders list's Excel export: every order matching the applied tab and filters (the same
 * query as the list), never limited to one page, with a clear file name. Test database only.
 */
class AdminOrderExportTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        config(['payments.drivers' => ['fake' => FakeCardGateway::class]]);
        $this->openStore();
        app(SettingsService::class)->update(['store.card_provider' => 'fake', 'store.card_payments_enabled' => true]);
        $this->variant = $this->variant(stock: 500, price: 45000);
    }

    /** One order through checkout at a Cairo time, then put in the wanted stage and payment state. */
    private function order(string $cairo, string $status = 'pending_confirmation', string $payment = 'unpaid', array $contact = [], string $method = 'cod'): Order
    {
        Carbon::setTestNow(Carbon::parse($cairo, 'Africa/Cairo')->utc());
        $this->app['auth']->forgetGuards();
        $overrides = ['payment_method' => $method] + ($contact ? ['contact' => $contact] : []);
        $number = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => 1], $overrides))->assertCreated()->json('data.order_number');
        DB::table('orders')->where('order_number', $number)->update(['status' => $status, 'payment_status' => $payment]);

        return Order::where('order_number', $number)->sole();
    }

    /** 30 prepared orders over 4 days (more than one page), plus a few others. */
    private function seedOrders(): array
    {
        $made = ['prepared' => []];
        for ($i = 0; $i < 30; $i++) {
            // At most 6 checkouts a minute (the limit is 10 per minute per address).
            $made['prepared'][] = $this->order(sprintf('2026-11-0%d %02d:%02d:00', 1 + intdiv($i, 8), 9 + intdiv($i % 8, 6), ($i % 6) * 10), 'shipped');
        }
        $made['newEarly'] = $this->order('2026-11-05 08:59:00');
        $made['newIn'] = $this->order('2026-11-05 09:00:00', contact: ['first_name' => 'Salma', 'last_name' => 'Fawzy', 'email' => 'salma@example.com', 'phone' => '01122223333']);
        $made['newLate'] = $this->order('2026-11-05 18:31:00');
        $made['deliveredPaid'] = $this->order('2026-11-06 10:00:00', 'delivered', 'paid');
        $made['deliveredUnpaid'] = $this->order('2026-11-06 11:00:00', 'delivered');
        Carbon::setTestNow(Carbon::parse('2026-11-12 10:00:00', 'Africa/Cairo')->utc());

        return $made;
    }

    private function as(AdminRole $role): void
    {
        $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();
    }

    /** @return array{meta: array<string, string>, rows: list<list<mixed>>, name: string} */
    private function export(string $query): array
    {
        $response = $this->get("/api/v1/admin/orders/export?{$query}");
        $name = (string) preg_replace('/^.*filename="?([^";]+)"?.*$/', '$1', (string) $response->headers->get('Content-Disposition'));
        $rows = $this->rows($response);
        $at = array_search('Order number', array_column($rows, 0), true);
        $at = $at === false ? array_search('رقم الطلب', array_column($rows, 0), true) : $at;
        $meta = [];
        foreach (array_slice($rows, 0, $at) as $row) {
            if (isset($row[0], $row[1])) {
                $meta[(string) $row[0]] = (string) $row[1];
            }
        }

        return ['meta' => $meta, 'rows' => array_slice($rows, $at + 1), 'name' => $name];
    }

    private function rows(TestResponse $response): array
    {
        $response->assertOk()->assertHeader('Content-Type', XlsxWorkbook::MIME);
        $path = $response->baseResponse->getFile()->getPathname();
        $rows = [];
        $reader = new XlsxReader;
        $reader->open($path);
        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $rows[] = $row->toArray();
            }
        }
        $reader->close();
        @unlink($path);

        return $rows;
    }

    /** The list's total for the same filters (the export must have exactly that many rows). */
    private function listTotal(string $query): int
    {
        return $this->getJson("/api/v1/admin/orders?{$query}&per_page=10")->assertOk()->json('meta.total');
    }

    public function test_the_prepared_tab_exports_every_prepared_order_across_pages(): void
    {
        $made = $this->seedOrders();
        $this->as(AdminRole::StoreManager);

        $this->assertSame(3, $this->getJson('/api/v1/admin/orders?tab=ready&per_page=10')->json('meta.last_page'), 'Three pages on screen.');
        $export = $this->export('tab=ready');
        $this->assertCount(30, $export['rows']);
        $this->assertSame($this->listTotal('tab=ready'), count($export['rows']));
        $this->assertEqualsCanonicalizing(array_map(fn (Order $o) => $o->order_number, $made['prepared']), array_column($export['rows'], 0));
        $this->assertSame(['Prepared'], array_values(array_unique(array_column($export['rows'], 4))));
        $this->assertSame('Ready for delivery', $export['meta']['Status tab']);
        $this->assertSame('30', $export['meta']['Orders exported']);
        $this->assertSame('jovie-orders_ready-for-delivery_exported-2026-11-12.xlsx', $export['name']);
        // Oldest first, as before.
        $this->assertSame($made['prepared'][0]->order_number, $export['rows'][0][0]);
        // Page and page size are never export limits.
        $this->assertCount(30, $this->export('tab=ready&page=3&per_page=10')['rows']);
    }

    public function test_new_orders_within_an_exact_date_and_time_range(): void
    {
        $made = $this->seedOrders();
        $this->as(AdminRole::StoreManager);

        $query = 'tab=new&from=2026-11-05T09:00&to=2026-11-05T18:30';
        $export = $this->export($query);
        $this->assertSame([$made['newIn']->order_number], array_column($export['rows'], 0));
        $this->assertSame($this->listTotal($query), count($export['rows']));
        $this->assertSame(['2026-11-05 09:00', '2026-11-05 18:30'], [$export['meta']['From (Cairo time)'], $export['meta']['To (Cairo time)']]);
        $this->assertSame('jovie-orders_new_2026-11-05-0900_to_2026-11-05-1830_exported-2026-11-12.xlsx', $export['name']);
    }

    public function test_stage_and_payment_status_together(): void
    {
        $made = $this->seedOrders();
        $this->as(AdminRole::SuperAdmin);

        $export = $this->export('status=delivered&payment_status=paid');
        $this->assertSame([$made['deliveredPaid']->order_number], array_column($export['rows'], 0));
        $this->assertSame(['Delivered', 'Paid'], array_slice($export['rows'][0], 4, 2));
        $this->assertSame('jovie-orders_delivered_exported-2026-11-12.xlsx', $export['name']);
        $this->assertSame(2, count($this->export('tab=delivered')['rows']));
        $this->assertSame($this->listTotal('tab=delivered&payment_status=unpaid'), count($this->export('tab=delivered&payment_status=unpaid')['rows']));
    }

    public function test_search_by_customer_name_phone_or_order_number(): void
    {
        $made = $this->seedOrders();
        $this->as(AdminRole::StoreManager);
        $target = $made['newIn']->order_number;

        foreach (['Salma', 'Fawzy', '01122223333', $target] as $search) {
            $export = $this->export('search='.urlencode($search));
            $this->assertSame([$target], array_column($export['rows'], 0), $search);
            $this->assertSame($this->listTotal('search='.urlencode($search)), count($export['rows']));
            $this->assertSame($search, $export['meta']['Search']);
        }
        // Personal details are still never exported.
        $flat = json_encode($this->export('search=Salma')['rows']);
        $this->assertStringNotContainsString('01122223333', $flat);
        $this->assertStringNotContainsString('salma@example.com', $flat);
    }

    public function test_no_filters_exports_every_order_and_arabic_keeps_arabic_labels(): void
    {
        $this->seedOrders();
        $this->as(AdminRole::StoreManager);

        $export = $this->export('');
        $this->assertCount(Order::count(), $export['rows']);
        $this->assertSame(35, count($export['rows']));
        $this->assertSame('None (all orders)', $export['meta']['Filters']);
        $this->assertSame('jovie-orders_all_exported-2026-11-12.xlsx', $export['name']);

        $arabic = $this->export('tab=ready&lang=ar');
        $this->assertCount(30, $arabic['rows']);
        $this->assertSame(['تم التحضير'], array_values(array_unique(array_column($arabic['rows'], 4))));
        $this->assertSame('جاهزة للتوصيل', $arabic['meta']['تبويب المرحلة']);
    }

    public function test_nothing_matching_is_a_clear_answer_not_an_empty_file(): void
    {
        $this->seedOrders();
        $this->as(AdminRole::StoreManager);

        $this->getJson('/api/v1/admin/orders/export?tab=closed')->assertUnprocessable()
            ->assertJsonValidationErrors(['orders' => 'No orders match the current filters, so there is nothing to export.']);
        $this->getJson('/api/v1/admin/orders/export?from=2020-01-01T00:00&to=2020-01-01T23:59&lang=ar')->assertUnprocessable()
            ->assertJsonValidationErrors('orders');
        $this->getJson('/api/v1/admin/orders/export?tab=shipped')->assertUnprocessable()->assertJsonValidationErrors('tab');
    }

    public function test_exporting_needs_orders_view_and_orders_export_not_payments_manage(): void
    {
        $this->seedOrders();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/admin/orders/export?tab=ready')->assertUnauthorized();

        // Allowed: super admin, store manager, and the order manager without payments.manage.
        $this->assertFalse(AdminRole::OrderManager->can(P::ManagePayments));
        foreach ([AdminRole::SuperAdmin, AdminRole::StoreManager, AdminRole::OrderManager] as $role) {
            $this->as($role);
            $this->assertCount(30, $this->export('tab=ready')['rows'], $role->value);
        }
        // The order manager still has no payment management, reports or report exports.
        $this->as(AdminRole::OrderManager);
        $this->getJson('/api/v1/admin/payment-webhook-events')->assertForbidden();
        $this->getJson('/api/v1/admin/reports/orders/export?from=2026-11-01&to=2026-11-08&format=xlsx')->assertForbidden();

        // Refused, also when the API is called directly.
        foreach ([AdminRole::Support, AdminRole::ContentManager, AdminRole::ContentEditor, AdminRole::ProductManager] as $role) {
            $this->as($role);
            $this->getJson('/api/v1/admin/orders/export?tab=ready')->assertForbidden();
            $this->getJson('/api/v1/admin/orders/export')->assertForbidden();
        }
        $this->assertSame(35, Order::count(), 'Exports change nothing.');
    }

    public function test_both_permissions_are_required(): void
    {
        $this->seedOrders();
        // No role has only one of the two, so admins with a custom permission set are used.
        foreach ([[P::ExportOrders], [P::ViewOrders], [P::ViewOrders, P::ManagePayments]] as $permissions) {
            $this->actingAs($this->adminWith($permissions), 'admin')->fromFrontend();
            $this->getJson('/api/v1/admin/orders/export')->assertForbidden();
        }
        $this->actingAs($this->adminWith([P::ViewOrders, P::ExportOrders]), 'admin')->fromFrontend();
        $this->assertCount(35, $this->export('')['rows']);
    }

    public function test_each_export_is_recorded_in_the_audit_log_without_order_data(): void
    {
        $made = $this->seedOrders();
        $this->as(AdminRole::OrderManager);
        $admin = auth('admin')->user();

        $this->export('tab=ready&payment_status=unpaid&lang=ar');
        $log = AdminAuditLog::where('action', 'orders.exported')->sole();
        $this->assertSame([$admin->id, 'orders'], [$log->admin_user_id, $log->category]);
        $this->assertSame('jovie-orders_ready-for-delivery_exported-2026-11-12.xlsx', $log->subject_label);
        $this->assertSame(['tab' => 'ready', 'payment_status' => 'unpaid'], $log->changes['filters']['to']);
        $this->assertSame(30, $log->changes['orders']['to']);
        $this->assertSame('ar', $log->changes['language']['to']);
        $this->assertStringNotContainsString($made['prepared'][0]->order_number, json_encode($log->changes));

        // A refused or empty export records nothing.
        $this->getJson('/api/v1/admin/orders/export?tab=closed')->assertUnprocessable();
        $this->as(AdminRole::Support);
        $this->getJson('/api/v1/admin/orders/export')->assertForbidden();
        $this->assertSame(1, AdminAuditLog::where('action', 'orders.exported')->count());
    }

    /** An active admin whose permissions are exactly the given ones (the gates ask hasPermission). */
    private function adminWith(array $permissions): AdminUser
    {
        $saved = AdminUser::factory()->role(AdminRole::Support)->create();
        $admin = new class extends AdminUser
        {
            /** @var list<P> */
            public array $granted = [];

            public function hasPermission(P $permission): bool
            {
                return $this->is_active && in_array($permission, $this->granted, true);
            }
        };
        $admin->setRawAttributes($saved->getAttributes(), true);
        $admin->exists = true;
        $admin->granted = $permissions;

        return $admin;
    }
}
