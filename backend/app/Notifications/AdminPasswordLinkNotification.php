<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Emails an admin a link to the Angular dashboard page that sets a new password.
 * Used both for "forgot password" and for inviting a newly created admin.
 */
class AdminPasswordLinkNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $token,
        public readonly bool $isInvitation = false,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $expires = (int) config('auth.passwords.admin_users.expire');

        return (new MailMessage)
            ->subject($this->isInvitation
                ? 'Your Octogenix dashboard account'
                : 'Reset your Octogenix dashboard password')
            ->line($this->isInvitation
                ? 'An administrator account has been created for you. Choose a password to activate it.'
                : 'We received a request to reset the password for your dashboard account.')
            ->action('Set password', $this->url($notifiable))
            ->line("This link expires in {$expires} minutes.")
            ->line($this->isInvitation
                ? 'After it expires, use "Forgot password" on the login page to get a new link.'
                : 'If you did not request this, no action is needed.');
    }

    public function url(object $notifiable): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/admin/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);
    }
}
