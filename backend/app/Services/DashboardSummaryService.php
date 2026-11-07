<?php

namespace App\Services;

use App\Enums\AdminPermission;
use App\Enums\ContactMessageStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Models\AdminUser;
use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Figures for the dashboard overview (GET /api/v1/admin/dashboard/summary). Each block is
 * included only when the admin holds the permission of the section it comes from.
 *
 * Money rules (all amounts are integer piastres of the order total: items minus discounts, plus
 * shipping and the COD fee):
 * - Paid revenue: orders whose payment_status is "paid", dated by paid_at. That status is set
 *   only when the card gateway confirms a payment or an admin records COD cash as collected, so
 *   unpaid COD orders are never counted. Refunds are not recorded by the system yet (decision
 *   D-05), so the figure is before refunds; paid orders that were later cancelled, expired or
 *   returned are reported beside it as possibly owed back, never silently subtracted or ignored.
 * - Delivered value: orders whose status is "delivered", dated by delivered_at, paid or not
 *   (COD included); the part not yet marked as collected is shown separately.
 */
class DashboardSummaryService
{
    /** Business days follow Egyptian time; the database stores UTC. */
    public const TIMEZONE = 'Africa/Cairo';

    /** Calendar days covered by each period, today included. */
    private const PERIODS = ['today' => 1, 'last_7_days' => 7, 'last_30_days' => 30];

    /** Order states after which money already collected may have to be returned. */
    private const REFUND_REVIEW_STATUSES = [OrderStatus::Cancelled, OrderStatus::Expired, OrderStatus::Returned];

    /** @return array<string, mixed> */
    public function summary(AdminUser $admin, ?CarbonImmutable $now = null): array
    {
        // Datetimes are stored as UTC wall time, so every bound is passed to the database in UTC.
        $now = ($now ?? CarbonImmutable::now())->utc();
        $periods = $this->periods($now);

        $data = [
            'generated_at' => $now->utc()->toIso8601String(),
            'timezone' => self::TIMEZONE,
            'currency' => 'EGP',
            'test_mode' => (bool) config('payments.test_mode'),
        ];

        if ($admin->can(AdminPermission::ViewOrders->value)) {
            $data['orders'] = $this->orders();
        }
        // Money figures are for the roles that handle payments, not for every order viewer.
        if ($admin->can(AdminPermission::ViewOrders->value) && $admin->can(AdminPermission::ManagePayments->value)) {
            $data['sales'] = $this->sales($periods, $now);
        }
        if ($admin->can(AdminPermission::ManageReviews->value)) {
            $data['reviews'] = ['pending' => ProductReview::query()->where('status', ReviewStatus::Pending)->count()];
        }
        if ($admin->can(AdminPermission::ViewMessages->value)) {
            $data['messages'] = ['new' => ContactMessage::query()->where('status', ContactMessageStatus::New)->count()];
        }
        if ($admin->can(AdminPermission::ManageInventory->value)) {
            $data['inventory'] = $this->inventory();
        }

        return $data;
    }

    /** @return array<string, CarbonImmutable> Start of each period (UTC). */
    private function periods(CarbonImmutable $now): array
    {
        $today = $now->setTimezone(self::TIMEZONE)->startOfDay();

        return array_map(fn (int $days) => $today->subDays($days - 1)->utc(), self::PERIODS);
    }

    /** @return array{total: int, by_status: array<string, int>} */
    private function orders(): array
    {
        $counts = Order::query()->toBase()->selectRaw('status, COUNT(*) AS aggregate')->groupBy('status')->pluck('aggregate', 'status');
        $byStatus = [];
        foreach (OrderStatus::cases() as $status) {
            $byStatus[$status->value] = (int) ($counts[$status->value] ?? 0);
        }

        return ['total' => array_sum($byStatus), 'by_status' => $byStatus];
    }

    /** @param array<string, CarbonImmutable> $periods */
    private function sales(array $periods, CarbonImmutable $now): array
    {
        $paid = [];
        $delivered = [];
        foreach ($periods as $key => $from) {
            $paidQuery = fn () => Order::query()->where('payment_status', OrderPaymentStatus::Paid)
                ->whereBetween('paid_at', [$from, $now]);
            $deliveredQuery = fn () => Order::query()->where('status', OrderStatus::Delivered)
                ->whereBetween('delivered_at', [$from, $now]);

            $paid[$key] = [
                'from' => $from->toIso8601String(),
                ...$this->totals($paidQuery()),
                'refund_review' => $this->totals($paidQuery()->whereIn('status', self::REFUND_REVIEW_STATUSES)),
            ];
            $delivered[$key] = [
                'from' => $from->toIso8601String(),
                ...$this->totals($deliveredQuery()),
                'not_collected' => $this->totals($deliveredQuery()->where('payment_status', OrderPaymentStatus::Unpaid)),
            ];
        }

        return [
            'paid_revenue' => $paid,
            'delivered_value' => $delivered,
            // Refunds cannot be recorded yet (D-05): paid revenue is before refunds.
            'refunds_recorded' => false,
        ];
    }

    /** @return array{amount_piastres: int, orders_count: int} */
    private function totals(Builder $query): array
    {
        $row = $query->toBase()->selectRaw('COALESCE(SUM(total_piastres), 0) AS amount, COUNT(*) AS orders_count')->first();

        return ['amount_piastres' => (int) $row->amount, 'orders_count' => (int) $row->orders_count];
    }

    /** @return array{low_stock: int, out_of_stock: int, without_threshold: int} */
    private function inventory(): array
    {
        return [
            'low_stock' => ProductVariant::query()->lowOnStock()->count(),
            'out_of_stock' => ProductVariant::query()->where('is_active', true)->where('stock_quantity', '<=', 0)->count(),
            // Without a threshold a product can never show as low on stock.
            'without_threshold' => ProductVariant::query()->where('is_active', true)->whereNull('low_stock_threshold')->count(),
        ];
    }
}
