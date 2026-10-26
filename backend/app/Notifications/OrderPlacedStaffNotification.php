<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** New-order alert for the recipients in the orders.notification_recipients setting. */
class OrderPlacedStaffNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Order $order) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order;

        return (new MailMessage)
            ->subject("New order {$order->order_number} ({$order->payment_method->value})")
            ->line("Customer: {$order->customer_first_name} {$order->customer_last_name}, {$order->customer_phone}")
            ->line("Delivery: {$order->shipping_governorate_name_en}, {$order->shipping_city}")
            ->line('Total: '.OrderPlacedNotification::money($order->total_piastres))
            ->action('Open in dashboard', rtrim((string) config('app.frontend_url'), '/').'/admin/orders/'.$order->order_number);
    }
}
