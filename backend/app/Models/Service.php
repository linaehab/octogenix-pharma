<?php

namespace App\Models;

use App\Enums\ServiceCategory;
use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property ServiceCategory $category
 * @property string $title_en
 * @property string $title_ar
 * @property string $description_en
 * @property string $description_ar
 * @property string|null $image_path
 * @property string|null $hover_image_path
 * @property string|null $image_alt_en
 * @property string|null $image_alt_ar
 * @property int $sort_order
 * @property bool $is_active
 */
class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category',
        'title_en',
        'title_ar',
        'description_en',
        'description_ar',
        'image_path',
        'hover_image_path',
        'image_alt_en',
        'image_alt_ar',
        'sort_order',
        'is_active',
    ];

    protected $attributes = [
        'sort_order' => 0,
        'is_active' => false,
    ];

    protected function casts(): array
    {
        return [
            'category' => ServiceCategory::class,
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @param Builder<Service> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** @param Builder<Service> $query */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }
}
