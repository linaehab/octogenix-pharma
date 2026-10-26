<?php

namespace App\Models;

use App\Enums\Site;
use Database\Factories\ContentItemFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property Site $site
 * @property string $list_key
 * @property string|null $title_en
 * @property string|null $title_ar
 * @property string|null $subtitle_en
 * @property string|null $subtitle_ar
 * @property string|null $description_en
 * @property string|null $description_ar
 * @property string|null $image_path
 * @property string|null $secondary_image_path
 * @property string|null $image_alt_en
 * @property string|null $image_alt_ar
 * @property string|null $icon
 * @property string|null $link_url
 * @property int $sort_order
 * @property bool $is_active
 * @property int|null $updated_by_admin_id
 */
class ContentItem extends Model
{
    /** @use HasFactory<ContentItemFactory> */
    use HasFactory;

    /** Registry field name => columns it maps to. */
    public const FIELD_COLUMNS = [
        'title' => ['title_en', 'title_ar'],
        'subtitle' => ['subtitle_en', 'subtitle_ar'],
        'description' => ['description_en', 'description_ar'],
        'image' => ['image_path'],
        'secondary_image' => ['secondary_image_path'],
        'image_alt' => ['image_alt_en', 'image_alt_ar'],
        'icon' => ['icon'],
        'link' => ['link_url'],
    ];

    protected $fillable = [
        'site',
        'list_key',
        'title_en',
        'title_ar',
        'subtitle_en',
        'subtitle_ar',
        'description_en',
        'description_ar',
        'image_path',
        'secondary_image_path',
        'image_alt_en',
        'image_alt_ar',
        'icon',
        'link_url',
        'sort_order',
        'is_active',
        'updated_by_admin_id',
    ];

    protected $attributes = [
        'sort_order' => 0,
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'site' => Site::class,
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @param Builder<ContentItem> $query */
    public function scopeInList(Builder $query, Site $site, string $listKey): void
    {
        $query->where('site', $site->value)->where('list_key', $listKey);
    }

    /** @param Builder<ContentItem> $query */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }
}
