<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** A new private link to a guest order ("find my order"). The queued payload is encrypted. */
class OrderAccessLinkNotification extends Notification implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    private const TEXT = [
        'en' => ['subject' => 'Your link to order :number', 'line' => 'Use this link to view order :number.', 'action' => 'View your order'],
        'ar' => ['subject' => 'رابط طلبك :number', 'line' => 'استخدم هذا الرابط لعرض الطلب رقم :number.', 'action' => 'عرض طلبك'],
    ];

    public function __construct(public readonly Order $order, public readonly string $token) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $text = self::TEXT[$this->order->locale] ?? self::TEXT['en'];
        $t = fn (string $key) => str_replace(':number', $this->order->order_number, $text[$key]);

        return (new MailMessage)
            ->subject($t('subject'))
            ->line($t('line'))
            ->action($t('action'), (new OrderPlacedNotification($this->order, $this->token))->orderUrl());
    }
}
