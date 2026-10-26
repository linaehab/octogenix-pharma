<?php

namespace App\Models;

use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Created only by CheckoutService; status changes only through OrderStatusService.
 *
 * @property int $id
 * @property string $order_number
 * @property int|null $customer_id
 * @property OrderStatus $status
 * @property OrderPaymentStatus $payment_status
 * @property PaymentMethod $payment_method
 * @property string $currency
 * @property int $subtotal_piastres
 * @property int $discount_piastres
 * @property int $shipping_fee_piastres
 * @property int $cod_fee_piastres
 * @property int $total_piastres
 * @property string $customer_first_name
 * @property string $customer_last_name
 * @property string $customer_email
 * @property string $customer_phone
 * @property string $locale
 * @property string|null $guest_access_token_hash
 * @property \Illuminate\Support\Carbon $placed_at
 * @property \Illuminate\Support\Carbon|null $payment_expires_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, OrderItem> $items
 * @property-read \Illuminate\Database\Eloquent\Collection<int, OrderStatusHistory> $histories
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Payment> $payments
 */
class Order extends Model
{
    /** Everything is written by the services; nothing is mass-assigned from requests. */
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'payment_status' => OrderPaymentStatus::class,
            'payment_method' => PaymentMethod::class,
            'subtotal_piastres' => 'integer',
            'discount_piastres' => 'integer',
            'shipping_fee_piastres' => 'integer',
            'cod_fee_piastres' => 'integer',
            'total_piastres' => 'integer',
            'payment_expires_at' => 'datetime',
            'placed_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'paid_at' => 'datetime',
            'shipped_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'returned_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class)->orderBy('id');
    }

    /** @return HasMany<OrderStatusHistory, $this> */
    public function histories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('id');
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('id');
    }

    public function isGuestOrder(): bool
    {
        return $this->customer_id === null;
    }

    public function hasGuestToken(string $token): bool
    {
        return $this->guest_access_token_hash !== null
            && hash_equals($this->guest_access_token_hash, hash('sha256', $token));
    }
}
