<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\PromoCode;
use App\Support\CsvExport;
use Illuminate\Validation\ValidationException;

/**
 * Checks a promo code against a cart and works out its discount. Used by the cart summary
 * (informational) and by checkout (inside the order transaction, with the code row locked so two
 * orders cannot both take the last use).
 *
 * Rules (approved for this phase):
 * - No stacking: the code applies only to lines without a direct product discount (or a
 *   compare-at "was" price). If no line qualifies, the code is refused.
 * - The minimum order amount is compared with the items total after product discounts.
 * - Percent codes take a whole percent of the eligible amount, rounded down to the piastre; fixed
 *   codes never take more than the eligible amount.
 * - Usage = orders placed with the code, except cancelled or expired ones. The per-customer limit
 *   counts the signed-in account's orders and any order placed with the same email address.
 */
class PromoCodeService
{
    public const REASONS = ['not_found', 'inactive', 'not_started', 'expired', 'min_order', 'not_eligible', 'usage_limit', 'customer_limit'];

    /**
     * @param  array<int, array{amount: int, eligible: bool}>  $lines  line key => line amount after product discounts
     * @return array{ok: true, promo: PromoCode, discount: int, allocation: array<int, int>}|array{ok: false, reason: string, promo: ?PromoCode}
     */
    public function evaluate(string $code, array $lines, ?Customer $customer, ?string $email, bool $lock = false): array
    {
        $query = PromoCode::query()->where('code', PromoCode::normalize($code));
        $promo = $lock ? $query->lockForUpdate()->first() : $query->first();

        if ($promo === null) {
            return ['ok' => false, 'reason' => 'not_found', 'promo' => null];
        }

        $reason = match ($promo->state()) {
            'expired' => 'expired',
            'inactive' => 'inactive',
            'scheduled' => 'not_started',
            default => null,
        };
        if ($reason !== null) {
            return ['ok' => false, 'reason' => $reason, 'promo' => $promo];
        }

        $total = array_sum(array_column($lines, 'amount'));
        if ($promo->min_order_piastres !== null && $total < $promo->min_order_piastres) {
            return ['ok' => false, 'reason' => 'min_order', 'promo' => $promo];
        }

        $eligible = array_filter($lines, fn (array $line) => $line['eligible'] && $line['amount'] > 0);
        if ($eligible === []) {
            return ['ok' => false, 'reason' => 'not_eligible', 'promo' => $promo];
        }

        if ($promo->usage_limit !== null && $promo->countedOrders()->count() >= $promo->usage_limit) {
            return ['ok' => false, 'reason' => 'usage_limit', 'promo' => $promo];
        }

        if ($promo->per_customer_limit !== null && ($customer !== null || $email !== null)) {
            $used = $promo->countedOrders()->where(function ($q) use ($customer, $email) {
                if ($customer !== null) {
                    $q->orWhere('customer_id', $customer->id);
                }
                if ($email !== null) {
                    $q->orWhere('customer_email', $email);
                }
            })->count();
            if ($used >= $promo->per_customer_limit) {
                return ['ok' => false, 'reason' => 'customer_limit', 'promo' => $promo];
            }
        }

        $amounts = array_map(fn (array $line) => $line['amount'], $eligible);
        $discount = $promo->discount_type->apply($promo->discount_value, array_sum($amounts));

        return ['ok' => true, 'promo' => $promo, 'discount' => $discount, 'allocation' => self::allocate($discount, $amounts)];
    }

    /**
     * Like evaluate(), but throws a validation error on the promo_code field when the code
     * cannot be used.
     *
     * @param  array<int, array{amount: int, eligible: bool}>  $lines
     * @return array{promo: PromoCode, discount: int, allocation: array<int, int>}
     *
     * @throws ValidationException
     */
    public function apply(string $code, array $lines, ?Customer $customer, ?string $email, bool $lock = false): array
    {
        $result = $this->evaluate($code, $lines, $customer, $email, $lock);

        if (! $result['ok']) {
            throw ValidationException::withMessages(['promo_code' => [self::message($result['reason'], $result['promo'])]]);
        }

        return ['promo' => $result['promo'], 'discount' => $result['discount'], 'allocation' => $result['allocation']];
    }

    /** English text for a refusal (the store shows its own translation of the reason). */
    public static function message(string $reason, ?PromoCode $promo): string
    {
        return match ($reason) {
            'not_found', 'inactive' => 'This promo code is not valid.',
            'not_started' => 'This promo code is not active yet.',
            'expired' => 'This promo code has expired.',
            'min_order' => 'This promo code needs an order of at least EGP '.CsvExport::egp((int) $promo?->min_order_piastres).'.',
            'not_eligible' => 'This promo code does not apply to products that are already discounted.',
            'usage_limit' => 'This promo code has reached its usage limit.',
            'customer_limit' => 'You have already used this promo code.',
            default => 'This promo code cannot be used.',
        };
    }

    /**
     * Splits a discount over lines in proportion to their amounts, in whole piastres, so the
     * parts add up exactly (largest remainder; ties go to the earlier line). No part exceeds its line.
     *
     * @param  array<int, int>  $amounts  line key => amount
     * @return array<int, int> line key => share
     */
    public static function allocate(int $discount, array $amounts): array
    {
        $total = array_sum($amounts);
        if ($discount <= 0 || $total <= 0) {
            return array_map(fn () => 0, $amounts);
        }

        $shares = [];
        $remainders = [];
        foreach ($amounts as $key => $amount) {
            $shares[$key] = intdiv($discount * $amount, $total);
            $remainders[$key] = ($discount * $amount) % $total;
        }

        $left = $discount - array_sum($shares);
        $order = array_keys($remainders);
        usort($order, fn ($a, $b) => $remainders[$b] <=> $remainders[$a] ?: array_search($a, array_keys($amounts)) <=> array_search($b, array_keys($amounts)));
        foreach ($order as $key) {
            if ($left <= 0) {
                break;
            }
            if ($shares[$key] < $amounts[$key]) {
                $shares[$key]++;
                $left--;
            }
        }

        return $shares;
    }
}
