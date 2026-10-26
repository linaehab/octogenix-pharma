<?php

namespace App\Models;

use App\Enums\InventoryReason;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only: rows are created by InventoryService and never updated or deleted.
 *
 * @property int $id
 * @property int $product_variant_id
 * @property int $quantity_change
 * @property int $stock_after
 * @property InventoryReason $reason
 * @property int|null $order_id
 * @property int|null $admin_user_id
 * @property string|null $note
 * @property \Illuminate\Support\Carbon $created_at
 * @property-read AdminUser|null $admin
 */
class InventoryMovement extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'product_variant_id',
        'quantity_change',
        'stock_after',
        'reason',
        'order_id',
        'admin_user_id',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'quantity_change' => 'integer',
            'stock_after' => 'integer',
            'reason' => InventoryReason::class,
        ];
    }

    /** @return BelongsTo<ProductVariant, $this> */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /** @return BelongsTo<AdminUser, $this> */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'admin_user_id');
    }
}
