<?php

namespace App\Models;

use App\Enums\BrandLinkType;
use Database\Factories\BrandFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $slug
 * @property string $name_en
 * @property string $name_ar
 * @property string|null $label_en
 * @property string|null $label_ar
 * @property string|null $short_description_en
 * @property string|null $short_description_ar
 * @property string|null $description_en
 * @property string|null $description_ar
 * @property string|null $logo_path
 * @property string|null $image_path
 * @property string|null $hover_image_path
 * @property string|null $image_alt_en
 * @property string|null $image_alt_ar
 * @property string|null $cta_label_en
 * @property string|null $cta_label_ar
 * @property BrandLinkType $link_type
 * @property string|null $link_url
 * @property bool $has_store
 * @property bool $is_featured
 * @property bool $is_active
 * @property int $sort_order
 */
class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'slug',
        'name_en',
        'name_ar',
        'label_en',
        'label_ar',
        'short_description_en',
        'short_description_ar',
        'description_en',
        'description_ar',
        'logo_path',
        'image_path',
        'hover_image_path',
        'image_alt_en',
        'image_alt_ar',
        'cta_label_en',
        'cta_label_ar',
        'link_type',
        'link_url',
        'has_store',
        'is_featured',
        'is_active',
        'sort_order',
    ];

    protected $attributes = [
        'link_type' => 'none',
        'has_store' => false,
        'is_featured' => false,
        'is_active' => false,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'link_type' => BrandLinkType::class,
            'has_store' => 'boolean',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /** @param Builder<Brand> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** @param Builder<Brand> $query */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }
}
