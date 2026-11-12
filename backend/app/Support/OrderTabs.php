<?php

namespace App\Support;

use App\Enums\OrderStatus;

/**
 * The status tabs of the dashboard orders list: display groups over the real order statuses.
 * No status is added for a tab; Cancelled, Returned and Expired stay separate statuses inside
 * the "closed" tab.
 */
final class OrderTabs
{
    /** @var array<string, list<OrderStatus>> */
    public const TABS = [
        'new' => [OrderStatus::PendingConfirmation, OrderStatus::PendingPayment],
        'in_progress' => [OrderStatus::Confirmed, OrderStatus::Processing],
        'ready' => [OrderStatus::Shipped],
        'delivered' => [OrderStatus::Delivered],
        'closed' => [OrderStatus::Cancelled, OrderStatus::Returned, OrderStatus::Expired],
    ];

    /** @return list<string> */
    public static function statuses(string $tab): array
    {
        return array_map(fn (OrderStatus $s) => $s->value, self::TABS[$tab] ?? []);
    }

    /**
     * Every tab with its statuses and how many orders it holds, from per-status counts.
     *
     * @param  array<string, int>  $countsByStatus
     * @return list<array{key: string, statuses: list<string>, count: int}>
     */
    public static function summary(array $countsByStatus): array
    {
        $tabs = [['key' => 'all', 'statuses' => [], 'count' => (int) array_sum($countsByStatus)]];
        foreach (array_keys(self::TABS) as $key) {
            $statuses = self::statuses($key);
            $tabs[] = [
                'key' => $key,
                'statuses' => $statuses,
                'count' => (int) array_sum(array_intersect_key($countsByStatus, array_flip($statuses))),
            ];
        }

        return $tabs;
    }
}
