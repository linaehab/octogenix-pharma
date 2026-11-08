<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\DiscountType;
use App\Exceptions\DiscountChangedException;
use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Services\AuditLogger;
use App\Support\DateInput;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Direct product discounts (routes require catalog.manage). A product has one size/pack (its
 * default variant); the discount lives on it. price_piastres stays the regular price; the
 * discount applies to orders placed while it is active and never changes existing orders.
 *
 * Every change may carry "expected": the discount as the admin saw it ({type, value, is_active,
 * starts_at, ends_at}, or null for none). If it changed since, nothing is saved (409).
 */
class ProductDiscountController extends Controller
{
    public const STATES = ['none', 'active', 'scheduled', 'inactive', 'expired'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'state' => ['sometimes', 'nullable', Rule::in(self::STATES)],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ProductVariant::query()
            ->where('is_default', true)
            ->whereHas('product')
            ->with('product');

        if (($term = trim((string) ($filters['search'] ?? ''))) !== '') {
            $like = '%'.addcslashes($term, '%_\\').'%';
            $query->where(fn (Builder $q) => $q->where('sku', 'like', $like)
                ->orWhereHas('product', fn (Builder $p) => $p->where('name_en', 'like', $like)->orWhere('name_ar', 'like', $like)));
        }
        if (isset($filters['state'])) {
            self::whereState($query, $filters['state']);
        }

        $page = $query->orderBy('product_id')->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => collect($page->items())->map(fn (ProductVariant $v) => $this->present($v))->all(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    /** PUT: set or replace the discount. Body: {type, value, is_active, starts_at?, ends_at?, expected?} */
    public function update(Request $request, ProductVariant $variant): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(DiscountType::class)],
            'value' => ['required', 'integer:strict', 'min:1', 'max:4294967295'],
            'is_active' => ['required', 'boolean:strict'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date'],
            'expected' => ['sometimes', 'nullable', 'array'],
        ]);
        $type = DiscountType::from($data['type']);
        $data['starts_at'] = DateInput::utc($data['starts_at'] ?? null);
        $data['ends_at'] = DateInput::utc($data['ends_at'] ?? null);

        $variant = DB::transaction(function () use ($request, $variant, $data, $type) {
            $locked = $this->lockAndCheck($request, $variant);

            $errors = [];
            if ($type === DiscountType::Percent && $data['value'] > 99) {
                $errors['value'] = 'A percentage discount must be between 1 and 99.';
            }
            if ($type === DiscountType::Fixed && ($locked->price_piastres === null || $data['value'] >= $locked->price_piastres)) {
                $errors['value'] = $locked->price_piastres === null
                    ? 'Set the product price before adding a fixed discount.'
                    : 'A fixed discount must be lower than the price.';
            }
            if ($locked->compare_at_price_piastres !== null) {
                $errors['type'] = 'This product already shows an original (compare-at) price. Remove it from the product before adding a discount.';
            }
            if ($data['ends_at'] !== null && $data['starts_at'] !== null && $data['ends_at']->lte($data['starts_at'])) {
                $errors['ends_at'] = 'The end must be after the start.';
            } elseif ($data['ends_at'] !== null && $data['ends_at']->lte(now())) {
                $errors['ends_at'] = 'The end must be in the future.';
            }
            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }

            $before = $this->snapshot($locked);
            $locked->forceFill([
                'discount_type' => $type,
                'discount_value' => $data['value'],
                'discount_is_active' => $data['is_active'],
                'discount_starts_at' => $data['starts_at'],
                'discount_ends_at' => $data['ends_at'],
            ])->save();

            $diff = AuditLogger::diff($before, $this->snapshot($locked));
            if ($diff !== []) {
                $action = match (true) {
                    $before['discount_type'] === null => 'discounts.product_discount_added',
                    array_keys($diff) === ['discount_is_active'] => $locked->discount_is_active
                        ? 'discounts.product_discount_activated' : 'discounts.product_discount_deactivated',
                    default => 'discounts.product_discount_changed',
                };
                app(AuditLogger::class)->record($action, 'product', $locked->product_id, $locked->product?->name_en, $diff);
            }

            return $locked;
        });

        return response()->json(['data' => $this->present($variant)]);
    }

    public function destroy(Request $request, ProductVariant $variant): JsonResponse
    {
        $request->validate(['expected' => ['sometimes', 'nullable', 'array']]);

        $variant = DB::transaction(function () use ($request, $variant) {
            $locked = $this->lockAndCheck($request, $variant);
            if ($locked->discount_type === null) {
                return $locked;
            }

            $before = $this->snapshot($locked);
            $locked->forceFill([
                'discount_type' => null,
                'discount_value' => null,
                'discount_is_active' => false,
                'discount_starts_at' => null,
                'discount_ends_at' => null,
            ])->save();
            app(AuditLogger::class)->record('discounts.product_discount_removed', 'product', $locked->product_id,
                $locked->product?->name_en, AuditLogger::diff($before, $this->snapshot($locked)));

            return $locked;
        });

        return response()->json(['data' => $this->present($variant)]);
    }

    /** @param  Builder<ProductVariant>  $query */
    public static function whereState(Builder $query, string $state): void
    {
        $now = now();
        if ($state === 'none') {
            $query->whereNull('discount_type');

            return;
        }

        $query->whereNotNull('discount_type');
        $notExpired = fn (Builder $q) => $q->whereNull('discount_ends_at')->orWhere('discount_ends_at', '>', $now);
        match ($state) {
            'expired' => $query->where('discount_ends_at', '<=', $now),
            'inactive' => $query->where($notExpired)->where('discount_is_active', false),
            'scheduled' => $query->where($notExpired)->where('discount_is_active', true)->where('discount_starts_at', '>', $now),
            default => $query->where($notExpired)->where('discount_is_active', true)
                ->where(fn (Builder $q) => $q->whereNull('discount_starts_at')->orWhere('discount_starts_at', '<=', $now)),
        };
    }

    private function lockAndCheck(Request $request, ProductVariant $variant): ProductVariant
    {
        $locked = ProductVariant::query()->with('product')->lockForUpdate()->findOrFail($variant->id);

        if ($request->exists('expected') && ! $this->matches($request->input('expected'), $locked)) {
            throw new DiscountChangedException($this->present($locked));
        }

        return $locked;
    }

    private function matches(mixed $expected, ProductVariant $variant): bool
    {
        if ($expected === null) {
            return $variant->discount_type === null;
        }
        if (! is_array($expected) || $variant->discount_type === null) {
            return false;
        }
        $time = fn ($value) => $value === null ? null : strtotime((string) $value);

        return ($expected['type'] ?? null) === $variant->discount_type->value
            && ($expected['value'] ?? null) === $variant->discount_value
            && ($expected['is_active'] ?? null) === $variant->discount_is_active
            && $time($expected['starts_at'] ?? null) === $variant->discount_starts_at?->getTimestamp()
            && $time($expected['ends_at'] ?? null) === $variant->discount_ends_at?->getTimestamp();
    }

    /** @return array<string, mixed> */
    private function snapshot(ProductVariant $variant): array
    {
        return [
            'discount_type' => $variant->discount_type?->value,
            'discount_value' => $variant->discount_value,
            'discount_is_active' => $variant->discount_is_active,
            'discount_starts_at' => $variant->discount_starts_at?->toIso8601String(),
            'discount_ends_at' => $variant->discount_ends_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function present(ProductVariant $variant): array
    {
        $product = $variant->product;

        return [
            'variant_id' => $variant->id,
            'product_id' => $variant->product_id,
            'product' => ['name' => ['en' => $product?->name_en, 'ar' => $product?->name_ar], 'is_active' => (bool) $product?->is_active],
            'sku' => $variant->sku,
            'price_piastres' => $variant->price_piastres,
            'compare_at_price_piastres' => $variant->compare_at_price_piastres,
            'effective_price_piastres' => $variant->effectivePricePiastres(),
            'discount' => $variant->discount_type === null ? null : [
                'type' => $variant->discount_type->value,
                'value' => $variant->discount_value,
                'is_active' => $variant->discount_is_active,
                'starts_at' => $variant->discount_starts_at?->toIso8601String(),
                'ends_at' => $variant->discount_ends_at?->toIso8601String(),
            ],
            'state' => $variant->discountState(),
        ];
    }
}
