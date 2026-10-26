<?php

namespace App\Notifications;

use App\Models\Customer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Email verification for store customers. The link opens the Angular page /jovie/verify-email,
 * which passes the parameters to the API's signed verification route. The signature is
 * relative (path + query only), so it stays valid behind the Angular proxy / reverse proxy.
 */
class CustomerVerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const EXPIRES_MINUTES = 60 * 24;

    private const TEXT = [
        'en' => [
            'subject' => 'Confirm your email address',
            'intro' => 'Welcome to Jovie. Please confirm your email address to finish setting up your account.',
            'action' => 'Confirm email',
            'ignore' => 'If you did not create an account, no action is needed.',
        ],
        'ar' => [
            'subject' => 'تأكيد بريدك الإلكتروني',
            'intro' => 'مرحبًا بك في جوفي. يرجى تأكيد بريدك الإلكتروني لإكمال إعداد حسابك.',
            'action' => 'تأكيد البريد الإلكتروني',
            'ignore' => 'إذا لم تقم بإنشاء حساب، فلا حاجة لاتخاذ أي إجراء.',
        ],
    ];

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(Customer $notifiable): MailMessage
    {
        $text = self::TEXT[$notifiable->locale] ?? self::TEXT['en'];

        return (new MailMessage)
            ->subject($text['subject'])
            ->line($text['intro'])
            ->action($text['action'], $this->url($notifiable))
            ->line($text['ignore']);
    }

    /** The Angular page URL carrying everything the API route needs. */
    public function url(Customer $notifiable): string
    {
        $signed = URL::temporarySignedRoute(
            'api.v1.customer.verification.verify',
            now()->addMinutes(self::EXPIRES_MINUTES),
            ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification())],
            absolute: false,
        );

        parse_str((string) parse_url($signed, PHP_URL_QUERY), $query);

        return rtrim((string) config('app.frontend_url'), '/').'/jovie/verify-email?'.http_build_query([
            'id' => $notifiable->getKey(),
            'hash' => sha1($notifiable->getEmailForVerification()),
            'expires' => $query['expires'],
            'signature' => $query['signature'],
        ]);
    }
}
