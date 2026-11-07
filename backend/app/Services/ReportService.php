<?php

namespace App\Services;

use App\Enums\InventoryReason;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Support\ReportPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

/**
 * Read-only reports (Phase 7). Nothing here writes to the database. All money is integer piastres.
 *
 * Definitions (the same words are used on the dashboard and in the exports):
 * - Order value: order totals (items - discounts + shipping + COD fee, as saved at checkout) of orders
 *   PLACED in the period (orders.placed_at), whatever happened to them later. It is not revenue.
 * - Collected payments: successful payment records (payments.status = succeeded) PAID in the period
 *   (payments.paid_at): card payments confirmed by the gateway and COD cash recorded by an admin.
 *   Test-mode (simulated) payments are reported separately and never counted as collected. Failed,
 *   cancelled, expired and pending attempts are never counted. Each successful record is counted
 *   once; an order with two successful payments is flagged as a possible duplicate.
 * - Outstanding: orders placed in the period that are still going ahead (not cancelled, expired or
 *   returned) and not paid yet. A payment always covers the whole order, so this is exact.
 * - Refunds are not recorded (decision D-05): collected money from orders later cancelled, expired or
 *   returned is shown as "may need a refund", never subtracted and never assumed refunded.
 */
class ReportService
{
    /** Orders that did not go ahead (no goods kept by the customer). */
    public const NOT_GOING_AHEAD = [OrderStatus::Cancelled, OrderStatus::Expired, OrderStatus::Returned];

    /** Orders whose items were never sold (released back to stock before shipping). */
    public const NOT_SOLD = [OrderStatus::Cancelled, OrderStatus::Expired];

    // --- Sales & revenue ------------------------------------------------------------------------

    /** @return array<string, mixed> */
    public function sales(ReportPeriod $period): array
    {
        $placed = fn () => Order::query()->where('placed_at', '>=', $period->start())->where('placed_at', '<', $period->end());

        $byStatus = array_fill_keys(array_map(fn (OrderStatus $s) => $s->value, OrderStatus::cases()), ['count' => 0, 'value_piastres' => 0]);
        foreach ($placed()->selectRaw('status, COUNT(*) AS c, COALESCE(SUM(total_piastres), 0) AS v')->groupBy('status')->get() as $row) {
            $byStatus[$row->getRawOriginal('status')] = ['count' => (int) $row->c, 'value_piastres' => (int) $row->v];
        }

        $notGoingAhead = array_map(fn (OrderStatus $s) => $s->value, self::NOT_GOING_AHEAD);
        $outstanding = fn () => $placed()->where('payment_status', OrderPaymentStatus::Unpaid)->whereNotIn('status', $notGoingAhead);

        $collected = $this->succeededPayments($period);
        $byMethod = [];
        foreach (PaymentMethod::cases() as $method) {
            $orders = $this->totals($placed()->where('payment_method', $method));
            $money = $this->paymentTotals((clone $collected)->where('payments.is_test', false)->where('payments.method', $method->value));
            $byMethod[] = [
                'method' => $method->value,
                'orders_count' => $orders['count'],
                'order_value_piastres' => $orders['value_piastres'],
                'collected_count' => $money['count'],
                'collected_piastres' => $money['amount_piastres'],
            ];
        }

        return [
            'period' => $period->describe(),
            'currency' => 'EGP',
            'orders' => [
                'placed' => $this->totals($placed()),
                'paid' => $this->totals($placed()->where('payment_status', OrderPaymentStatus::Paid)),
                'by_status' => $byStatus,
            ],
            'payments' => [
                'collected' => $this->paymentTotals((clone $collected)->where('payments.is_test', false)),
                'test' => $this->paymentTotals((clone $collected)->where('payments.is_test', true)),
                'refund_review' => $this->paymentTotals((clone $collected)->where('payments.is_test', false)->whereIn('orders.status', $notGoingAhead)),
                'possible_duplicates' => $this->duplicates($period),
            ],
            'outstanding' => [
                'total' => $this->totals($outstanding()),
                'card_awaiting_payment' => $this->totals($outstanding()->where('payment_method', PaymentMethod::Card)),
                'cod_not_collected' => $this->totals($outstanding()->where('payment_method', PaymentMethod::Cod)),
                'cod_delivered_not_collected' => $this->totals($outstanding()->where('payment_method', PaymentMethod::Cod)->where('status', OrderStatus::Delivered)),
            ],
            'by_method' => $byMethod,
            'trend' => $this->trend($period),
        ];
    }

    /** @return list<array{period: string, orders_count: int, order_value_piastres: int, collected_piastres: int}> */
    public function trend(ReportPeriod $period): array
    {
        $buckets = [];
        foreach ($period->bucketKeys() as $key) {
            $buckets[$key] = ['period' => $key, 'orders_count' => 0, 'order_value_piastres' => 0, 'collected_piastres' => 0];
        }

        DB::table('orders')->select(['id', 'placed_at', 'total_piastres'])
            ->where('placed_at', '>=', $period->start())->where('placed_at', '<', $period->end())
            ->lazyById(500)->each(function (object $order) use (&$buckets, $period) {
                $key = $period->bucketOf($order->placed_at);
                $buckets[$key]['orders_count']++;
                $buckets[$key]['order_value_piastres'] += (int) $order->total_piastres;
            });

        $this->succeededPayments($period)->where('payments.is_test', false)
            ->select(['payments.id', 'payments.paid_at', 'payments.amount_piastres'])
            ->lazyById(500, 'payments.id', 'id')->each(function (object $payment) use (&$buckets, $period) {
                $buckets[$period->bucketOf($payment->paid_at)]['collected_piastres'] += (int) $payment->amount_piastres;
            });

        return array_values($buckets);
    }

    // --- Orders ---------------------------------------------------------------------------------

    /**
     * Orders placed in the period, with the report filters. Amounts are the saved order totals.
     *
     * @param  array{status?: string, payment_status?: string, payment_method?: string, governorate_id?: int|string}  $filters
     * @return Builder<Order>
     */
    public function orders(ReportPeriod $period, array $filters): Builder
    {
        return Order::query()
            ->where('placed_at', '>=', $period->start())->where('placed_at', '<', $period->end())
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('status', $v))
            ->when($filters['payment_status'] ?? null, fn (Builder $q, $v) => $q->where('payment_status', $v))
            ->when($filters['payment_method'] ?? null, fn (Builder $q, $v) => $q->where('payment_method', $v))
            ->when($filters['governorate_id'] ?? null, fn (Builder $q, $v) => $q->where('shipping_governorate_id', $v));
    }

    /** @return array{count: int, value_piastres: int, paid: array{count: int, value_piastres: int}, outstanding: array{count: int, value_piastres: int}} */
    public function ordersSummary(Builder $orders): array
    {
        $notGoingAhead = array_map(fn (OrderStatus $s) => $s->value, self::NOT_GOING_AHEAD);

        return [
            ...$this->totals(clone $orders),
            'paid' => $this->totals((clone $orders)->where('payment_status', OrderPaymentStatus::Paid)),
            'outstanding' => $this->totals((clone $orders)->where('payment_status', OrderPaymentStatus::Unpaid)->whereNotIn('status', $notGoingAhead)),
        ];
    }

    // --- Products -------------------------------------------------------------------------------

    /**
     * Sales per product from the order item snapshots (price and quantity as ordered, never today's
     * price). Every product still on sale is listed, with zeros if it sold nothing.
     *
     * @return list<array<string, mixed>>
     */
    public function products(ReportPeriod $period): array
    {
        $notSold = array_map(fn (OrderStatus $s) => "'".$s->value."'", self::NOT_SOLD);
        $notSoldList = implode(',', $notSold);
        $returned = "'".OrderStatus::Returned->value."'";

        $sales = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.placed_at', '>=', $period->start())->where('orders.placed_at', '<', $period->end())
            ->groupBy('order_items.product_variant_id')
            ->selectRaw("order_items.product_variant_id AS variant_id,
                SUM(CASE WHEN orders.status NOT IN ({$notSoldList}) THEN order_items.quantity ELSE 0 END) AS units,
                COUNT(DISTINCT CASE WHEN orders.status NOT IN ({$notSoldList}) THEN orders.id END) AS orders_count,
                SUM(CASE WHEN orders.status NOT IN ({$notSoldList}) THEN order_items.line_total_piastres ELSE 0 END) AS gross,
                SUM(CASE WHEN orders.status = {$returned} THEN order_items.quantity ELSE 0 END) AS returned_units,
                SUM(CASE WHEN orders.status IN ({$notSoldList}) THEN order_items.quantity ELSE 0 END) AS cancelled_units")
            ->get()->keyBy('variant_id');

        $variants = ProductVariant::withTrashed()
            ->with(['product' => fn ($q) => $q->withTrashed()])
            ->where(fn (Builder $q) => $q->whereIn('id', $sales->keys())->orWhere(fn (Builder $q) => $q->whereNull('deleted_at')->where('is_default', true)->whereHas('product')))
            ->get();

        $rows = $variants->map(function (ProductVariant $v) use ($sales) {
            $s = $sales->get($v->id);

            return [
                'variant_id' => $v->id,
                'product_id' => $v->product_id,
                'sku' => $v->sku,
                'name_en' => $v->product?->name_en ?? $v->name_en,
                'name_ar' => $v->product?->name_ar ?? $v->name_ar,
                'archived' => $v->product === null || $v->product->trashed() || $v->trashed(),
                'units_ordered' => (int) ($s->units ?? 0),
                'orders_count' => (int) ($s->orders_count ?? 0),
                'gross_value_piastres' => (int) ($s->gross ?? 0),
                'returned_units' => (int) ($s->returned_units ?? 0),
                'cancelled_units' => (int) ($s->cancelled_units ?? 0),
                'current_price_piastres' => $v->price_piastres,
                'current_stock' => $v->stock_quantity,
            ];
        })->sortBy([['units_ordered', 'desc'], ['gross_value_piastres', 'desc'], ['name_en', 'asc']]);

        return $rows->values()->all();
    }

    // --- Inventory ------------------------------------------------------------------------------

    /**
     * Current stock of every tracked product (as on the Inventory page) and its movements in the
     * period. Opening/closing stock come from the stock_after of the last movement before the period
     * start/end; they are given only when the movement history explains today's stock (the last
     * movements add up to the current stock and the last one left it), otherwise null.
     *
     * @return array{rows: list<array<string, mixed>>, reasons: array<string, array{increase: int, decrease: int, count: int}>, summary: array<string, int>}
     */
    public function inventory(ReportPeriod $period): array
    {
        $variants = ProductVariant::query()->where('is_default', true)->whereHas('product')->with('product')
            ->orderBy('id')->get();
        $ids = $variants->pluck('id');

        $inPeriod = fn () => InventoryMovement::query()->whereIn('product_variant_id', $ids)
            ->where('created_at', '>=', $period->start())->where('created_at', '<', $period->end());

        $moves = $inPeriod()->groupBy('product_variant_id')
            ->selectRaw('product_variant_id,
                SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END) AS increase,
                SUM(CASE WHEN quantity_change < 0 THEN -quantity_change ELSE 0 END) AS decrease,
                COUNT(*) AS movements')
            ->get()->keyBy('product_variant_id');

        $reasons = array_fill_keys(array_map(fn (InventoryReason $r) => $r->value, InventoryReason::cases()), ['increase' => 0, 'decrease' => 0, 'count' => 0]);
        foreach ($inPeriod()->groupBy('reason')->selectRaw('reason,
                SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END) AS increase,
                SUM(CASE WHEN quantity_change < 0 THEN -quantity_change ELSE 0 END) AS decrease,
                COUNT(*) AS movements')->get() as $row) {
            $reasons[$row->getRawOriginal('reason')] = ['increase' => (int) $row->increase, 'decrease' => (int) $row->decrease, 'count' => (int) $row->movements];
        }

        $stockAt = fn (int $variantId, $before) => InventoryMovement::query()->where('product_variant_id', $variantId)
            ->where('created_at', '<', $before)->orderByDesc('created_at')->orderByDesc('id')->value('stock_after');

        $rows = $variants->map(function (ProductVariant $v) use ($moves, $stockAt, $period) {
            $m = $moves->get($v->id);
            // The history explains today's stock only if it starts from zero (all movements add up to
            // the current stock) and the last movement left exactly the current stock.
            $latest = $stockAt($v->id, now()->addSecond());
            $total = (int) InventoryMovement::query()->where('product_variant_id', $v->id)->sum('quantity_change');
            $reliable = $latest !== null && (int) $latest === $v->stock_quantity && $total === $v->stock_quantity;

            return [
                'variant_id' => $v->id,
                'sku' => $v->sku,
                'name_en' => $v->product->name_en,
                'name_ar' => $v->product->name_ar,
                'is_active' => $v->product->is_active && $v->is_active,
                'current_stock' => $v->stock_quantity,
                'low_stock_threshold' => $v->low_stock_threshold,
                'stock_status' => $v->stockStatus(),
                'increase' => (int) ($m->increase ?? 0),
                'decrease' => (int) ($m->decrease ?? 0),
                'movements' => (int) ($m->movements ?? 0),
                'history_complete' => $reliable,
                'opening_stock' => $reliable ? (int) ($stockAt($v->id, $period->start()) ?? 0) : null,
                'closing_stock' => $reliable ? (int) ($stockAt($v->id, $period->end()) ?? 0) : null,
            ];
        })->values()->all();

        $statuses = array_count_values(array_column($rows, 'stock_status'));

        return [
            'rows' => $rows,
            'reasons' => $reasons,
            'summary' => [
                'tracked' => count($rows),
                'in_stock' => $statuses[ProductVariant::STOCK_IN] ?? 0,
                'low_stock' => $statuses[ProductVariant::STOCK_LOW] ?? 0,
                'out_of_stock' => $statuses[ProductVariant::STOCK_OUT] ?? 0,
                'increase' => array_sum(array_column($rows, 'increase')),
                'decrease' => array_sum(array_column($rows, 'decrease')),
            ],
        ];
    }

    // --- Helpers --------------------------------------------------------------------------------

    /** Successful payments paid in the period, joined to their order. */
    private function succeededPayments(ReportPeriod $period): QueryBuilder
    {
        return DB::table('payments')
            ->join('orders', 'orders.id', '=', 'payments.order_id')
            ->where('payments.status', PaymentStatus::Succeeded->value)
            ->where('payments.paid_at', '>=', $period->start())->where('payments.paid_at', '<', $period->end());
    }

    /** Orders with more than one real successful payment, one of them paid in the period. */
    private function duplicates(ReportPeriod $period): array
    {
        $orderIds = $this->succeededPayments($period)->where('payments.is_test', false)->distinct()->pluck('payments.order_id');
        $rows = DB::table('payments')->join('orders', 'orders.id', '=', 'payments.order_id')
            ->whereIn('payments.order_id', $orderIds)
            ->where('payments.status', PaymentStatus::Succeeded->value)->where('payments.is_test', false)
            ->groupBy('payments.order_id', 'orders.total_piastres')
            ->havingRaw('COUNT(*) > 1')
            ->selectRaw('payments.order_id, orders.total_piastres, SUM(payments.amount_piastres) AS received')
            ->get();

        return [
            'orders_count' => $rows->count(),
            'extra_piastres' => (int) $rows->sum(fn ($r) => max(0, (int) $r->received - (int) $r->total_piastres)),
        ];
    }

    /** @return array{count: int, value_piastres: int} */
    private function totals(Builder $orders): array
    {
        $row = $orders->toBase()->selectRaw('COUNT(*) AS c, COALESCE(SUM(total_piastres), 0) AS v')->first();

        return ['count' => (int) $row->c, 'value_piastres' => (int) $row->v];
    }

    /** @return array{count: int, amount_piastres: int} */
    private function paymentTotals(QueryBuilder $payments): array
    {
        $row = $payments->selectRaw('COUNT(*) AS c, COALESCE(SUM(payments.amount_piastres), 0) AS v')->first();

        return ['count' => (int) $row->c, 'amount_piastres' => (int) $row->v];
    }
}
