<?php

namespace App\Models;

use App\Enums\OrderActor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only.
 *
 * @property int $id
 * @property int $order_id
 * @property string $field
 * @property string|null $from_value
 * @property string $to_value
 * @property OrderActor $actor_type
 * @property int|null $admin_user_id
 * @property string|null $note
 * @property bool $is_customer_visible
 * @property \Illuminate\Support\Carbon $created_at
 * @property-read AdminUser|null $admin
 */
class OrderStatusHistory extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'actor_type' => OrderActor::class,
            'is_customer_visible' => 'boolean',
        ];
    }

    /** @return BelongsTo<AdminUser, $this> */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'admin_user_id');
    }
}
