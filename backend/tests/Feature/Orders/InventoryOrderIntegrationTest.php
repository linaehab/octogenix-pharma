<?php

namespace Tests\Feature\Orders;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Payments\FakeCardGateway;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/**
 * Phase 3 check of the existing order stock rules: stock is reserved once at checkout, payments
 * never move it, cancelling or expiring gives it back exactly once, and admin adjustments in
 * between do not disturb those amounts. The ledger (movements) always adds up to the stock.
 */
class InventoryOrderIntegrationTest extends TestCase
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
        $this->variant = $this->variant(stock: 10, price: 45000);
    }

    private function order(string $method, int $quantity): array
    {
        $response = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => $quantity], ['payment_method' => $method]))->assertCreated();

        return [Order::where('order_number', $response->json('data.order_number'))->sole(), $response->json('meta.guest_access_token')];
    }

    private function stock(): int
    {
        return $this->variant->refresh()->stock_quantity;
    }

    /**
     * The movements always account for every change of the stored stock. (The test fixture writes
     * the 10 opening units directly, without a movement, so they are the starting balance here.)
     */
    private function assertLedgerMatches(): void
    {
        $this->assertSame($this->stock() - 10, (int) InventoryMovement::where('product_variant_id', $this->variant->id)->sum('quantity_change'));
    }

    private function paySuccessfully(Order $order, string $token): void
    {
        $reference = $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->assertCreated()->json('data.merchant_reference');
        $payment = Payment::where('merchant_reference', $reference)->sole();
        $body = json_encode([
            'event_id' => 'evt_'.Str::random(10), 'type' => 'payment.updated', 'merchant_reference' => $reference,
            'transaction_id' => 'txn_'.Str::random(8), 'status' => 'succeeded', 'amount_piastres' => $payment->amount_piastres,
            'currency' => 'EGP', 'card' => ['brand' => 'visa', 'last4' => '4242'],
        ]);
        foreach ([1, 2] as $attempt) { // the provider may send the same result twice
            $this->call('POST', '/api/v1/payments/webhooks/fake', [], [], [], [
                'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'HTTP_X_FAKE_SIGNATURE' => FakeCardGateway::sign($body),
            ], $body)->assertOk();
        }
    }

    public function test_card_order_reserves_once_and_payment_does_not_move_stock(): void
    {
        [$order, $token] = $this->order('card', 3);
        $this->assertSame(7, $this->stock());

        $this->paySuccessfully($order, $token);

        $this->assertSame(['confirmed', 'paid'], [$order->refresh()->status->value, $order->payment_status->value]);
        $this->assertSame(7, $this->stock(), 'Paying neither deducts again nor releases.');
        $this->assertSame(1, InventoryMovement::where('order_id', $order->id)->count());
        $this->assertLedgerMatches();
    }

    /** A payment arriving after expiry is covered by CardPaymentTest (flagged for the team, stock unchanged). */
    public function test_expired_card_order_releases_its_stock_exactly_once(): void
    {
        [$order, $token] = $this->order('card', 4);
        $this->travel(31)->minutes();
        $this->artisan('orders:expire-unpaid')->assertSuccessful();
        $this->artisan('orders:expire-unpaid')->assertSuccessful();
        $this->assertSame(10, $this->stock());

        // Running the expiry job again releases nothing more.
        $reference = Payment::where('order_id', $order->id)->value('merchant_reference');
        $this->assertNull($reference, 'No attempt was started before expiry.');
        $this->assertSame(['order_reserved', 'order_released'],
            InventoryMovement::where('order_id', $order->id)->orderBy('id')->pluck('reason')->map->value->all());
        $this->assertLedgerMatches();
    }

    public function test_cod_order_cancel_releases_exactly_once_around_admin_adjustments(): void
    {
        [$order] = $this->order('cod', 2);
        $admin = AdminUser::factory()->role(AdminRole::StoreManager)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        // Stock changes while the order is open: a shipment and a write-off.
        $this->postJson("/api/v1/admin/product-variants/{$this->variant->id}/stock-adjustments",
            ['reason' => 'restock', 'quantity' => 20, 'expected_stock' => 8])->assertCreated();
        $this->postJson("/api/v1/admin/product-variants/{$this->variant->id}/stock-adjustments",
            ['reason' => 'write_off', 'quantity' => 5, 'note' => 'Damaged', 'expected_stock' => 28])->assertCreated();
        $this->assertSame(23, $this->stock());

        $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", ['status' => 'cancelled', 'note' => 'Customer asked'])->assertOk();
        $this->assertSame(25, $this->stock(), 'Exactly the 2 reserved units come back.');
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", ['status' => 'cancelled', 'note' => 'Again'])->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->assertSame(25, $this->stock());
        $this->assertSame(1, InventoryMovement::where('order_id', $order->id)->where('reason', 'order_released')->count());
        $this->assertLedgerMatches();
    }

    public function test_delivered_cod_order_keeps_its_stock_and_cash_collection_does_not_move_it(): void
    {
        [$order] = $this->order('cod', 2);
        $this->actingAs(AdminUser::factory()->superAdmin()->create(), 'admin')->fromFrontend();
        foreach (['confirmed', 'processing', 'shipped', 'delivered'] as $status) {
            $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", ['status' => $status])->assertOk();
        }
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected")->assertOk();

        $this->assertSame(8, $this->stock());
        $this->assertSame(1, InventoryMovement::where('order_id', $order->id)->count());
        $this->assertLedgerMatches();
    }

    public function test_checkout_cannot_take_more_than_the_stock(): void
    {
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => 11]))->assertUnprocessable();
        $this->assertSame(10, $this->stock());
        $this->assertSame(0, Order::count());
        $this->assertLedgerMatches();
    }
}
