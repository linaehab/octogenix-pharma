<?php

namespace App\Notifications;

use App\Enums\PaymentMethod;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Order confirmation to the customer's email, in the order's language. Guests receive the private
 * link to their order (the plain token exists only in this email and the checkout response).
 * ShouldBeEncrypted: the queued payload (which carries that token) is encrypted in the jobs table.
 */
class OrderPlacedNotification extends Notification implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    private const TEXT = [
        'en' => [
            'subject' => 'We received your order :number',
            'greeting' => 'Thank you, :name.',
            'intro' => 'We received your order :number.',
            'cod' => 'You will pay :total in cash on delivery. Our team will contact you to confirm the order.',
            'card' => 'Total: :total.',
            'items' => 'Items:',
            'action' => 'View your order',
        ],
        'ar' => [
            'subject' => 'تم استلام طلبك :number',
            'greeting' => 'شكرًا لك يا :name.',
            'intro' => 'تم استلام طلبك رقم :number.',
            'cod' => 'ستدفع :total نقدًا عند الاستلام. سيتواصل معك فريقنا لتأكيد الطلب.',
            'card' => 'الإجمالي: :total.',
            'items' => 'المنتجات:',
            'action' => 'عرض طلبك',
        ],
    ];

    public function __construct(public readonly Order $order, public readonly ?string $guestToken = null) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order->loadMissing('items');
        $locale = $order->locale === 'ar' ? 'ar' : 'en';
        $t = fn (string $key) => strtr(self::TEXT[$locale][$key], [
            ':number' => $order->order_number,
            ':name' => $order->customer_first_name,
            ':total' => self::money($order->total_piastres),
        ]);

        $mail = (new MailMessage)
            ->subject($t('subject'))
            ->greeting($t('greeting'))
            ->line($t('intro'))
            ->line($t($order->payment_method === PaymentMethod::Cod ? 'cod' : 'card'))
            ->line($t('items'));

        foreach ($order->items as $item) {
            $mail->line(sprintf('%s (%s) × %d — %s',
                $locale === 'ar' ? $item->product_name_ar : $item->product_name_en,
                $locale === 'ar' ? $item->variant_name_ar : $item->variant_name_en,
                $item->quantity,
                self::money($item->line_total_piastres)));
        }

        return $mail->action($t('action'), $this->orderUrl());
    }

    public function orderUrl(): string
    {
        $base = rtrim((string) config('app.frontend_url'), '/').'/jovie/orders/'.$this->order->order_number;

        return $this->guestToken !== null ? $base.'?'.http_build_query(['token' => $this->guestToken]) : $base;
    }

    public static function money(int $piastres): string
    {
        return number_format($piastres / 100, 2).' EGP';
    }
}
