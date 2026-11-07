<?php

namespace App\Services;

use App\Enums\InventoryReason;
use App\Models\AdminUser;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Rules spanning several rows of a product: one default variant, one primary image, and an
 * active product always keeping at least one active variant and one image.
 */
class CatalogService
{
    public function __construct(private readonly InventoryService $inventory) {}

    /**
     * A product and its single size (default variant) in one transaction: either both are saved or
     * neither. New products start hidden; opening stock goes through the inventory service.
     *
     * @param  array<string, mixed>  $productData  validated product fields
     * @param  array<string, mixed>|null  $variantData  validated size fields, optionally with initial_stock
     */
    public function createProduct(array $productData, ?array $variantData, ?AdminUser $admin): Product
    {
        return DB::transaction(function () use ($productData, $variantData, $admin) {
            $product = Product::create($productData);
            if ($variantData !== null) {
                $this->createVariant($product, $variantData, $admin);
            }

            return $product;
        });
    }

    /**
     * Product fields and the fields of its single size together. Only the default variant is ever
     * edited here, so a request cannot reach another product's variant.
     *
     * @param  array<string, mixed>  $productData
     * @param  array<string, mixed>|null  $variantData
     */
    public function updateProduct(Product $product, array $productData, ?array $variantData): Product
    {
        return DB::transaction(function () use ($product, $productData, $variantData) {
            Product::query()->whereKey($product->id)->lockForUpdate()->first();

            if ($variantData !== null && $variantData !== []) {
                $variant = $product->variants()->where('is_default', true)->first();
                if ($variant === null) {
                    throw ValidationException::withMessages(['variant' => 'This product has no size yet.']);
                }
                $variant->update($variantData);
                $product->touch();
            }
            $product->update($productData);

            return $product;
        });
    }

    /**
     * Archive (soft delete): hidden from the store and the dashboard list, never removed. Order
     * lines keep pointing at the product and its SKU. It is hidden first, so restoring it never
     * puts it back on sale by surprise.
     */
    public function archiveProduct(Product $product): void
    {
        DB::transaction(function () use ($product) {
            $product->update(['is_active' => false, 'is_purchasable' => false, 'is_featured' => false]);
            $product->delete();
        });
    }

    /** Back from the archive, still hidden: the admin reviews it before showing it again. */
    public function restoreProduct(Product $product): Product
    {
        $product->restore();

        return $product;
    }

    /** @param array<string, mixed> $data validated variant fields, optionally with initial_stock */
    public function createVariant(Product $product, array $data, ?AdminUser $admin): ProductVariant
    {
        $initialStock = (int) ($data['initial_stock'] ?? 0);
        unset($data['initial_stock']);

        return DB::transaction(function () use ($product, $data, $initialStock, $admin) {
            Product::query()->whereKey($product->id)->lockForUpdate()->first();

            // Business rule: every product has exactly one size. A removed (soft-deleted) size does
            // not count, so a product whose only size was removed can be given a new one.
            if ($product->variants()->exists()) {
                throw ValidationException::withMessages([
                    'variant' => 'Each product has a single size. Edit its existing size instead of adding another.',
                ]);
            }
            $isFirst = true;

            if ($isFirst || ! empty($data['is_default'])) {
                $product->variants()->update(['is_default' => false]);
                $data['is_default'] = true;
            }

            $variant = $product->variants()->create($data);

            if ($initialStock > 0) {
                $this->inventory->adjust($variant, $initialStock, InventoryReason::InitialStock, $admin, 'Opening stock');
            }

            return $variant->refresh();
        });
    }

    /** @param array<string, mixed> $data */
    public function updateVariant(ProductVariant $variant, array $data): ProductVariant
    {
        return DB::transaction(function () use ($variant, $data) {
            $product = Product::query()->whereKey($variant->product_id)->lockForUpdate()->firstOrFail();

            if (($data['is_active'] ?? true) === false && $variant->is_active) {
                $this->assertActiveProductKeepsAVariant($product, $variant);
            }
            if (($data['is_default'] ?? null) === false && $variant->is_default) {
                throw ValidationException::withMessages([
                    'is_default' => 'Choose another size/pack as the default instead.',
                ]);
            }
            if (! empty($data['is_default']) && ! $variant->is_default) {
                $product->variants()->whereKeyNot($variant->id)->update(['is_default' => false]);
            }

            $variant->update($data);

            return $variant;
        });
    }

    /** Soft delete: order history keeps referring to the variant and its SKU. */
    public function deleteVariant(ProductVariant $variant): void
    {
        DB::transaction(function () use ($variant) {
            $product = Product::query()->whereKey($variant->product_id)->lockForUpdate()->firstOrFail();

            if ($variant->is_active) {
                $this->assertActiveProductKeepsAVariant($product, $variant);
            }

            $variant->forceFill(['is_default' => false])->save();
            $variant->delete();

            if (! $product->variants()->where('is_default', true)->exists()) {
                $product->variants()->orderByDesc('is_active')->first()?->update(['is_default' => true]);
            }
        });
    }

    /** @param array{path: string, alt_en?: ?string, alt_ar?: ?string, is_primary?: bool} $data */
    public function addImage(Product $product, array $data): ProductImage
    {
        return DB::transaction(function () use ($product, $data) {
            Product::query()->whereKey($product->id)->lockForUpdate()->first();
            $images = $product->images()->get();
            $primary = $images->isEmpty() || ! empty($data['is_primary']);

            if ($primary) {
                $product->images()->update(['is_primary' => false]);
            }

            return $product->images()->create([
                ...$data,
                'is_primary' => $primary,
                'sort_order' => ($images->max('sort_order') ?? -1) + 1,
            ]);
        });
    }

    /** @param array{alt_en?: ?string, alt_ar?: ?string, is_primary?: bool} $data */
    public function updateImage(ProductImage $image, array $data): ProductImage
    {
        return DB::transaction(function () use ($image, $data) {
            if (array_key_exists('is_primary', $data) && ! $data['is_primary'] && $image->is_primary) {
                throw ValidationException::withMessages(['is_primary' => 'Choose another image as the main image instead.']);
            }
            if (! empty($data['is_primary']) && ! $image->is_primary) {
                ProductImage::query()->where('product_id', $image->product_id)->update(['is_primary' => false]);
            }

            $image->update($data);

            return $image;
        });
    }

    public function deleteImage(ProductImage $image): void
    {
        DB::transaction(function () use ($image) {
            $product = Product::query()->whereKey($image->product_id)->lockForUpdate()->firstOrFail();
            $others = $product->images()->whereKeyNot($image->id)->get();

            if ($product->is_active && $others->isEmpty()) {
                throw ValidationException::withMessages([
                    'image' => 'An active product needs at least one image. Deactivate the product first.',
                ]);
            }

            $image->delete();

            if ($image->is_primary && $others->isNotEmpty()) {
                $others->first()->update(['is_primary' => true]);
            }
        });
    }

    /** @param list<int> $ids every image of the product, in the new order */
    public function reorderImages(Product $product, array $ids): void
    {
        DB::transaction(function () use ($product, $ids) {
            $existing = $product->images()->lockForUpdate()->pluck('id')->sort()->values()->all();
            $given = collect($ids)->map(fn ($id) => (int) $id)->sort()->values()->all();

            if ($existing !== $given) {
                throw ValidationException::withMessages(['ids' => 'Send every image of this product exactly once.']);
            }

            foreach (array_values($ids) as $position => $id) {
                ProductImage::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });
    }

    /** @throws ValidationException */
    private function assertActiveProductKeepsAVariant(Product $product, ProductVariant $variant): void
    {
        $othersActive = $product->variants()->whereKeyNot($variant->id)->where('is_active', true)->exists();

        if ($product->is_active && ! $othersActive) {
            throw ValidationException::withMessages([
                'is_active' => 'An active product needs at least one active size/pack. Deactivate the product first.',
            ]);
        }
    }
}
