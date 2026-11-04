<?php

namespace Tests\Feature\Payments;

use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Payments\GatewayManager;
use App\Payments\MockCardGateway;
use App\Services\SettingsService;
use Database\Seeders\StoreTestDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use LogicException;
use RuntimeException;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/** TEST MODE card payments (MockCardGateway + /orders/{number}/mock-payment). */
class MockPaymentTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore();
        $this->variant = $this->variant(stock: 10, price: 50000);
    }

    private function enableTestMode(): void
    {
        config(['payments.drivers' => [MockCardGateway::NAME => MockCardGateway::class], 'payments.test_mode' => true]);
        app(SettingsService::class)->update(['store.card_provider' => 'mock', 'store.card_payments_enabled' => true]);
    }

    /** @return array{0: Order, 1: string, 2: Payment, 3: string} order, guest token, attempt, redirect URL */
    private function startMockPayment(): array
    {
        $checkout = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => 1], ['payment_method' => 'card']))
            ->assertCreated()->assertJsonPath('data.status', 'pending_payment');
        $order = Order::where('order_number', $checkout->json('data.order_number'))->sole();
        $token = $checkout->json('meta.guest_access_token');

        $pay = $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->assertCreated();

        return [$order, $token, Payment::where('merchant_reference', $pay->json('data.merchant_reference'))->sole(), $pay->json('data.redirect_url')];
    }

    public function test_test_mode_is_off_by_default(): void
    {
        $this->assertFalse(config('payments.test_mode'));
        $this->assertFalse(app(GatewayManager::class)->has('mock'));
        $this->assertSame(false, $this->getJson('/api/v1/settings')->assertOk()->json('data')['store.test_mode']);
        $this->postJson('/api/v1/orders/JV-000000-00001/mock-payment', ['outcome' => 'succeeded'])->assertNotFound();
    }

    public function test_settings_tell_the_store_when_test_mode_is_on(): void
    {
        $this->enableTestMode();

        $this->assertSame(true, $this->getJson('/api/v1/settings')->assertOk()->json('data')['store.test_mode']);
    }

    public function test_the_mock_page_receives_the_order_and_attempt_and_the_attempt_is_marked_as_a_test(): void
    {
        $this->enableTestMode();
        [$order, , $payment, $redirect] = $this->startMockPayment();

        $this->assertSame(config('payments.mock.page_url').'?'.http_build_query(['order' => $order->order_number, 'ref' => $payment->merchant_reference]), $redirect);
        $this->assertSame(['mock', 'pending', 50000 + 5000, true], [$payment->provider, $payment->status->value, $payment->amount_piastres, $payment->is_test]);
    }

    public function test_a_simulated_success_pays_and_confirms_the_order(): void
    {
        $this->enableTestMode();
        [$order, $token, $payment] = $this->startMockPayment();

        $this->postJson("/api/v1/orders/{$order->order_number}/mock-payment", [
            'token' => $token, 'outcome' => 'succeeded', 'merchant_reference' => $payment->merchant_reference,
        ])->assertOk()->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.payment_status', 'paid');

        $payment->refresh();
        $this->assertSame('succeeded', $payment->status->value);
        $this->assertTrue($payment->is_test);
        $this->assertNull($payment->card_last4, 'No card data exists in TEST MODE.');
        $this->assertSame(['test_mode' => true, 'simulated_outcome' => 'succeeded'], $payment->gateway_response);

        // The attempt is finished: it cannot be simulated again.
        $this->postJson("/api/v1/orders/{$order->order_number}/mock-payment", [
            'token' => $token, 'outcome' => 'failed', 'merchant_reference' => $payment->merchant_reference,
        ])->assertNotFound();
        $this->assertSame('paid', $order->refresh()->payment_status->value);
    }

    public function test_a_simulated_failure_keeps_the_order_waiting_so_the_customer_can_retry(): void
    {
        $this->enableTestMode();
        [$order, $token, $payment] = $this->startMockPayment();

        $this->postJson("/api/v1/orders/{$order->order_number}/mock-payment", [
            'token' => $token, 'outcome' => 'failed', 'merchant_reference' => $payment->merchant_reference,
        ])->assertOk()->assertJsonPath('data.status', 'pending_payment')->assertJsonPath('data.payment_status', 'unpaid');

        $this->assertSame(['failed', 'mock_declined'], [$payment->refresh()->status->value, $payment->failure_code]);
        $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->assertCreated();
        $this->assertSame(2, $order->payments()->count());
    }

    public function test_only_the_orders_guest_token_can_simulate_a_result(): void
    {
        $this->enableTestMode();
        [$order, , $payment] = $this->startMockPayment();
        $body = ['outcome' => 'succeeded', 'merchant_reference' => $payment->merchant_reference];

        $this->postJson("/api/v1/orders/{$order->order_number}/mock-payment", $body)->assertNotFound();
        $this->postJson("/api/v1/orders/{$order->order_number}/mock-payment", [...$body, 'token' => 'wrong'])->assertNotFound();
        $this->assertSame('unpaid', $order->refresh()->payment_status->value);
    }

    public function test_the_mock_driver_refuses_webhooks(): void
    {
        $this->enableTestMode();

        $this->postJson('/api/v1/payments/webhooks/mock', ['status' => 'succeeded'])->assertUnauthorized();
    }

    public function test_the_mock_driver_and_endpoint_never_work_in_production(): void
    {
        $this->enableTestMode();
        [$order, $token, $payment] = $this->startMockPayment();

        $this->app['env'] = 'production';
        try {
            $this->postJson("/api/v1/orders/{$order->order_number}/mock-payment", [
                'token' => $token, 'outcome' => 'succeeded', 'merchant_reference' => $payment->merchant_reference,
            ])->assertNotFound();

            $this->expectException(LogicException::class);
            app(GatewayManager::class)->driver('mock');
        } finally {
            $this->app['env'] = 'testing';
            $this->assertSame('unpaid', $order->refresh()->payment_status->value);
        }
    }

    public function test_cart_updates_do_not_use_up_the_payment_rate_limit(): void
    {
        $this->enableTestMode();
        [$order, $token] = $this->startMockPayment();

        // A customer adjusting quantities: more requests than /pay allows per minute (10).
        foreach (range(1, 15) as $i) {
            $this->postJson('/api/v1/cart/preview', ['items' => [['variant_id' => $this->variant->id, 'quantity' => 1]]])->assertOk();
        }

        $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->assertCreated();
    }

    public function test_the_test_data_seeder_refuses_to_run_outside_test_mode(): void
    {
        $this->expectException(RuntimeException::class);

        $this->seed(StoreTestDataSeeder::class);
    }
}
