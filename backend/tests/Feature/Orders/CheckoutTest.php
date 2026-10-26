<?php

namespace Tests\Feature\Orders;

use App\Models\CartItem;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Payment;
use App\Notifications\OrderPlacedNotification;
use App\Notifications\OrderPlacedStaffNotification;
use App\Services\SettingsService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore(codFee: 1000, staffEmails: ['orders@example.com']);
    }

    public function test_guest_cod_checkout_computes_totals_reserves_stock_and_snapshots_everything(): void
    {
        $variant = $this->variant(stock: 10, price: 45000);

        $response = $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 2], [
            'items' => [['variant_id' => $variant->id, 'quantity' => 2, 'unit_price_piastres' => 1]],
            'total_piastres' => 1,
        ]))->assertCreated();

        $order = Order::sole();
        $this->assertMatchesRegularExpression('/^JV-\d{6}-\d{5}$/', $order->order_number);
        $this->assertSame('pending_confirmation', $order->status->value);
        $this->assertNull($order->customer_id);
        $this->assertSame([90000, 5000, 1000, 96000],
            [$order->subtotal_piastres, $order->shipping_fee_piastres, $order->cod_fee_piastres, $order->total_piastres]);
        $this->assertSame(['mona@example.com', '+201012345678', 'القاهرة'],
            [$order->customer_email, $order->customer_phone, $order->shipping_governorate_name_ar]);

        $response->assertJsonPath('data.totals.total', ['amount_piastres' => 96000, 'currency' => 'EGP'])
            ->assertJsonPath('data.items.0.unit_price.amount_piastres', 45000);

        $item = $order->items()->sole();
        $this->assertSame([$variant->sku, 45000, 2, 90000], [$item->sku, $item->unit_price_piastres, $item->quantity, $item->line_total_piastres]);

        $this->assertSame(8, $variant->refresh()->stock_quantity);
        $movement = InventoryMovement::where('reason', 'order_reserved')->sole();
        $this->assertSame([-2, 8, $order->id], [$movement->quantity_change, $movement->stock_after, $movement->order_id]);

        $payment = Payment::sole();
        $this->assertSame(['cod', 'pending', 96000], [$payment->provider, $payment->status->value, $payment->amount_piastres]);
        $this->assertSame(['status', null, 'pending_confirmation', 'guest'],
            [$order->histories()->sole()->field, $order->histories()->sole()->from_value, $order->histories()->sole()->to_value, $order->histories()->sole()->actor_type->value]);

        // The guest gets a private token once; it opens the order, and the email carries the same link.
        $token = $response->json('meta.guest_access_token');
        $this->assertSame(hash('sha256', $token), $order->guest_access_token_hash);
        $this->getJson("/api/v1/orders/{$order->order_number}?token={$token}")->assertOk()->assertJsonPath('data.status', 'pending_confirmation');

        Notification::assertSentTo(new AnonymousNotifiable, OrderPlacedNotification::class,
            fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === 'mona@example.com' && str_contains($n->orderUrl(), "token={$token}"));
        Notification::assertSentTo(new AnonymousNotifiable, OrderPlacedStaffNotification::class,
            fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === ['orders@example.com']);
    }

    public function test_signed_in_checkout_uses_the_account_cart_and_saved_address(): void
    {
        $customer = Customer::factory()->create();
        $address = CustomerAddress::factory()->for($customer)->create(['governorate_id' => $this->governorate->id, 'is_default' => true]);
        $variant = $this->variant(price: 30000);
        CartItem::create(['customer_id' => $customer->id, 'product_variant_id' => $variant->id, 'quantity' => 3]);
        $this->actingAs($customer, 'customer')->fromFrontend();

        $this->postJson('/api/v1/checkout', [
            'payment_method' => 'cod',
            'idempotency_key' => (string) Str::uuid(),
            'address_id' => $address->id,
            'items' => [['variant_id' => $variant->id, 'quantity' => 99]],
        ])->assertCreated()->assertJsonMissingPath('meta.guest_access_token');

        $order = Order::sole();
        $this->assertSame($customer->id, $order->customer_id);
        $this->assertSame(3, $order->items()->sole()->quantity, 'Items come from the server-side cart, not the request.');
        $this->assertSame($address->id, $order->customer_address_id);
        $this->assertNull($order->guest_access_token_hash);
        $this->assertSame(0, CartItem::count());

        $this->getJson('/api/v1/customer/orders')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/customer/orders/{$order->order_number}")->assertOk();
    }

    public function test_the_same_idempotency_key_never_creates_a_second_order(): void
    {
        $variant = $this->variant(stock: 10);
        $payload = $this->guestCheckout([$variant->id => 1]);

        $first = $this->postJson('/api/v1/checkout', $payload)->assertCreated()->json('data.order_number');
        $this->postJson('/api/v1/checkout', $payload)->assertOk()->assertJsonPath('data.order_number', $first);

        $this->assertSame(1, Order::count());
        $this->assertSame(9, $variant->refresh()->stock_quantity);

        $this->postJson('/api/v1/checkout', array_replace_recursive($payload, ['contact' => ['email' => 'someone@else.com']]))
            ->assertStatus(409);
    }

    public function test_changed_totals_are_reported_and_nothing_is_ordered(): void
    {
        $variant = $this->variant(stock: 5, price: 45000);

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['expected_total_piastres' => 50000]))
            ->assertStatus(409)
            ->assertJsonPath('totals.total.amount_piastres', 51000);

        $this->assertSame(0, Order::count());
        $this->assertSame(5, $variant->refresh()->stock_quantity);

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1], ['expected_total_piastres' => 51000]))
            ->assertCreated();
    }

    public function test_free_shipping_threshold(): void
    {
        app(SettingsService::class)->update(['store.free_shipping_threshold_piastres' => 80000]);
        $variant = $this->variant(price: 45000);

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 2]))
            ->assertCreated()->assertJsonPath('data.totals.shipping_fee.amount_piastres', 0);
    }

    public function test_stock_and_availability_are_enforced_atomically(): void
    {
        $scarce = $this->variant(stock: 1);
        $plenty = $this->variant(stock: 10);

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$plenty->id => 2, $scarce->id => 2]))
            ->assertUnprocessable()->assertJsonValidationErrors("items.{$scarce->id}");

        $this->assertSame(0, Order::count());
        $this->assertSame(10, $plenty->refresh()->stock_quantity, 'Nothing is reserved when any line fails.');

        $scarce->product->update(['is_purchasable' => false]);
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$scarce->id => 1]))
            ->assertUnprocessable()->assertJsonValidationErrors("items.{$scarce->id}");
    }

    public function test_store_switches_payment_methods_and_delivery_areas(): void
    {
        $variant = $this->variant();
        $payload = fn (array $o = []) => $this->guestCheckout([$variant->id => 1], $o);

        $this->postJson('/api/v1/checkout', $payload(['payment_method' => 'card']))
            ->assertUnprocessable()->assertJsonValidationErrors('payment_method');

        $this->governorate->update(['cod_available' => false]);
        $this->postJson('/api/v1/checkout', $payload())->assertUnprocessable()->assertJsonValidationErrors('payment_method');
        $this->governorate->update(['cod_available' => true, 'is_deliverable' => false]);
        $this->postJson('/api/v1/checkout', $payload())->assertUnprocessable()->assertJsonValidationErrors('governorate_id');
        $this->governorate->update(['is_deliverable' => true]);

        app(SettingsService::class)->update(['store.cod_enabled' => false]);
        $this->postJson('/api/v1/checkout', $payload())->assertUnprocessable()->assertJsonValidationErrors('payment_method');

        app(SettingsService::class)->update(['store.enabled' => false]);
        $this->postJson('/api/v1/checkout', $payload())->assertStatus(503);

        $this->assertSame(0, Order::count());
    }

    public function test_guest_validation_and_customer_address_ownership(): void
    {
        $this->postJson('/api/v1/checkout', ['payment_method' => 'bitcoin', 'idempotency_key' => 'nope'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_method', 'idempotency_key', 'items', 'contact.email', 'address.street']);

        $customer = Customer::factory()->create();
        $foreign = CustomerAddress::factory()->create(['governorate_id' => $this->governorate->id]);
        $this->actingAs($customer, 'customer')->fromFrontend();

        $this->postJson('/api/v1/checkout', ['payment_method' => 'cod', 'idempotency_key' => (string) Str::uuid(), 'address_id' => $foreign->id])
            ->assertUnprocessable()->assertJsonValidationErrors('address_id');

        $own = CustomerAddress::factory()->for($customer)->create(['governorate_id' => $this->governorate->id]);
        $this->postJson('/api/v1/checkout', ['payment_method' => 'cod', 'idempotency_key' => (string) Str::uuid(), 'address_id' => $own->id])
            ->assertUnprocessable()->assertJsonValidationErrors('items');
    }

    public function test_the_database_rejects_inconsistent_totals(): void
    {
        $variant = $this->variant();
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated();
        $order = Order::sole();

        foreach ([
            fn () => DB::table('orders')->where('id', $order->id)->update(['total_piastres' => 1]),
            fn () => DB::table('orders')->where('id', $order->id)->update(['payment_method' => 'card']),
            fn () => DB::table('order_items')->where('order_id', $order->id)->update(['line_total_piastres' => 1]),
        ] as $write) {
            try {
                DB::transaction($write);
                $this->fail('The database accepted inconsistent totals.');
            } catch (QueryException) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
