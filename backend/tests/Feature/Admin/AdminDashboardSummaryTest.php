<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\ContactMessageStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\ReviewStatus;
use App\Models\AdminUser;
use App\Models\ContactMessage;
use App\Models\Customer;
use App\Models\Governorate;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminDashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/admin/dashboard/summary';

    /** 12:00 in Cairo (UTC+2 in November). */
    private const NOW = '2026-11-06 10:00:00';

    private Governorate $governorate;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse(self::NOW, 'UTC'));
        $this->governorate = Governorate::factory()->deliverable()->create();
    }

    private function as(AdminRole $role): static
    {
        return $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();
    }

    /** An order row as the checkout and status services leave it (only the fields the summary reads vary). */
    private function order(array $attributes): Order
    {
        return Order::query()->forceCreate([
            'order_number' => 'JV-T'.Str::upper(Str::random(8)),
            'status' => OrderStatus::PendingConfirmation,
            'payment_status' => OrderPaymentStatus::Unpaid,
            'payment_method' => PaymentMethod::Cod,
            'subtotal_piastres' => 0,
            'shipping_fee_piastres' => 0,
            'total_piastres' => 10000,
            'customer_first_name' => 'Test',
            'customer_last_name' => 'Buyer',
            'customer_email' => 'buyer@example.com',
            'customer_phone' => '+201000000000',
            'shipping_recipient_name' => 'Test Buyer',
            'shipping_phone' => '+201000000000',
            'shipping_governorate_id' => $this->governorate->id,
            'shipping_governorate_name_en' => 'Cairo',
            'shipping_governorate_name_ar' => 'القاهرة',
            'shipping_city' => 'Nasr City',
            'shipping_street' => '1 Test Street',
            'locale' => 'en',
            'idempotency_key' => (string) Str::uuid(),
            'placed_at' => now()->subDays(45),
            ...$attributes,
            // orders_total_check: total = subtotal - discount + shipping + COD fee.
            'subtotal_piastres' => $attributes['total_piastres'] ?? 10000,
        ]);
    }

    private function review(ReviewStatus $status): void
    {
        ProductReview::query()->forceCreate([
            'product_id' => Product::factory()->create()->id,
            'author_name' => 'Mona',
            'rating' => 5,
            'title' => 'Good',
            'body' => 'My baby likes it a lot.',
            'locale' => 'en',
            'status' => $status,
        ]);
    }

    public function test_guests_and_customers_cannot_open_the_summary(): void
    {
        $this->fromFrontend()->getJson(self::URL)->assertUnauthorized();

        $this->actingAs(Customer::factory()->create(), 'customer')->fromFrontend();
        $this->getJson(self::URL)->assertUnauthorized();
    }

    public function test_inactive_admins_are_rejected(): void
    {
        $this->actingAs(AdminUser::factory()->superAdmin()->inactive()->create(), 'admin')->fromFrontend();

        $this->getJson(self::URL)->assertForbidden()->assertJsonMissingPath('data');
    }

    public function test_each_role_only_receives_the_blocks_of_its_permissions(): void
    {
        $expected = [
            AdminRole::SuperAdmin->value => ['orders', 'sales', 'reviews', 'messages', 'inventory'],
            AdminRole::StoreManager->value => ['orders', 'sales', 'reviews', 'inventory'],
            AdminRole::Support->value => ['orders', 'messages'],
            AdminRole::ContentEditor->value => ['reviews', 'messages'],
        ];
        $blocks = ['orders', 'sales', 'reviews', 'messages', 'inventory'];

        foreach ($expected as $role => $present) {
            $data = $this->as(AdminRole::from($role))->getJson(self::URL)->assertOk()->json('data');

            foreach ($blocks as $block) {
                $this->assertSame(in_array($block, $present, true), array_key_exists($block, $data), "{$role}: {$block}");
            }
            $this->assertSame('Africa/Cairo', $data['timezone']);
            $this->assertSame('EGP', $data['currency']);
        }
    }

    public function test_an_empty_store_gives_zeros_for_every_status_and_period(): void
    {
        $data = $this->as(AdminRole::SuperAdmin)->getJson(self::URL)->assertOk()->json('data');

        $this->assertSame(0, $data['orders']['total']);
        $this->assertSame(array_map(fn (OrderStatus $s) => $s->value, OrderStatus::cases()), array_keys($data['orders']['by_status']));
        $this->assertSame([0], array_values(array_unique($data['orders']['by_status'])));
        foreach (['today', 'last_7_days', 'last_30_days'] as $period) {
            $this->assertSame(0, $data['sales']['paid_revenue'][$period]['amount_piastres']);
            $this->assertSame(0, $data['sales']['paid_revenue'][$period]['refund_review']['orders_count']);
            $this->assertSame(0, $data['sales']['delivered_value'][$period]['amount_piastres']);
            $this->assertSame(0, $data['sales']['delivered_value'][$period]['not_collected']['amount_piastres']);
        }
        $this->assertSame(['pending' => 0], $data['reviews']);
        $this->assertSame(['new' => 0], $data['messages']);
        $this->assertSame(['low_stock' => 0, 'out_of_stock' => 0, 'without_threshold' => 0], $data['inventory']);
        $this->assertFalse($data['sales']['refunds_recorded']);
    }

    public function test_paid_revenue_and_delivered_value_follow_the_order_and_payment_rules(): void
    {
        // Card order paid today, being prepared: collected, not delivered.
        $this->order(['status' => OrderStatus::Processing, 'payment_method' => PaymentMethod::Card,
            'payment_status' => OrderPaymentStatus::Paid, 'paid_at' => now()->subHours(2), 'total_piastres' => 10000]);
        // COD delivered today, cash not yet recorded as collected: delivered, not collected.
        $this->order(['status' => OrderStatus::Delivered, 'delivered_at' => now()->subHour(), 'total_piastres' => 20000]);
        // COD delivered 3 days ago, cash recorded 2 days ago: both figures, within 7 days.
        $this->order(['status' => OrderStatus::Delivered, 'delivered_at' => now()->subDays(3),
            'payment_status' => OrderPaymentStatus::Paid, 'paid_at' => now()->subDays(2), 'total_piastres' => 30000]);
        // Card order paid 10 days ago, then returned: collected, flagged as possibly owed back.
        $this->order(['status' => OrderStatus::Returned, 'payment_method' => PaymentMethod::Card,
            'payment_status' => OrderPaymentStatus::Paid, 'paid_at' => now()->subDays(10), 'total_piastres' => 40000]);
        // Never counted: COD awaiting confirmation, cancelled unpaid order, card order still awaiting payment.
        $this->order(['status' => OrderStatus::PendingConfirmation, 'total_piastres' => 1111]);
        $this->order(['status' => OrderStatus::Cancelled, 'cancelled_at' => now()->subDay(), 'total_piastres' => 2222]);
        $this->order(['status' => OrderStatus::PendingPayment, 'payment_method' => PaymentMethod::Card, 'total_piastres' => 3333]);
        // Paid and delivered 40 days ago: outside every period.
        $this->order(['status' => OrderStatus::Delivered, 'delivered_at' => now()->subDays(40),
            'payment_status' => OrderPaymentStatus::Paid, 'paid_at' => now()->subDays(40), 'total_piastres' => 50000]);

        $sales = $this->as(AdminRole::StoreManager)->getJson(self::URL)->assertOk()->json('data.sales');

        $paid = $sales['paid_revenue'];
        $this->assertSame([10000, 1], [$paid['today']['amount_piastres'], $paid['today']['orders_count']]);
        $this->assertSame([40000, 2], [$paid['last_7_days']['amount_piastres'], $paid['last_7_days']['orders_count']]);
        $this->assertSame([80000, 3], [$paid['last_30_days']['amount_piastres'], $paid['last_30_days']['orders_count']]);
        $this->assertSame(['amount_piastres' => 0, 'orders_count' => 0], $paid['last_7_days']['refund_review']);
        $this->assertSame(['amount_piastres' => 40000, 'orders_count' => 1], $paid['last_30_days']['refund_review']);

        $delivered = $sales['delivered_value'];
        $this->assertSame([20000, 1], [$delivered['today']['amount_piastres'], $delivered['today']['orders_count']]);
        $this->assertSame(['amount_piastres' => 20000, 'orders_count' => 1], $delivered['today']['not_collected']);
        $this->assertSame([50000, 2], [$delivered['last_7_days']['amount_piastres'], $delivered['last_7_days']['orders_count']]);
        $this->assertSame([50000, 2], [$delivered['last_30_days']['amount_piastres'], $delivered['last_30_days']['orders_count']]);
        $this->assertSame(['amount_piastres' => 20000, 'orders_count' => 1], $delivered['last_30_days']['not_collected']);

        $orders = $this->getJson(self::URL)->json('data.orders');
        $this->assertSame(8, $orders['total']);
        $this->assertSame(3, $orders['by_status']['delivered']);
        $this->assertSame(1, $orders['by_status']['returned']);
    }

    public function test_money_values_are_integer_piastres(): void
    {
        $this->order(['status' => OrderStatus::Delivered, 'delivered_at' => now()->subHour(),
            'payment_status' => OrderPaymentStatus::Paid, 'paid_at' => now()->subHour(), 'total_piastres' => 12345]);

        $response = $this->as(AdminRole::SuperAdmin)->getJson(self::URL)->assertOk();

        foreach (['paid_revenue', 'delivered_value'] as $metric) {
            foreach (['today', 'last_7_days', 'last_30_days'] as $period) {
                $amount = $response->json("data.sales.{$metric}.{$period}.amount_piastres");
                $this->assertIsInt($amount);
                $this->assertSame(12345, $amount);
            }
        }
        // Integers in the JSON itself, not strings or decimals.
        $this->assertStringContainsString('"amount_piastres":12345,', $response->getContent());
    }

    public function test_days_follow_cairo_time(): void
    {
        // 00:30 on 6 November in Cairo: today. 23:30 on 5 November in Cairo: yesterday.
        // The 7 days are 31 October to 6 November (Cairo), starting at 22:00 UTC on 30 October.
        $this->order(['status' => OrderStatus::Confirmed, 'payment_method' => PaymentMethod::Card,
            'payment_status' => OrderPaymentStatus::Paid, 'paid_at' => Carbon::parse('2026-11-05 22:30:00', 'UTC'), 'total_piastres' => 700]);
        $this->order(['status' => OrderStatus::Confirmed, 'payment_method' => PaymentMethod::Card,
            'payment_status' => OrderPaymentStatus::Paid, 'paid_at' => Carbon::parse('2026-11-05 21:30:00', 'UTC'), 'total_piastres' => 900]);

        $paid = $this->as(AdminRole::SuperAdmin)->getJson(self::URL)->json('data.sales.paid_revenue');

        $this->assertSame(700, $paid['today']['amount_piastres']);
        $this->assertSame('2026-11-05T22:00:00+00:00', $paid['today']['from']);
        $this->assertSame(1600, $paid['last_7_days']['amount_piastres']);
        $this->assertSame('2026-10-30T22:00:00+00:00', $paid['last_7_days']['from']);
    }

    public function test_pending_reviews_new_messages_and_stock_are_counted(): void
    {
        $this->review(ReviewStatus::Pending);
        $this->review(ReviewStatus::Pending);
        $this->review(ReviewStatus::Approved);
        $this->review(ReviewStatus::Rejected);

        ContactMessage::factory()->count(2)->create();
        ContactMessage::factory()->create(['status' => ContactMessageStatus::Read]);
        ContactMessage::factory()->create()->delete();

        ProductVariant::factory()->create(['stock_quantity' => 3, 'low_stock_threshold' => 5]);
        ProductVariant::factory()->create(['stock_quantity' => 0, 'low_stock_threshold' => 5]);
        ProductVariant::factory()->create(['stock_quantity' => 50, 'low_stock_threshold' => 5]);
        ProductVariant::factory()->create(['stock_quantity' => 0, 'low_stock_threshold' => null]);
        ProductVariant::factory()->create(['stock_quantity' => 1, 'low_stock_threshold' => 5, 'is_active' => false]);

        $data = $this->as(AdminRole::SuperAdmin)->getJson(self::URL)->assertOk()->json('data');

        $this->assertSame(['pending' => 2], $data['reviews']);
        $this->assertSame(['new' => 2], $data['messages']);
        $this->assertSame(['low_stock' => 2, 'out_of_stock' => 2, 'without_threshold' => 1], $data['inventory']);

        // The dashboard count and the low-stock list use the same rule.
        $this->getJson('/api/v1/admin/inventory/low-stock')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_the_summary_changes_nothing(): void
    {
        $order = $this->order(['status' => OrderStatus::Delivered, 'delivered_at' => now()->subHour(), 'total_piastres' => 5000]);
        $before = $order->fresh()->toArray();

        $this->as(AdminRole::SuperAdmin)->getJson(self::URL)->assertOk();

        $this->assertSame($before, $order->fresh()->toArray());
        $this->assertSame(0, ContactMessage::query()->whereNotNull('read_at')->count());
    }
}
