<?php

namespace App\Services;

use App\Enums\OrderActor;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Payments\CardDataSanitizer;
use App\Payments\GatewayManager;
use App\Payments\GatewayResult;
use App\Payments\PaymentMismatch;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Card payment attempts and the only code that applies a provider's result (design v0.3 §7.4).
 * A result is applied only after the provider authenticated it (signed webhook or server-to-server
 * status check) and only if its reference, amount and currency match the attempt.
 */
class PaymentService
{
    public function __construct(
        private readonly GatewayManager $gateways,
        private readonly SettingsService $settings,
        private readonly OrderStatusService $statuses,
    ) {}

    /**
     * Starts (or restarts, after a failure) the card payment of a pending order.
     *
     * @return array{payment: Payment, redirect_url: string}
     */
    public function startCardPayment(Order $order): array
    {
        $provider = $this->assertCardPaymentPossible($order);
        $gateway = $this->gateways->driver($provider);

        $payment = DB::transaction(function () use ($order, $provider) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $this->assertCardPaymentPossible($locked);

            // Earlier unfinished attempts are abandoned locally; if one still succeeds at the
            // provider, applyResult() flags it as a duplicate payment for the team.
            $locked->payments()->whereIn('status', [PaymentStatus::Initiated, PaymentStatus::Pending])
                ->update(['status' => PaymentStatus::Cancelled]);

            return $locked->payments()->create([
                'merchant_reference' => (string) Str::uuid(),
                'provider' => $provider,
                'method' => PaymentMethod::Card,
                'status' => PaymentStatus::Initiated,
                'amount_piastres' => $locked->total_piastres,
                'currency' => $locked->currency,
                'expires_at' => $locked->payment_expires_at,
                'is_test' => $provider === 'fake',
            ]);
        });

        try {
            $checkout = $gateway->createCheckout($payment, $order, (string) config('payments.return_url'));
        } catch (Throwable $e) {
            report($e);
            $payment->forceFill(['status' => PaymentStatus::Failed, 'failure_message' => 'Could not reach the payment provider.'])->save();

            throw new HttpException(502, 'The payment provider is not available right now. Please try again.');
        }

        $payment->forceFill(['status' => PaymentStatus::Pending, 'provider_order_id' => $checkout->providerOrderId])->save();

        return ['payment' => $payment, 'redirect_url' => $checkout->redirectUrl];
    }

    /** Asks the provider for the latest attempt's state (used by the payment-result page). */
    public function syncLatest(Order $order): void
    {
        $payment = $order->payments()->where('method', PaymentMethod::Card)
            ->whereIn('status', [PaymentStatus::Initiated, PaymentStatus::Pending])->latest('id')->first();

        if ($payment && $this->gateways->has($payment->provider)
            && ($result = $this->gateways->driver($payment->provider)->fetchResult($payment))) {
            $this->applyResult($payment, $result);
        }
    }

    /**
     * Applies an authenticated provider result to the attempt and its order. Idempotent: applying
     * the same success twice changes nothing, and a success is never downgraded.
     *
     * @throws PaymentMismatch
     */
    public function applyResult(Payment $payment, GatewayResult $result): void
    {
        DB::transaction(function () use ($payment, $result) {
            $order = Order::query()->whereKey($payment->order_id)->lockForUpdate()->firstOrFail();
            $locked = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($result->merchantReference !== $locked->merchant_reference
                || $result->amountPiastres !== $locked->amount_piastres
                || strtoupper($result->currency) !== $locked->currency) {
                throw new PaymentMismatch(sprintf('Expected %s %d %s, provider reported %s %d %s.',
                    $locked->merchant_reference, $locked->amount_piastres, $locked->currency,
                    $result->merchantReference, $result->amountPiastres, $result->currency));
            }

            if ($locked->status === PaymentStatus::Succeeded) {
                return; // already applied; later failures cannot undo a verified success
            }

            if ($result->status !== PaymentStatus::Succeeded) {
                $locked->forceFill([
                    'status' => $result->status,
                    'failure_code' => $result->failureCode,
                    'failure_message' => $result->failureMessage !== null ? Str::limit($result->failureMessage, 497) : null,
                    'gateway_response' => CardDataSanitizer::clean($result->raw),
                ])->save();

                return; // the order stays pending_payment, so the customer can try again
            }

            $locked->forceFill([
                'status' => PaymentStatus::Succeeded,
                'provider_transaction_id' => $result->providerTransactionId,
                'card_brand' => $result->cardBrand,
                'card_last4' => $result->cardLast4 !== null ? substr(preg_replace('/\D/', '', $result->cardLast4), -4) : null,
                'gateway_response' => CardDataSanitizer::clean($result->raw),
                'verified_at' => now(),
                'paid_at' => now(),
            ])->save();

            $this->applySuccessToOrder($order, $locked);
        });
    }

    private function applySuccessToOrder(Order $order, Payment $payment): void
    {
        if ($order->payment_status === OrderPaymentStatus::Paid) {
            $this->statuses->record($order, 'payment_status', 'paid', 'paid', OrderActor::PaymentGateway,
                note: "Duplicate payment received (attempt {$payment->merchant_reference}). A refund is needed.",
                customerVisible: false);

            return;
        }

        $order->forceFill(['payment_status' => OrderPaymentStatus::Paid, 'paid_at' => now()])->save();

        if ($order->status === OrderStatus::PendingPayment) {
            $this->statuses->record($order, 'payment_status', 'unpaid', 'paid', OrderActor::PaymentGateway);
            $this->statuses->transition($order, OrderStatus::Confirmed, OrderActor::PaymentGateway);

            return;
        }

        // Paid after the order expired or was cancelled: its stock was released. The team decides
        // whether to refund or reinstate it (design v0.3 §7.4).
        $this->statuses->record($order, 'payment_status', 'unpaid', 'paid', OrderActor::PaymentGateway,
            note: "Payment received after the order was {$order->status->value}. Refund or reinstate the order.",
            customerVisible: false);
    }

    /** @return string the configured provider */
    private function assertCardPaymentPossible(Order $order): string
    {
        $provider = $this->settings->get('store.card_provider');

        $reason = match (true) {
            $order->payment_method !== PaymentMethod::Card => 'This order is not paid by card.',
            $order->status !== OrderStatus::PendingPayment => 'This order is not waiting for payment.',
            $order->payment_status === OrderPaymentStatus::Paid => 'This order is already paid.',
            $order->payment_expires_at !== null && $order->payment_expires_at->isPast() => 'The time to pay for this order has passed.',
            ! $this->settings->get('store.card_payments_enabled') || $provider === null || ! $this->gateways->has($provider)
                => 'Card payment is not available right now.',
            default => null,
        };

        if ($reason !== null) {
            throw ValidationException::withMessages(['payment' => $reason]);
        }

        return $provider;
    }
}
