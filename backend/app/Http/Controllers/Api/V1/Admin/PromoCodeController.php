<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use App\Exceptions\DiscountChangedException;
use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Models\PromoCode;
use App\Rules\PlainText;
use App\Services\AuditLogger;
use App\Support\DateInput;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Promo codes (routes require catalog.manage). Codes are never deleted: switch them off instead,
 * so orders keep their reference. Changes apply to orders placed afterwards; an order keeps the
 * code, type, value and discount it got at checkout.
 *
 * Usage comes from the orders: "used" counts orders that still hold a use (not cancelled or
 * expired), which is what the limits are checked against.
 */
class PromoCodeController extends Controller
{
    public const STATES = ['active', 'scheduled', 'inactive', 'expired'];

    private const FIELDS = ['code', 'description', 'discount_type', 'discount_value', 'min_order_piastres',
        'starts_at', 'ends_at', 'usage_limit', 'per_customer_limit', 'is_active'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:32'],
            'state' => ['sometimes', 'nullable', Rule::in(self::STATES)],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = PromoCode::query()->withCount(['countedOrders as used_count']);
        if (($term = trim((string) ($filters['search'] ?? ''))) !== '') {
            $query->search($term);
        }
        if (isset($filters['state'])) {
            $this->whereState($query, $filters['state']);
        }

        $page = $query->latest('id')->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => collect($page->items())->map(fn (PromoCode $p) => $this->present($p))->all(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function show(PromoCode $promoCode): JsonResponse
    {
        return response()->json(['data' => $this->present($promoCode, detailed: true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, null);

        $promo = DB::transaction(function () use ($data, $request) {
            $admin = $request->user('admin');
            $promo = PromoCode::create([...$data, 'created_by_admin_id' => $admin instanceof AdminUser ? $admin->id : null]);
            app(AuditLogger::class)->record('discounts.promo_code_created', 'promo_code', $promo->id, $promo->code,
                AuditLogger::diff([], $this->snapshot($promo)));

            return $promo;
        });

        return response()->json(['data' => $this->present($promo->refresh(), detailed: true)], 201);
    }

    /** PATCH: any of the fields, plus optional expected_updated_at (409 if it changed since). */
    public function update(Request $request, PromoCode $promoCode): JsonResponse
    {
        $data = $this->validated($request, $promoCode);
        $expected = $request->validate(['expected_updated_at' => ['sometimes', 'nullable', 'date']])['expected_updated_at'] ?? null;

        $promo = DB::transaction(function () use ($promoCode, $data, $expected) {
            $locked = PromoCode::query()->lockForUpdate()->findOrFail($promoCode->id);
            if ($expected !== null && DateInput::utc($expected)?->getTimestamp() !== $locked->updated_at?->getTimestamp()) {
                throw new DiscountChangedException($this->present($locked, detailed: true));
            }

            $this->checkState($locked, $data);

            $before = $this->snapshot($locked);
            $locked->fill($data)->save();
            $diff = AuditLogger::diff($before, $this->snapshot($locked));
            if ($diff !== []) {
                $action = array_keys($diff) === ['is_active']
                    ? ($locked->is_active ? 'discounts.promo_code_activated' : 'discounts.promo_code_deactivated')
                    : 'discounts.promo_code_changed';
                app(AuditLogger::class)->record($action, 'promo_code', $locked->id, $locked->code, $diff);
            }

            return $locked;
        });

        return response()->json(['data' => $this->present($promo->refresh(), detailed: true)]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?PromoCode $existing): array
    {
        if (is_string($request->input('code'))) {
            $request->merge(['code' => PromoCode::normalize($request->input('code'))]);
        }
        $required = $existing === null ? 'required' : 'sometimes';

        $data = $request->validate([
            'code' => [$required, 'string', 'min:3', 'max:32', 'regex:/^[A-Z0-9_-]+$/',
                Rule::unique('promo_codes', 'code')->ignore($existing?->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:255', new PlainText],
            'discount_type' => [$required, Rule::enum(DiscountType::class)],
            'discount_value' => [$required, 'integer:strict', 'min:1', 'max:4294967295'],
            'min_order_piastres' => ['sometimes', 'nullable', 'integer:strict', 'min:1', 'max:4294967295'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date'],
            'usage_limit' => ['sometimes', 'nullable', 'integer:strict', 'min:1', 'max:1000000'],
            'per_customer_limit' => ['sometimes', 'nullable', 'integer:strict', 'min:1', 'max:1000'],
            'is_active' => ['sometimes', 'boolean:strict'],
        ], [
            'code.regex' => 'Use only letters A–Z, digits, "-" and "_".',
        ]);

        foreach (['starts_at', 'ends_at'] as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = DateInput::utc($data[$field]);
            }
        }

        if ($existing === null) {
            $this->checkState(new PromoCode, $data);
        }

        return $data;
    }

    /**
     * Rules on the code as it will be after saving.
     *
     * @param  array<string, mixed>  $changes
     */
    private function checkState(PromoCode $promo, array $changes): void
    {
        $state = array_merge($promo->only(self::FIELDS), $changes);
        $type = $state['discount_type'] instanceof DiscountType ? $state['discount_type'] : DiscountType::tryFrom((string) $state['discount_type']);
        $errors = [];

        if ($type === DiscountType::Percent && $state['discount_value'] > 99) {
            $errors['discount_value'] = 'A percentage discount must be between 1 and 99.';
        }
        if ($state['starts_at'] !== null && $state['ends_at'] !== null && $state['ends_at']->lte($state['starts_at'])) {
            $errors['ends_at'] = 'The end must be after the start.';
        } elseif (array_key_exists('ends_at', $changes) && $changes['ends_at'] !== null && $changes['ends_at']->lte(now())
            && ($promo->ends_at === null || ! $changes['ends_at']->eq($promo->ends_at))) {
            // A new end date must be in the future; an unchanged past one may be sent back as it is.
            $errors['ends_at'] = 'The end must be in the future.';
        }
        if ($state['usage_limit'] !== null && $state['per_customer_limit'] !== null && $state['per_customer_limit'] > $state['usage_limit']) {
            $errors['per_customer_limit'] = 'The per-customer limit cannot be higher than the total limit.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /** @param  Builder<PromoCode>  $query */
    private function whereState(Builder $query, string $state): void
    {
        $now = now();
        $notExpired = fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', $now);
        match ($state) {
            'expired' => $query->where('ends_at', '<=', $now),
            'inactive' => $query->where($notExpired)->where('is_active', false),
            'scheduled' => $query->where($notExpired)->where('is_active', true)->where('starts_at', '>', $now),
            default => $query->where($notExpired)->where('is_active', true)
                ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now)),
        };
    }

    /** @return array<string, mixed> */
    private function snapshot(PromoCode $promo): array
    {
        return [
            'code' => $promo->code,
            'description' => $promo->description,
            'discount_type' => $promo->discount_type?->value,
            'discount_value' => $promo->discount_value,
            'min_order_piastres' => $promo->min_order_piastres,
            'starts_at' => $promo->starts_at?->toIso8601String(),
            'ends_at' => $promo->ends_at?->toIso8601String(),
            'usage_limit' => $promo->usage_limit,
            'per_customer_limit' => $promo->per_customer_limit,
            'is_active' => $promo->is_active,
        ];
    }

    /** @return array<string, mixed> */
    private function present(PromoCode $promo, bool $detailed = false): array
    {
        $data = [
            'id' => $promo->id,
            ...$this->snapshot($promo),
            'state' => $promo->state(),
            'used_count' => (int) ($promo->used_count ?? $promo->countedOrders()->count()),
            'created_at' => $promo->created_at?->toIso8601String(),
            'updated_at' => $promo->updated_at?->toIso8601String(),
        ];

        if (! $detailed) {
            return $data;
        }

        // Every order placed with the code, by state, and the discount given on those still counted.
        $released = array_map(fn (OrderStatus $s) => $s->value, PromoCode::RELEASED_STATUSES);
        $orders = $promo->orders()->selectRaw('COUNT(*) AS total, SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) AS released,
            COALESCE(SUM(CASE WHEN status IN (?, ?) THEN 0 ELSE discount_piastres END), 0) AS discount', [...$released, ...$released])
            ->first();

        return [
            ...$data,
            'usage' => [
                'orders_total' => (int) $orders->total,
                'orders_released' => (int) $orders->released,
                'orders_counted' => (int) $orders->total - (int) $orders->released,
                'discount_given_piastres' => (int) $orders->discount,
            ],
        ];
    }
}
