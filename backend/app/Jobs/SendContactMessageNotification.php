<?php

namespace App\Jobs;

use App\Enums\EmailNotificationStatus;
use App\Mail\ContactMessageReceived;
use App\Models\ContactMessage;
use App\Services\SettingsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Emails a stored contact message to the configured company recipients and records
 * the outcome on the message. The message itself is never modified otherwise.
 */
class SendContactMessageNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> seconds between attempts */
    public array $backoff = [60, 300];

    public function __construct(public ContactMessage $contactMessage)
    {
        $this->afterCommit();
    }

    public function handle(SettingsService $settings): void
    {
        $message = $this->contactMessage;
        $message->increment('email_notification_attempts');

        try {
            $recipients = $settings->get('contact.notification_recipients');

            if (empty($recipients)) {
                throw new RuntimeException('No contact notification recipients are configured.');
            }

            Mail::to($recipients)->send(new ContactMessageReceived($message));
        } catch (Throwable $e) {
            $message->forceFill([
                'email_notification_status' => EmailNotificationStatus::Failed,
                'email_last_error' => Str::limit($e->getMessage(), 497),
            ])->save();

            throw $e;
        }

        $message->forceFill([
            'email_notification_status' => EmailNotificationStatus::Sent,
            'email_notified_at' => now(),
            'email_last_error' => null,
        ])->save();
    }
}
