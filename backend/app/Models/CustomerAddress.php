<?php

namespace App\Models;

use Database\Factories\CustomerAddressFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $customer_id
 * @property string|null $label
 * @property string $recipient_name
 * @property string $phone
 * @property int $governorate_id
 * @property string $city
 * @property string|null $area
 * @property string $street
 * @property string|null $building
 * @property string|null $floor
 * @property string|null $apartment
 * @property string|null $landmark
 * @property string|null $postal_code
 * @property bool $is_default
 * @property-read Governorate $governorate
 */
class CustomerAddress extends Model
{
    /** @use HasFactory<CustomerAddressFactory> */
    use HasFactory, SoftDeletes;

    public const MAX_PER_CUSTOMER = 10;

    protected $fillable = [
        'label',
        'recipient_name',
        'phone',
        'governorate_id',
        'city',
        'area',
        'street',
        'building',
        'floor',
        'apartment',
        'landmark',
        'postal_code',
        'is_default',
    ];

    protected $attributes = [
        'is_default' => false,
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<Governorate, $this> */
    public function governorate(): BelongsTo
    {
        return $this->belongsTo(Governorate::class);
    }
}
