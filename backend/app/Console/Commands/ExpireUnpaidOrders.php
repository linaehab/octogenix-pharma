<?php

namespace App\Console\Commands;

use App\Enums\OrderActor;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Expires card orders whose payment window (store.pending_payment_ttl_minutes) has passed and
 * releases their reserved stock. Scheduled every minute (routes/console.php).
 */
class ExpireUnpaidOrders extends Command
{
    protected $signature = 'orders:expire-unpaid';

    protected $description = 'Expire unpaid card orders past their payment window and release their stock';

    public function handle(OrderStatusService $statuses): int
    {
        $expired = 0;

        Order::query()
            ->where('status', OrderStatus::PendingPayment)
            ->where('payment_expires_at', '<=', now())
            ->orderBy('id')
            ->each(function (Order $order) use ($statuses, &$expired) {
                try {
                    $statuses->transition($order, OrderStatus::Expired, OrderActor::System, note: 'Payment window expired');
                    $expired++;
                } catch (ValidationException) {
                    // Paid or changed in the meantime; the locked re-check refused the transition.
                }
            });

        $this->info("Expired {$expired} order(s).");

        return self::SUCCESS;
    }
}
