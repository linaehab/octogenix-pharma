<?php

namespace App\Models;

use App\Enums\ContentType;
use App\Enums\Site;
use Illuminate\Database\Eloquent\Model;

/**
 * Read and write through App\Services\ContentService, which validates against the registry.
 *
 * @property int $id
 * @property Site $site
 * @property string $key
 * @property string $group
 * @property ContentType $type
 * @property string|null $value_en
 * @property string|null $value_ar
 * @property string|null $image_path
 * @property string|null $image_ar_path
 * @property int|null $updated_by_admin_id
 */
class ContentEntry extends Model
{
    protected $fillable = [
        'site',
        'key',
        'group',
        'type',
        'value_en',
        'value_ar',
        'image_path',
        'image_ar_path',
        'updated_by_admin_id',
    ];

    protected function casts(): array
    {
        return [
            'site' => Site::class,
            'type' => ContentType::class,
        ];
    }
}
