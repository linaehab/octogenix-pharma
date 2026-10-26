<?php

namespace Tests\Feature\Payments;

use App\Enums\AdminRole;
use App\Enums\PaymentStatus;
use App\Models\AdminUser;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentWebhookEvent;
use App\Models\ProductVariant;
use App\Payments\FakeCardGateway;
use App\Payments\GatewayResult;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

class CardPaymentTest extends TestCase
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

    /** @return array{0: Order, 1: string} */
    private function placeCardOrder(): array
    {
        $response = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => 2], ['payment_method' => 'card']))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending_payment')
            ->assertJsonPath('data.totals.cod_fee.amount_piastres', 0)
            ->assertJsonPath('data.totals.total.amount_piastres', 95000);

        return [Order::where('order_number', $response->json('data.order_number'))->sole(), $response->json('meta.guest_access_token')];
    }

    private function pay(Order $order, string $token): Payment
    {
        $reference = $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])
            ->assertCreated()->json('data.merchant_reference');

        return Payment::where('merchant_reference', $reference)->sole();
    }

    private function webhook(array $data, ?string $signature = null): TestResponse
    {
        $body = json_encode($data);

        return $this->call('POST', '/api/v1/payments/webhooks/fake', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_FAKE_SIGNATURE' => $signature ?? FakeCardGateway::sign($body),
        ], $body);
    }

    private function succeeded(Payment $payment, array $overrides = []): array
    {
        return array_replace_recursive([
            'event_id' => 'evt_'.Str::random(10),
            'type' => 'payment.updated',
            'merchant_reference' => $payment->merchant_reference,
            'transaction_id' => 'txn_'.Str::random(8),
            'status' => 'succeeded',
            'amount_piastres' => $payment->amount_piastres,
            'currency' => 'EGP',
            'card' => ['brand' => 'visa', 'last4' => '4242'],
        ], $overrides);
    }

    public function test_starting_a_payment_redirects_to_the_provider(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $this->assertNotNull($order->payment_expires_at);
        $this->assertSame(0, Payment::count(), 'Card orders get a payment attempt only when the customer pays.');

        $response = $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->assertCreated();

        $payment = Payment::sole();
        $this->assertStringStartsWith('https://fake-gateway.test/pay/'.$payment->merchant_reference, $response->json('data.redirect_url'));
        $this->assertSame(['fake', 'card', 'pending', 95000, true],
            [$payment->provider, $payment->method->value, $payment->status->value, $payment->amount_piastres, $payment->is_test]);

        $this->postJson("/api/v1/orders/{$order->order_number}/pay")->assertNotFound();
        $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => 'wrong'])->assertNotFound();
    }

    public function test_a_signed_success_webhook_pays_and_confirms_the_order_once(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $payment = $this->pay($order, $token);
        $event = $this->succeeded($payment);

        $this->webhook($event)->assertOk()->assertJsonPath('message', 'Received.');

        $order->refresh();
        $this->assertSame(['confirmed', 'paid'], [$order->status->value, $order->payment_status->value]);
        $this->assertNotNull($order->paid_at);
        $payment->refresh();
        $this->assertSame(['succeeded', 'visa', '4242'], [$payment->status->value, $payment->card_brand, $payment->card_last4]);
        $this->assertNotNull($payment->verified_at);
        $this->assertSame('processed', PaymentWebhookEvent::sole()->processing_status);
        $this->assertSame(8, $this->variant->refresh()->stock_quantity, 'Stock stays reserved for the paid order.');

        $historyCount = $order->histories()->count();
        $this->webhook($event)->assertOk()->assertJsonPath('message', 'Already received.');
        $this->webhook($this->succeeded($payment))->assertOk(); // same result, new event id
        $this->assertSame(2, PaymentWebhookEvent::count());
        $this->assertSame($historyCount, $order->histories()->count(), 'Duplicates change nothing.');

        $this->assertSame('payment_gateway', $order->histories()->where('to_value', 'confirmed')->sole()->actor_type->value);
    }

    public function test_invalid_signatures_are_logged_and_ignored(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $payment = $this->pay($order, $token);

        $this->webhook($this->succeeded($payment), signature: 'forged')->assertUnauthorized();

        $event = PaymentWebhookEvent::sole();
        $this->assertFalse($event->signature_valid);
        $this->assertSame('ignored', $event->processing_status);
        $this->assertSame('pending_payment', $order->refresh()->status->value);
        $this->assertSame('pending', $payment->refresh()->status->value);
    }

    public function test_amount_or_currency_mismatch_never_marks_the_order_paid(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $payment = $this->pay($order, $token);

        $this->webhook($this->succeeded($payment, ['amount_piastres' => 100]))->assertOk();
        $this->webhook($this->succeeded($payment, ['currency' => 'USD']))->assertOk();

        $this->assertSame(['failed', 'failed'], PaymentWebhookEvent::orderBy('id')->pluck('processing_status')->all());
        $this->assertStringContainsString('provider reported', PaymentWebhookEvent::first()->processing_error);
        $this->assertSame(['pending_payment', 'unpaid'], [$order->refresh()->status->value, $order->payment_status->value]);
    }

    public function test_failed_payment_can_be_retried_with_a_new_attempt(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $first = $this->pay($order, $token);

        $this->webhook($this->succeeded($first, ['status' => 'failed', 'failure' => ['code' => 'declined', 'message' => 'Card declined']]))->assertOk();
        $this->assertSame(['failed', 'declined'], [$first->refresh()->status->value, $first->failure_code]);
        $this->assertSame('pending_payment', $order->refresh()->status->value);

        $second = $this->pay($order, $token);
        $this->assertNotSame($first->merchant_reference, $second->merchant_reference);

        $this->webhook($this->succeeded($second))->assertOk();
        $this->assertSame('confirmed', $order->refresh()->status->value);

        // A verified success is never downgraded by a later failure notice.
        $this->webhook($this->succeeded($second, ['status' => 'failed']))->assertOk();
        $this->assertSame('succeeded', $second->refresh()->status->value);
    }

    public function test_the_providers_status_api_wins_over_the_webhook_body(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $payment = $this->pay($order, $token);
        FakeCardGateway::$results[$payment->merchant_reference] = new GatewayResult(
            $payment->merchant_reference, PaymentStatus::Failed, $payment->amount_piastres, 'EGP', failureCode: 'fraud_check');

        $this->webhook($this->succeeded($payment))->assertOk();

        $this->assertSame(['failed', 'fraud_check'], [$payment->refresh()->status->value, $payment->failure_code]);
        $this->assertSame('unpaid', $order->refresh()->payment_status->value);
    }

    public function test_the_return_page_only_shows_server_verified_results(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $payment = $this->pay($order, $token);
        $url = "/api/v1/orders/{$order->order_number}/payment-status";

        // Returning from the provider proves nothing by itself.
        $this->postJson($url, ['token' => $token, 'status' => 'succeeded'])->assertOk()->assertJsonPath('data.status', 'pending_payment');

        FakeCardGateway::$results[$payment->merchant_reference] = new GatewayResult(
            $payment->merchant_reference, PaymentStatus::Succeeded, $payment->amount_piastres, 'EGP', 'txn_api');
        $this->postJson($url, ['token' => $token])->assertOk()
            ->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.payment_status', 'paid');
    }

    public function test_payment_after_expiry_is_recorded_and_flagged_for_the_team(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $payment = $this->pay($order, $token);
        $this->travel(31)->minutes();
        $this->artisan('orders:expire-unpaid')->assertSuccessful();
        $this->assertSame(10, $this->variant->refresh()->stock_quantity);

        $this->postJson("/api/v1/orders/{$order->order_number}/pay", ['token' => $token])->assertUnprocessable();
        $this->webhook($this->succeeded($payment))->assertOk();

        $order->refresh();
        $this->assertSame(['expired', 'paid'], [$order->status->value, $order->payment_status->value]);
        $flag = $order->histories()->where('field', 'payment_status')->reorder()->latest('id')->first();
        $this->assertFalse($flag->is_customer_visible);
        $this->assertStringContainsString('Refund or reinstate', $flag->note);

        $timeline = $this->getJson("/api/v1/orders/{$order->order_number}?token={$token}")->json('data.timeline');
        $this->assertNotContains('paid', array_column($timeline, 'value'), 'Internal flags stay internal.');
    }

    public function test_a_second_successful_attempt_is_flagged_as_a_duplicate_payment(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $first = $this->pay($order, $token);
        $second = $this->pay($order, $token);
        $this->assertSame('cancelled', $first->refresh()->status->value);

        $this->webhook($this->succeeded($second))->assertOk();
        $this->webhook($this->succeeded($first))->assertOk(); // the abandoned attempt was completed too

        $this->assertSame(2, Payment::where('status', 'succeeded')->count());
        $this->assertStringContainsString('Duplicate payment', $order->histories()->reorder()->latest('id')->first()->note);
        $this->assertSame('confirmed', $order->refresh()->status->value);
    }

    public function test_card_data_is_never_stored_even_if_a_provider_sends_it(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $payment = $this->pay($order, $token);

        $this->webhook($this->succeeded($payment, ['card' => ['number' => '4111 1111 1111 1111', 'cvv' => '123', 'exp_month' => '12', 'last4' => '1111'], 'note' => 'paid with 4111111111111111']))
            ->assertOk();

        $stored = json_encode([PaymentWebhookEvent::sole()->payload, $payment->refresh()->getAttributes()['gateway_response']]);
        $this->assertStringNotContainsString('4111111111111111', $stored);
        $this->assertStringNotContainsString('4111 1111 1111 1111', $stored);
        $this->assertStringNotContainsString('"123"', $stored);
        $this->assertSame('1111', $payment->card_last4);
    }

    public function test_customers_pay_only_their_own_orders(): void
    {
        $owner = Customer::factory()->create();
        [$order] = $this->placeCardOrder();
        DB::table('orders')->where('id', $order->id)->update(['customer_id' => $owner->id, 'guest_access_token_hash' => null]);

        $this->actingAs(Customer::factory()->create(), 'customer')->fromFrontend();
        $this->postJson("/api/v1/orders/{$order->order_number}/pay")->assertNotFound();

        $this->actingAs($owner, 'customer')->fromFrontend();
        $this->postJson("/api/v1/orders/{$order->order_number}/pay")->assertCreated();
    }

    public function test_unknown_providers_and_unknown_payments(): void
    {
        $this->postJson('/api/v1/payments/webhooks/stripe', [])->assertNotFound();

        $this->webhook(['event_id' => 'evt_1', 'merchant_reference' => (string) Str::uuid(), 'status' => 'succeeded', 'amount_piastres' => 1, 'currency' => 'EGP'])
            ->assertOk();
        $this->assertSame('ignored', PaymentWebhookEvent::sole()->processing_status);
    }

    public function test_admins_review_and_reprocess_webhook_events(): void
    {
        [$order, $token] = $this->placeCardOrder();
        $payment = $this->pay($order, $token);
        $this->webhook($this->succeeded($payment, ['amount_piastres' => 1]))->assertOk();
        $event = PaymentWebhookEvent::sole();

        $this->actingAs(AdminUser::factory()->role(AdminRole::Support)->create(), 'admin')->fromFrontend();
        $this->getJson('/api/v1/admin/payment-webhook-events')->assertForbidden();

        $this->actingAs(AdminUser::factory()->role(AdminRole::StoreManager)->create(), 'admin')->fromFrontend();
        $this->getJson('/api/v1/admin/payment-webhook-events?processing_status=failed')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.result.amount_piastres', 1);

        $this->postJson("/api/v1/admin/payment-webhook-events/{$event->id}/reprocess")->assertStatus(202);
        $this->assertSame('failed', $event->refresh()->processing_status, 'The mismatch is still a mismatch.');
        $this->assertSame(2, $event->attempts);
    }
}
