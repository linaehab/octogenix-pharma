<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderPaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerAddressResource;
use App\Models\Customer;
use App\Services\DashboardSummaryService;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only customer lookup for support and store staff. Routes require customers.view.
 * Deleted (anonymised) accounts are soft-deleted and never listed. Passwords, tokens and other
 * sign-in data are never returned.
 *
 * Order figures per customer come from the orders table, signed-in orders only (guest orders have
 * no customer): orders_count counts every order; paid_total sums orders whose payment_status is
 * "paid", before refunds (refunds are not recorded yet, decision D-05), like the overview's paid revenue.
 */
class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', 'in:active,inactive'],
            'registered_from' => ['sometimes', 'date_format:Y-m-d'],
            'registered_to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:registered_from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        // Dates are Cairo business days; the database stores UTC.
        $day = fn (string $date) => CarbonImmutable::createFromFormat('Y-m-d', $date, DashboardSummaryService::TIMEZONE);

        $customers = $this->withOrderFigures(Customer::query())
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $like = '%'.addcslashes(trim($search), '%_\\').'%';
                $q->where(fn (Builder $q) => $q->where('email', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", [$like]));
            })
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('is_active', $status === 'active'))
            ->when($filters['registered_from'] ?? null, fn (Builder $q, $v) => $q->where('created_at', '>=', $day($v)->startOfDay()->utc()))
            ->when($filters['registered_to'] ?? null, fn (Builder $q, $v) => $q->where('created_at', '<=', $day($v)->endOfDay()->utc()))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => $customers->getCollection()->map(fn (Customer $c) => $this->summary($c)),
            'meta' => ['current_page' => $customers->currentPage(), 'last_page' => $customers->lastPage(), 'total' => $customers->total()],
        ]);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer = $this->withOrderFigures(Customer::query())->findOrFail($customer->id);

        return response()->json(['data' => [
            ...$this->summary($customer),
            'addresses' => CustomerAddressResource::collection(
                $customer->addresses()->with('governorate')->orderByDesc('is_default')->orderBy('id')->get()
            ),
        ]]);
    }

    /** @param Builder<Customer> $query */
    private function withOrderFigures(Builder $query): Builder
    {
        return $query
            ->withCount('orders')
            ->withSum(['orders as paid_total_piastres' => fn (Builder $q) => $q->where('payment_status', OrderPaymentStatus::Paid)], 'total_piastres')
            ->withMax('orders as last_order_at', 'placed_at');
    }

    private function summary(Customer $customer): array
    {
        $lastOrder = $customer->getAttribute('last_order_at');

        return [
            ...$customer->only(['id', 'first_name', 'last_name', 'email', 'phone', 'locale', 'is_active']),
            'email_verified' => $customer->email_verified_at !== null,
            'last_login_at' => $customer->last_login_at?->toIso8601String(),
            'created_at' => $customer->created_at?->toIso8601String(),
            'orders_count' => (int) $customer->getAttribute('orders_count'),
            'paid_total' => Money::of((int) $customer->getAttribute('paid_total_piastres')),
            'last_order_at' => $lastOrder ? CarbonImmutable::parse($lastOrder, 'UTC')->toIso8601String() : null,
        ];
    }
}
