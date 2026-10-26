<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Read and write settings through App\Services\SettingsService, which validates
 * values against config/settings.php and keeps the cache in sync.
 *
 * @property int $id
 * @property string $key
 * @property string $group
 * @property string $type
 * @property mixed $value
 * @property bool $is_public
 * @property int|null $updated_by_admin_id
 */
class Setting extends Model
{
    protected $fillable = [
        'key',
        'group',
        'type',
        'value',
        'is_public',
        'updated_by_admin_id',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'json',
            'is_public' => 'boolean',
        ];
    }
}
