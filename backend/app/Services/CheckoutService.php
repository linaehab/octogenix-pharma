<?php

namespace App\Services;

use App\Enums\InventoryReason;
use App\Enums\OrderActor;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\TotalsChangedException;
use App\Models\Customer;
use App\Models\Governorate;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Notifications\OrderPlacedNotification;
use App\Notifications\OrderPlacedStaffNotification;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Throwable;

/**
 * Places orders (design v0.3 §7.3). The client supplies only what to buy, where to deliver, how to
 * pay and an idempotency key: prices, shipping fee, COD fee and totals are computed here, inside
 * one transaction that locks the variant rows and reserves the stock.
 */
class CheckoutService
{
    public function __construct(
        private readonly SettingsService $settings,
        private readonly InventoryService $inventory,
        private readonly OrderStatusService $statuses,
        private readonly CartService $cart,
    ) {}

    /**
     * @param  array{
     *     items: array<int, int>,
     *     customer: ?Customer,
     *     contact: array{first_name: string, last_name: string, email: string, phone: string},
     *     address: array<string, ?string>,
     *     customer_address_id: ?int,
     *     governorate_id: int,
     *     payment_method: PaymentMethod,
     *     idempotency_key: string,
     *     expected_total_piastres: ?int,
     *     customer_note: ?string,
     *     locale: string,
     *     ip_address: ?string,
     *     user_agent: ?string,
     * }  $input
     * @return array{order: Order, guest_token: ?string, created: bool}
     */
    public function place(array $input): array
    {
        if ($existing = $this->existingOrder($input)) {
            return ['order' => $existing, 'guest_token' => null, 'created' => false];
        }

        $governorate = $this->assertCanSell($input);
        $guestToken = $input['customer'] === null ? Str::random(48) : null;

        try {
            $order = DB::transaction(fn () => $this->createOrder($input, $governorate, $guestToken));
        } catch (UniqueConstraintViolationException $e) {
            // The same checkout was submitted twice at the same moment: return the order that won.
            if ($existing = $this->existingOrder($input)) {
                return ['order' => $existing, 'guest_token' => null, 'created' => false];
            }
            throw $e;
        }

        $this->notify($order, $guestToken);

        return ['order' => $order, 'guest_token' => $guestToken, 'created' => true];
    }

    /** An order already placed with this idempotency key by the same customer / guest email. */
    private function existingOrder(array $input): ?Order
    {
        $order = Order::query()->where('idempotency_key', $input['idempotency_key'])->first();

        if ($order === null) {
            return null;
        }

        $sameOwner = $input['customer'] !== null
            ? $order->customer_id === $input['customer']->id
            : $order->customer_id === null && $order->customer_email === $input['contact']['email'];

        if (! $sameOwner) {
            throw new ConflictHttpException('This checkout key has already been used.');
        }

        return $order;
    }

    /** Store switches, payment method availability and delivery area (checked again inside the transaction). */
    private function assertCanSell(array $input): Governorate
    {
        if (! $this->settings->get('store.enabled')) {
            throw new ServiceUnavailableHttpException(null, 'The store is not accepting orders right now.');
        }

        $governorate = Governorate::query()->find($input['governorate_id']);
        if ($governorate === null || ! $governorate->is_deliverable) {
            throw ValidationException::withMessages(['governorate_id' => 'We do not deliver to this governorate yet.']);
        }

        if ($input['payment_method'] === PaymentMethod::Cod) {
            if (! $this->settings->get('store.cod_enabled') || $this->settings->get('store.cod_fee_piastres') === null) {
                throw ValidationException::withMessages(['payment_method' => 'Cash on delivery is not available right now.']);
            }
            if (! $governorate->cod_available) {
                throw ValidationException::withMessages(['payment_method' => 'Cash on delivery is not available in this governorate.']);
            }
        }

        if ($input['payment_method'] === PaymentMethod::Card && ! $this->settings->get('store.card_payments_enabled')) {
            // The card provider is not selected yet (decision D-01); the setting cannot be enabled.
            throw ValidationException::withMessages(['payment_method' => 'Card payment is not available yet.']);
        }

        return $governorate;
    }

    private function createOrder(array $input, Governorate $governorate, ?string $guestToken): Order
    {
        $quantities = $input['items'];
        ksort($quantities); // lock rows in ascending ID order to avoid deadlocks between checkouts

        $variants = ProductVariant::withTrashed()
            ->with(['product' => fn ($q) => $q->withTrashed()->with(['brand', 'images'])])
            ->whereIn('id', array_keys($quantities))
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $errors = [];
        $subtotal = 0;
        foreach ($quantities as $variantId => $quantity) {
            $variant = $variants->get($variantId);

            if ($variant === null || $variant->product === null || $variant->product->deleted_at !== null || ! $variant->isAvailable()) {
                $errors["items.{$variantId}"][] = 'This product is no longer available.';
            } elseif ($quantity > $this->cart->maxQuantity($variant)) {
                $errors["items.{$variantId}"][] = 'Only '.$this->cart->maxQuantity($variant).' can be ordered.';
            } else {
                $subtotal += $variant->price_piastres * $quantity;
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $threshold = $this->settings->get('store.free_shipping_threshold_piastres');
        $shippingFee = $threshold !== null && $subtotal >= $threshold ? 0 : (int) $governorate->shipping_fee_piastres;
        $codFee = $input['payment_method'] === PaymentMethod::Cod ? (int) $this->settings->get('store.cod_fee_piastres') : 0;
        $total = $subtotal + $shippingFee + $codFee;

        if ($input['expected_total_piastres'] !== null && $input['expected_total_piastres'] !== $total) {
            throw new TotalsChangedException(['subtotal' => $subtotal, 'shipping_fee' => $shippingFee, 'cod_fee' => $codFee, 'total' => $total]);
        }

        $isCard = $input['payment_method'] === PaymentMethod::Card;
        $status = $isCard ? OrderStatus::PendingPayment : OrderStatus::PendingConfirmation;
        $address = $input['address'];

        $order = Order::create([
            'order_number' => 'TMP-'.Str::random(16),
            'customer_id' => $input['customer']?->id,
            'status' => $status,
            'payment_status' => OrderPaymentStatus::Unpaid,
            'payment_method' => $input['payment_method'],
            'subtotal_piastres' => $subtotal,
            'discount_piastres' => 0,
            'shipping_fee_piastres' => $shippingFee,
            'cod_fee_piastres' => $codFee,
            'total_piastres' => $total,
            'customer_first_name' => $input['contact']['first_name'],
            'customer_last_name' => $input['contact']['last_name'],
            'customer_email' => $input['contact']['email'],
            'customer_phone' => $input['contact']['phone'],
            'customer_address_id' => $input['customer_address_id'],
            'shipping_recipient_name' => $address['recipient_name'],
            'shipping_phone' => $address['phone'],
            'shipping_governorate_id' => $governorate->id,
            'shipping_governorate_name_en' => $governorate->name_en,
            'shipping_governorate_name_ar' => $governorate->name_ar,
            'shipping_city' => $address['city'],
            'shipping_area' => $address['area'] ?? null,
            'shipping_street' => $address['street'],
            'shipping_building' => $address['building'] ?? null,
            'shipping_floor' => $address['floor'] ?? null,
            'shipping_apartment' => $address['apartment'] ?? null,
            'shipping_landmark' => $address['landmark'] ?? null,
            'shipping_postal_code' => $address['postal_code'] ?? null,
            'customer_note' => $input['customer_note'],
            'locale' => $input['locale'],
            'idempotency_key' => $input['idempotency_key'],
            'guest_access_token_hash' => $guestToken !== null ? hash('sha256', $guestToken) : null,
            'payment_expires_at' => $isCard ? now()->addMinutes((int) $this->settings->get('store.pending_payment_ttl_minutes')) : null,
            'placed_at' => now(),
            'ip_address' => $input['ip_address'],
            'user_agent' => $input['user_agent'] !== null ? Str::limit($input['user_agent'], 252) : null,
        ]);
        // Customer-facing number: Cairo date (times are stored in UTC) + zero-padded ID. Format: D-15 proposal.
        $order->forceFill([
            'order_number' => 'JV-'.now('Africa/Cairo')->format('ymd').'-'.str_pad((string) $order->id, 5, '0', STR_PAD_LEFT),
        ])->save();

        foreach ($quantities as $variantId => $quantity) {
            $variant = $variants->get($variantId);
            $order->items()->create([
                'product_id' => $variant->product_id,
                'product_variant_id' => $variant->id,
                'sku' => $variant->sku,
                'product_name_en' => $variant->product->name_en,
                'product_name_ar' => $variant->product->name_ar,
                'variant_name_en' => $variant->name_en,
                'variant_name_ar' => $variant->name_ar,
                'image_path' => $variant->product->images->first()?->path,
                'unit_price_piastres' => $variant->price_piastres,
                'compare_at_price_piastres' => $variant->compare_at_price_piastres,
                'quantity' => $quantity,
                'discount_piastres' => 0,
                'line_total_piastres' => $variant->price_piastres * $quantity,
            ]);

            // Guarded decrement: fails (and rolls everything back) if stock ran out meanwhile.
            $this->inventory->adjust($variant, -$quantity, InventoryReason::OrderReserved, orderId: $order->id);
        }

        if (! $isCard) {
            $order->payments()->create([
                'merchant_reference' => (string) Str::uuid(),
                'provider' => Payment::PROVIDER_COD,
                'method' => PaymentMethod::Cod,
                'status' => PaymentStatus::Pending,
                'amount_piastres' => $total,
            ]);
        }

        $this->statuses->record($order, 'status', null, $status->value,
            $input['customer'] ? OrderActor::Customer : OrderActor::Guest);

        $input['customer']?->cartItems()->whereIn('product_variant_id', array_keys($quantities))->delete();

        return $order;
    }

    /** Emails are queued after the commit; a mail problem never affects the order. */
    private function notify(Order $order, ?string $guestToken): void
    {
        try {
            Notification::route('mail', $order->customer_email)->notify(new OrderPlacedNotification($order, $guestToken));

            $staff = $this->settings->get('orders.notification_recipients');
            if (! empty($staff)) {
                Notification::route('mail', $staff)->notify(new OrderPlacedStaffNotification($order));
            }
        } catch (Throwable $e) {
            report($e);
        }
    }
}
