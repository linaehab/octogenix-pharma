# Card payments — how the integration works and how to add the provider

Status: the provider-independent foundation is built and tested with a test-only fake driver.
**No real provider is connected** (decision D-01), so card payments cannot be enabled yet.

## Flow

1. **Checkout** (`POST /api/v1/checkout`, `payment_method: card`) creates the order as
   `pending_payment`, reserves stock and sets `payment_expires_at`
   (`store.pending_payment_ttl_minutes`, default 30).
2. **Pay** (`POST /api/v1/orders/{number}/pay`, customer session or guest `token`) creates a
   `payments` row (new `merchant_reference`), asks the driver for a hosted checkout and returns
   `redirect_url`. Card details are entered only on the provider's page.
3. **Webhook** (`POST /api/v1/payments/webhooks/{provider}`): the driver checks the signature;
   the event is stored (duplicate `(provider, event_key)` → 200, not processed again) and queued.
4. **Processing** (`ProcessPaymentWebhook`): if the driver offers a status API, that answer wins
   over the webhook body. `PaymentService::applyResult()` checks reference, amount and currency,
   then marks the attempt and the order (`confirmed` + `paid`). Mismatches are logged, never applied.
5. **Return page** (`/jovie/checkout/payment-result`) never trusts the redirect: it calls
   `POST /api/v1/orders/{number}/payment-status`, which asks the provider server-to-server.
6. **Unpaid orders** expire via `orders:expire-unpaid` (scheduler) and release their stock.

Edge cases handled: failed payment → retry with a new attempt; payment after expiry/cancellation
→ recorded as paid and flagged in the order history (internal) to refund or reinstate; a second
successful attempt → flagged as a duplicate payment needing a refund. Refunds themselves wait for
the refund policy (D-05).

## Adding the real provider

1. Implement `App\Payments\CardGateway` (see `FakeCardGateway` for a complete example):
   `createCheckout()`, `parseWebhook()` (verify the provider's signature, throw
   `InvalidWebhookSignature` otherwise), `fetchResult()` (status API, or `null`).
2. Register it in `config/payments.php` → `drivers` (e.g. `'acme' => AcmeGateway::class`) and put
   credentials in `.env` (never in code or the database).
3. Configure the provider's webhook URL: `https://<site>/api/v1/payments/webhooks/acme`.
4. In the dashboard, set `store.card_provider = acme`, then enable `store.card_payments_enabled`.
5. Test end to end in the provider's sandbox. Note: `payments.is_test` is currently set only for
   the fake driver (`PaymentService::startCardPayment()`); wire it to the new driver's
   sandbox/live setting when adding it.

Never store card numbers, expiry dates or CVVs: `CardDataSanitizer` scrubs stored provider data
as a safety net, but drivers should only pass on what is needed.
