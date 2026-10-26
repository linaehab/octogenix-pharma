<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $brand_id
 * @property string $slug
 * @property string $name_en
 * @property string $name_ar
 * @property array<int, array<string, ?string>>|null $nutrition_facts
 * @property int|null $stage
 * @property int|null $age_from_months
 * @property int|null $age_to_months
 * @property bool $is_active
 * @property bool $is_purchasable
 * @property bool $is_featured
 * @property int $sort_order
 * @property-read Brand $brand
 * @property-read \Illuminate\Database\Eloquent\Collection<int, ProductVariant> $variants
 * @property-read \Illuminate\Database\Eloquent\Collection<int, ProductImage> $images
 */
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, SoftDeletes;

    /** Bilingual text fields (each is a pair of _en/_ar columns). */
    public const TEXT_FIELDS = [
        'name', 'subtitle', 'short_description', 'description', 'ingredients',
        'preparation_instructions', 'storage_instructions', 'important_notice', 'meta_title', 'meta_description',
    ];

    protected $guarded = ['id', 'created_at', 'updated_at', 'deleted_at'];

    protected $attributes = [
        'is_active' => false,
        'is_purchasable' => false,
        'is_featured' => false,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'nutrition_facts' => 'array',
            'stage' => 'integer',
            'age_from_months' => 'integer',
            'age_to_months' => 'integer',
            'is_active' => 'boolean',
            'is_purchasable' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Brand, $this> */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * chaperone() sets each loaded variant's `product` relation to this model, so availability
     * checks need no extra queries (and no lazy loading, which strict mode forbids).
     *
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->chaperone()->orderBy('sort_order')->orderBy('id');
    }

    /** @return HasMany<ProductImage, $this> */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderByDesc('is_primary')->orderBy('sort_order')->orderBy('id');
    }

    /** @return HasOne<ProductImage, $this> */
    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    /**
     * Visible on the public site: the product and its brand are active.
     *
     * @param  Builder<Product>  $query
     */
    public function scopeVisible(Builder $query): void
    {
        $query->where('is_active', true)->whereHas('brand', fn (Builder $q) => $q->where('is_active', true));
    }

    /** @param Builder<Product> $query */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /** Whether the store sells this product at all (variant price and stock are checked separately). */
    public function isSellable(): bool
    {
        return $this->is_active && $this->is_purchasable
            && $this->brand->is_active && $this->brand->has_store;
    }
}
