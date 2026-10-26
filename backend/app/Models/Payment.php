<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $order_id
 * @property string $merchant_reference
 * @property string $provider
 * @property PaymentMethod $method
 * @property PaymentStatus $status
 * @property int $amount_piastres
 * @property string $currency
 * @property \Illuminate\Support\Carbon|null $verified_at
 * @property \Illuminate\Support\Carbon|null $paid_at
 * @property int|null $collected_by_admin_id
 */
class Payment extends Model
{
    public const PROVIDER_COD = 'cod';

    protected $guarded = ['id'];

    /** Raw gateway responses can contain personal data; never serialise them by accident. */
    protected $hidden = ['gateway_response'];

    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'amount_piastres' => 'integer',
            'is_test' => 'boolean',
            'gateway_response' => 'array',
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
