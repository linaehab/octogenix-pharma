<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Services\CustomerAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/** Phase 6: the read-only customer pages of the dashboard and the customer's order history. */
class AdminCustomerManagementTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private const URL = '/api/v1/admin/customers';

    /** Every key a customer row may have: nothing about passwords, tokens or anonymisation. */
    private const SUMMARY_KEYS = ['id', 'first_name', 'last_name', 'email', 'phone', 'locale', 'is_active', 'email_verified',
        'last_login_at', 'created_at', 'orders_count', 'paid_total', 'last_order_at'];

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore(codFee: 1000);
    }

    private function asAdmin(AdminRole $role = AdminRole::Support): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    /** A real signed-in checkout (COD) for the customer; returns the order. */
    private function placeOrder(Customer $customer, int $quantity = 1, int $price = 45000): Order
    {
        $address = $customer->addresses()->first()
            ?? CustomerAddress::factory()->for($customer)->create(['governorate_id' => $this->governorate->id, 'is_default' => true]);
        CartItem::create(['customer_id' => $customer->id, 'product_variant_id' => $this->variant(stock: 20, price: $price)->id, 'quantity' => $quantity]);
        $this->actingAs($customer, 'customer')->fromFrontend();

        $number = $this->postJson('/api/v1/checkout', [
            'payment_method' => 'cod',
            'idempotency_key' => (string) Str::uuid(),
            'address_id' => $address->id,
            'items' => [],
        ])->assertCreated()->json('data.order_number');

        return Order::where('order_number', $number)->sole();
    }

    /** Test fixture only: an order counted as paid. */
    private function markPaid(Order $order): void
    {
        $order->forceFill(['payment_status' => 'paid', 'paid_at' => now()])->save();
    }

    public function test_only_admins_with_customers_view_reach_the_customer_pages(): void
    {
        $customer = Customer::factory()->create();

        $this->getJson(self::URL)->assertUnauthorized();
        $this->getJson(self::URL."/{$customer->id}")->assertUnauthorized();

        $this->asAdmin(AdminRole::ContentEditor);
        $this->getJson(self::URL)->assertForbidden();
        $this->getJson(self::URL."/{$customer->id}")->assertForbidden();

        foreach ([AdminRole::SuperAdmin, AdminRole::StoreManager, AdminRole::Support] as $role) {
            $this->asAdmin($role);
            $this->getJson(self::URL)->assertOk()->assertJsonPath('data.0.id', $customer->id);
            $this->getJson(self::URL."/{$customer->id}")->assertOk();
        }

        // Read-only: there is no way to change, deactivate or delete a customer from the dashboard.
        $this->patchJson(self::URL."/{$customer->id}", ['is_active' => false])->assertMethodNotAllowed();
        $this->deleteJson(self::URL."/{$customer->id}")->assertMethodNotAllowed();
        $this->assertTrue($customer->refresh()->is_active);
    }

    public function test_rows_carry_order_figures_and_no_sign_in_data(): void
    {
        $mona = Customer::factory()->verified()->create(['first_name' => 'Mona', 'last_name' => 'Hassan']);
        // A guest order with her email is not hers (placed before anyone signs in).
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant()->id => 1], [
            'contact' => ['email' => $mona->email],
        ]))->assertCreated();
        $this->travel(1)->minute();
        $first = $this->placeOrder($mona, 1, 45000);   // 45000 + 5000 shipping + 1000 COD = 51000
        $this->travel(1)->minute();
        $second = $this->placeOrder($mona, 2, 30000);  // 60000 + 5000 + 1000 = 66000
        $this->markPaid($second);
        $omar = Customer::factory()->create(['first_name' => 'Omar']);
        $this->asAdmin();

        $rows = collect($this->getJson(self::URL)->assertOk()->json('data'))->keyBy('first_name');

        foreach ($rows as $row) {
            $this->assertEqualsCanonicalizing(self::SUMMARY_KEYS, array_keys($row));
        }
        $this->assertSame([2, ['amount_piastres' => 66000, 'currency' => 'EGP'], true],
            [$rows['Mona']['orders_count'], $rows['Mona']['paid_total'], $rows['Mona']['email_verified']]);
        $this->assertSame(Carbon::parse($second->placed_at)->toIso8601String(), $rows['Mona']['last_order_at']);
        $this->assertSame([0, 0, null], [$rows['Omar']['orders_count'], $rows['Omar']['paid_total']['amount_piastres'], $rows['Omar']['last_order_at']]);

        $json = $this->getJson(self::URL."/{$mona->id}")->assertOk()->getContent();
        foreach (['password', 'remember_token', 'anonymized_at', 'deleted_at', $mona->password] as $secret) {
            $this->assertStringNotContainsString($secret, $json);
        }
        $this->assertSame(51000, $first->refresh()->total_piastres);
    }

    public function test_search_filters_and_pages(): void
    {
        Carbon::setTestNow('2026-11-01 12:00:00');
        $mona = Customer::factory()->create(['first_name' => 'Mona', 'last_name' => 'Hassan', 'email' => 'mona@example.com', 'phone' => '+201012345678']);
        // 23:30 Cairo on 2 November is 21:30 UTC.
        Carbon::setTestNow('2026-11-02 21:30:00');
        $omar = Customer::factory()->inactive()->create(['first_name' => 'Omar', 'last_name' => 'Fathy', 'email' => 'omar@example.com', 'phone' => '+201122334455']);
        Carbon::setTestNow('2026-11-02 22:30:00'); // 00:30 Cairo on 3 November
        $sara = Customer::factory()->create(['first_name' => 'Sara', 'last_name' => 'Adel', 'email' => 'sara@example.com', 'phone' => null]);
        Carbon::setTestNow();
        $this->asAdmin();

        $ids = fn (string $query) => array_column($this->getJson(self::URL.'?'.$query)->assertOk()->json('data'), 'id');

        $this->assertSame([$sara->id, $omar->id, $mona->id], $ids(''), 'Newest first.');
        $this->assertSame([$mona->id], $ids('search=mona'));
        $this->assertSame([$mona->id], $ids('search='.urlencode('Mona Hassan')));
        $this->assertSame([$omar->id], $ids('search=FATHY'));
        $this->assertSame([$sara->id], $ids('search=sara%40example'));
        $this->assertSame([$mona->id], $ids('search=01012345678'));
        $this->assertSame([], $ids('search='.urlencode('100%')));
        $this->assertSame([$omar->id], $ids('status=inactive'));
        $this->assertSame([$sara->id, $mona->id], $ids('status=active'));
        $this->assertSame([$omar->id], $ids('registered_from=2026-11-02&registered_to=2026-11-02'));
        $this->assertSame([$sara->id], $ids('registered_from=2026-11-03'));
        $this->assertSame([$omar->id, $mona->id], $ids('registered_to=2026-11-02'));

        $page = $this->getJson(self::URL.'?per_page=2&page=2')->assertOk();
        $this->assertSame([$mona->id], array_column($page->json('data'), 'id'));
        $page->assertJsonPath('meta', ['current_page' => 2, 'last_page' => 2, 'total' => 3]);

        $this->getJson(self::URL.'?status=blocked&registered_from=2026-13-01&per_page=500')
            ->assertUnprocessable()->assertJsonValidationErrors(['status', 'registered_from', 'per_page']);
        $this->getJson(self::URL.'?registered_from=2026-11-03&registered_to=2026-11-01')
            ->assertUnprocessable()->assertJsonValidationErrors('registered_to');
    }

    public function test_details_show_saved_addresses_and_the_order_history_uses_the_orders_list(): void
    {
        $mona = Customer::factory()->create(['first_name' => 'Mona']);
        $other = CustomerAddress::factory()->for($mona)->create(['governorate_id' => $this->governorate->id, 'is_default' => false, 'label' => 'Work']);
        $home = CustomerAddress::factory()->for($mona)->create(['governorate_id' => $this->governorate->id, 'is_default' => true, 'label' => 'Home']);
        $older = $this->placeOrder($mona);
        $this->travel(1)->hour();
        $newer = $this->placeOrder($mona, 3);
        $someoneElse = $this->placeOrder(Customer::factory()->create());
        $this->asAdmin();

        $details = $this->getJson(self::URL."/{$mona->id}")->assertOk();
        $details->assertJsonPath('data.orders_count', 2)
            ->assertJsonPath('data.addresses.0.id', $home->id)
            ->assertJsonPath('data.addresses.0.governorate.name.ar', 'القاهرة')
            ->assertJsonPath('data.addresses.1.id', $other->id);

        $history = $this->getJson("/api/v1/admin/orders?customer_id={$mona->id}")->assertOk();
        $this->assertSame([$newer->order_number, $older->order_number], array_column($history->json('data'), 'order_number'));
        $history->assertJsonPath('data.0.total.amount_piastres', $newer->total_piastres)
            ->assertJsonPath('data.0.status', 'pending_confirmation')
            ->assertJsonPath('data.0.payment_method', 'cod')
            ->assertJsonPath('data.0.payment_status', 'unpaid');
        $this->assertNotContains($someoneElse->order_number, array_column($history->json('data'), 'order_number'));

        $this->getJson('/api/v1/admin/orders?customer_id=0')->assertUnprocessable()->assertJsonValidationErrors('customer_id');
        $this->asAdmin(AdminRole::ContentEditor);
        $this->getJson("/api/v1/admin/orders?customer_id={$mona->id}")->assertForbidden();
    }

    public function test_deleted_accounts_are_not_listed_and_their_orders_keep_their_snapshot(): void
    {
        $mona = Customer::factory()->create(['first_name' => 'Mona', 'last_name' => 'Hassan']);
        $order = $this->placeOrder($mona);
        app(CustomerAccountService::class)->deleteAccount($mona);
        $this->asAdmin();

        $this->assertSame([], $this->getJson(self::URL)->assertOk()->json('data'));
        $this->getJson(self::URL."/{$mona->id}")->assertNotFound();
        $this->getJson("/api/v1/admin/orders/{$order->order_number}")->assertOk()
            ->assertJsonPath('data.contact.first_name', 'Mona');
    }

    public function test_viewing_customers_and_profile_changes_never_rewrite_orders(): void
    {
        $mona = Customer::factory()->create(['first_name' => 'Mona', 'last_name' => 'Hassan', 'phone' => '+201012345678']);
        $order = $this->placeOrder($mona);
        $snapshot = fn () => Order::find($order->id)->only([
            'customer_first_name', 'customer_last_name', 'customer_email', 'customer_phone', 'shipping_street',
            'subtotal_piastres', 'shipping_fee_piastres', 'total_piastres', 'status', 'payment_status', 'updated_at',
        ]);
        $before = $snapshot();
        $customerBefore = $mona->refresh()->updated_at;

        $this->asAdmin(AdminRole::SuperAdmin);
        $this->getJson(self::URL)->assertOk();
        $this->getJson(self::URL."/{$mona->id}")->assertOk();
        $this->getJson("/api/v1/admin/orders?customer_id={$mona->id}")->assertOk();
        $this->assertEquals($before, $snapshot());
        $this->assertEquals($customerBefore, $mona->refresh()->updated_at);

        // The customer edits her own profile: the order keeps the details it was placed with.
        $this->actingAs($mona, 'customer')->fromFrontend();
        $this->patchJson('/api/v1/customer/me', ['first_name' => 'Mariam', 'phone' => '01122334455'])->assertOk();
        $this->assertEquals($before, $snapshot());

        $this->asAdmin();
        $this->getJson(self::URL."/{$mona->id}")->assertJsonPath('data.first_name', 'Mariam');
        $this->getJson("/api/v1/admin/orders/{$order->order_number}")
            ->assertJsonPath('data.contact.first_name', 'Mona')
            ->assertJsonPath('data.contact.phone', '+201012345678');
    }
}
