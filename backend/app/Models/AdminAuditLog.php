<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * One admin action (append-only). Written by App\Services\AuditLogger inside the transaction of
 * the change it describes; never updated or deleted by the application.
 *
 * @property int $id
 * @property int|null $admin_user_id
 * @property string $admin_name
 * @property string $category
 * @property string $action
 * @property string $subject_type
 * @property string|null $subject_id
 * @property string|null $subject_label
 * @property array<string, array{from: mixed, to: mixed}>|null $changes
 * @property \Illuminate\Support\Carbon $created_at
 */
class AdminAuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['admin_user_id', 'admin_name', 'category', 'action', 'subject_type', 'subject_id', 'subject_label', 'changes'];

    protected function casts(): array
    {
        return ['changes' => 'array', 'created_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Audit log entries cannot be changed.'));
        static::deleting(fn () => throw new LogicException('Audit log entries cannot be deleted.'));
    }

    /** @return BelongsTo<AdminUser, $this> */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'admin_user_id');
    }
}
