<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Customer;
use App\Models\ProductVariant;
use App\Support\ImagePath;
use App\Support\Localized;
use App\Support\Money;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cart lines priced from the database (design v0.3 §7.3): the client sends variant IDs and
 * quantities only. Totals shown here are informational; checkout recalculates them with locks.
 * Nothing in the cart reserves stock.
 */
class CartService
{
    /** Upper bound per line when a variant has no max_per_order. */
    public const DEFAULT_MAX_PER_LINE = 99;

    public const MAX_LINES = 50;

    /**
     * @param  array<int, int>  $quantities  variant ID => quantity
     * @return array{items: list<array<string, mixed>>, subtotal: array{amount_piastres: int, currency: string}, item_count: int, has_unavailable_items: bool}
     */
    public function summarize(array $quantities): array
    {
        $variants = $this->variants(array_keys($quantities));
        $lines = [];
        $subtotal = 0;
        $count = 0;
        $hasUnavailable = false;

        foreach ($quantities as $variantId => $quantity) {
            $variant = $variants->get($variantId);
            if ($variant === null) {
                continue;
            }

            $available = $this->isAvailable($variant);
            $max = $available ? $this->maxQuantity($variant) : 0;
            $lineTotal = $available ? $variant->price_piastres * $quantity : 0;
            $exceedsStock = $available && $quantity > $max;

            if ($available && ! $exceedsStock) {
                $subtotal += $lineTotal;
                $count += $quantity;
            } else {
                $hasUnavailable = true;
            }

            $product = $variant->product;
            $lines[] = [
                'variant_id' => $variant->id,
                'sku' => $variant->sku,
                'product' => $product ? [
                    'slug' => $product->slug,
                    'name' => Localized::pair($product, 'name'),
                    'image_url' => ImagePath::url($product->images->first()?->path),
                ] : null,
                'variant_name' => Localized::pair($variant, 'name'),
                'unit_price' => Money::of($available ? $variant->price_piastres : null),
                'quantity' => $quantity,
                'line_total' => Money::of($available ? $lineTotal : null),
                'is_available' => $available,
                'max_quantity' => $max,
                'exceeds_available_quantity' => $exceedsStock,
            ];
        }

        return [
            'items' => $lines,
            'subtotal' => Money::of($subtotal),
            'item_count' => $count,
            'has_unavailable_items' => $hasUnavailable,
        ];
    }

    /** @return array<string, mixed> */
    public function summarizeFor(Customer $customer): array
    {
        return $this->summarize(
            $customer->cartItems()->orderBy('id')->pluck('quantity', 'product_variant_id')->map(fn ($q) => (int) $q)->all()
        );
    }

    /** @throws ValidationException when the variant cannot be bought or the quantity is too high */
    public function setQuantity(Customer $customer, ProductVariant $variant, int $quantity): void
    {
        $variant = $this->variants([$variant->id])->get($variant->id);

        if ($variant === null || ! $this->isAvailable($variant)) {
            throw ValidationException::withMessages(['variant' => 'This product is not available right now.']);
        }

        $max = $this->maxQuantity($variant);
        if ($quantity > $max) {
            throw ValidationException::withMessages(['quantity' => "You can add at most {$max} of this item."]);
        }

        DB::transaction(function () use ($customer, $variant, $quantity) {
            $exists = $customer->cartItems()->where('product_variant_id', $variant->id)->exists();

            if (! $exists && $customer->cartItems()->lockForUpdate()->count() >= self::MAX_LINES) {
                throw ValidationException::withMessages(['variant' => 'Your cart is full.']);
            }

            CartItem::query()->updateOrCreate(
                ['customer_id' => $customer->id, 'product_variant_id' => $variant->id],
                ['quantity' => $quantity],
            );
        });
    }

    /**
     * Merges a guest's browser cart into the account cart after sign-in. Quantities are added and
     * capped at what can be bought; unavailable items are skipped. Returns what was adjusted.
     *
     * @param  array<int, int>  $incoming  variant ID => quantity
     * @return list<array{variant_id: int, requested: int, added: int}>
     */
    public function merge(Customer $customer, array $incoming): array
    {
        $variants = $this->variants(array_keys($incoming));
        $adjusted = [];

        DB::transaction(function () use ($customer, $incoming, $variants, &$adjusted) {
            $existing = $customer->cartItems()->lockForUpdate()->pluck('quantity', 'product_variant_id');

            foreach ($incoming as $variantId => $quantity) {
                $variant = $variants->get($variantId);
                $available = $variant !== null && $this->isAvailable($variant);
                $current = (int) ($existing[$variantId] ?? 0);
                $target = $available ? min($current + $quantity, $this->maxQuantity($variant)) : $current;

                if (! $available || $target - $current < $quantity) {
                    $adjusted[] = ['variant_id' => (int) $variantId, 'requested' => $quantity, 'added' => max(0, $target - $current)];
                }
                if (! $available || $target <= $current) {
                    continue;
                }
                if ($current === 0 && $existing->count() >= self::MAX_LINES) {
                    continue;
                }

                CartItem::query()->updateOrCreate(
                    ['customer_id' => $customer->id, 'product_variant_id' => $variantId],
                    ['quantity' => $target],
                );
                $existing[$variantId] = $target;
            }
        });

        return $adjusted;
    }

    public function maxQuantity(ProductVariant $variant): int
    {
        return max(0, min($variant->max_per_order ?? self::DEFAULT_MAX_PER_LINE, $variant->stock_quantity));
    }

    private function isAvailable(ProductVariant $variant): bool
    {
        return $variant->product !== null && $variant->product->deleted_at === null && $variant->isAvailable();
    }

    /** @return Collection<int, ProductVariant> keyed by ID, including soft-deleted rows (shown as unavailable) */
    private function variants(array $ids): Collection
    {
        return ProductVariant::withTrashed()
            ->with(['product' => fn ($q) => $q->withTrashed()->with(['brand', 'images'])])
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');
    }
}
