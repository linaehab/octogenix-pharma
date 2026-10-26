<?php

namespace App\Models;

use Database\Factories\GovernorateFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $code
 * @property string $name_en
 * @property string $name_ar
 * @property int|null $shipping_fee_piastres
 * @property int|null $delivery_days_min
 * @property int|null $delivery_days_max
 * @property bool $cod_available
 * @property bool $is_deliverable
 * @property int $sort_order
 */
class Governorate extends Model
{
    /** @use HasFactory<GovernorateFactory> */
    use HasFactory;

    protected $fillable = [
        'code',
        'name_en',
        'name_ar',
        'shipping_fee_piastres',
        'delivery_days_min',
        'delivery_days_max',
        'cod_available',
        'is_deliverable',
        'sort_order',
    ];

    protected $attributes = [
        'cod_available' => true,
        'is_deliverable' => false,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'shipping_fee_piastres' => 'integer',
            'delivery_days_min' => 'integer',
            'delivery_days_max' => 'integer',
            'cod_available' => 'boolean',
            'is_deliverable' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @param Builder<Governorate> $query */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('name_en');
    }
}
