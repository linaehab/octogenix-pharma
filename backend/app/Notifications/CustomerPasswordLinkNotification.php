<?php

namespace App\Notifications;

use App\Models\Customer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Password reset link to the Jovie store's Angular page, in the customer's language. */
class CustomerPasswordLinkNotification extends Notification implements ShouldQueue
{
    use Queueable;

    private const TEXT = [
        'en' => [
            'subject' => 'Reset your Jovie account password',
            'intro' => 'We received a request to reset the password for your Jovie account.',
            'action' => 'Reset password',
            'expires' => 'This link expires in :minutes minutes.',
            'ignore' => 'If you did not request this, no action is needed.',
        ],
        'ar' => [
            'subject' => 'إعادة تعيين كلمة مرور حسابك في جوفي',
            'intro' => 'تلقّينا طلبًا لإعادة تعيين كلمة مرور حسابك في جوفي.',
            'action' => 'إعادة تعيين كلمة المرور',
            'expires' => 'تنتهي صلاحية هذا الرابط خلال :minutes دقيقة.',
            'ignore' => 'إذا لم تطلب ذلك، فلا حاجة لاتخاذ أي إجراء.',
        ],
    ];

    public function __construct(public readonly string $token) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(Customer $notifiable): MailMessage
    {
        $text = self::TEXT[$notifiable->locale] ?? self::TEXT['en'];
        $minutes = (int) config('auth.passwords.customers.expire');

        return (new MailMessage)
            ->subject($text['subject'])
            ->line($text['intro'])
            ->action($text['action'], $this->url($notifiable))
            ->line(str_replace(':minutes', (string) $minutes, $text['expires']))
            ->line($text['ignore']);
    }

    public function url(Customer $notifiable): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/jovie/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);
    }
}
