<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * An in-dashboard notification for one admin. The text is built by the dashboard from `type` and
 * `data` (so it shows in English or Arabic); `link` is an /admin path or null.
 *
 * @property int $id
 * @property int $admin_user_id
 * @property string $category
 * @property string $type
 * @property array<string, mixed> $data
 * @property string|null $link
 * @property string $dedupe_key
 * @property \Illuminate\Support\Carbon|null $read_at
 * @property \Illuminate\Support\Carbon $created_at
 */
class AdminNotification extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['admin_user_id', 'category', 'type', 'data', 'link', 'dedupe_key', 'read_at'];

    protected function casts(): array
    {
        return ['data' => 'array', 'read_at' => 'datetime', 'created_at' => 'datetime'];
    }

    /** @param Builder<AdminNotification> $query */
    public function scopeUnread(Builder $query): void
    {
        $query->whereNull('read_at');
    }
}
