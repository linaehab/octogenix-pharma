<?php

namespace Tests\Feature\Contact;

use App\Enums\EmailNotificationStatus;
use App\Mail\ContactMessageReceived;
use App\Models\ContactMessage;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\TestCase;

class ContactMessageSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/contact-messages';

    /** A submission shaped like the Angular contact form (after camelCase → snake_case mapping). */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Mona',
            'last_name' => 'Hassan',
            'email' => 'Mona@Example.com',
            'phone' => '010 1234 5678',
            'subject' => 'import-export',
            'message' => 'We would like to discuss distribution of our products in Egypt.',
        ], $overrides);
    }

    private function configureRecipients(array $recipients = ['team@example.com']): void
    {
        app(SettingsService::class)->update(['contact.notification_recipients' => $recipients]);
    }

    public function test_message_is_stored_and_the_company_is_notified(): void
    {
        Mail::fake();
        $this->configureRecipients(['team@example.com', 'sales@example.com']);

        $this->withHeader('Accept-Language', 'ar')->postJson(self::URL, $this->payload())
            ->assertCreated()
            ->assertExactJson(['message' => 'Your message has been received.']);

        $message = ContactMessage::sole();
        $this->assertSame('mona@example.com', $message->email);
        $this->assertSame('+201012345678', $message->phone);
        $this->assertSame('import-export', $message->subject->value);
        $this->assertSame('corporate', $message->site->value);
        $this->assertSame('ar', $message->locale);
        $this->assertSame('new', $message->status->value);
        $this->assertSame(EmailNotificationStatus::Sent, $message->email_notification_status);
        $this->assertSame(1, $message->email_notification_attempts);
        $this->assertNotNull($message->email_notified_at);

        Mail::assertSent(ContactMessageReceived::class, fn (ContactMessageReceived $mail) => $mail->hasTo('team@example.com')
            && $mail->hasTo('sales@example.com')
            && $mail->hasReplyTo('mona@example.com'));
    }

    public function test_optional_fields_may_be_empty_strings_as_sent_by_the_form(): void
    {
        Mail::fake();

        $this->postJson(self::URL, $this->payload(['last_name' => '', 'phone' => '', 'subject' => '']))
            ->assertCreated();

        $message = ContactMessage::sole();
        $this->assertNull($message->last_name);
        $this->assertNull($message->phone);
        $this->assertNull($message->subject);
    }

    public function test_message_is_kept_when_no_recipients_are_configured(): void
    {
        Mail::fake();

        $this->postJson(self::URL, $this->payload())->assertCreated();

        $message = ContactMessage::sole();
        $this->assertSame(EmailNotificationStatus::Failed, $message->email_notification_status);
        $this->assertSame('No contact notification recipients are configured.', $message->email_last_error);
        Mail::assertNothingSent();
    }

    public function test_message_is_kept_when_the_mail_server_fails(): void
    {
        $this->configureRecipients();
        Mail::shouldReceive('to')->andThrow(new RuntimeException('SMTP connection refused'));

        $this->postJson(self::URL, $this->payload())->assertCreated();

        $message = ContactMessage::sole();
        $this->assertSame(EmailNotificationStatus::Failed, $message->email_notification_status);
        $this->assertSame(1, $message->email_notification_attempts);
        $this->assertSame('SMTP connection refused', $message->email_last_error);
    }

    public function test_validation_matches_the_form_requirements(): void
    {
        $this->postJson(self::URL, [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'email', 'message'])
            ->assertJsonMissingValidationErrors(['last_name', 'phone', 'subject']);

        $this->postJson(self::URL, $this->payload([
            'email' => 'not-an-email',
            'phone' => '12',
            'subject' => 'import_export',
            'message' => str_repeat('a', 5001),
            'site' => 'unknown',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['email', 'phone', 'subject', 'message', 'site']);

        $this->assertSame(0, ContactMessage::count());
    }

    public function test_jovie_site_messages_are_tagged(): void
    {
        Mail::fake();

        $this->postJson(self::URL, $this->payload(['site' => 'jovie', 'locale' => 'en']))->assertCreated();

        $this->assertSame('jovie', ContactMessage::sole()->site->value);
    }

    public function test_honeypot_submissions_look_successful_but_are_not_stored(): void
    {
        Mail::fake();

        $this->postJson(self::URL, $this->payload(['website' => 'http://spam.example']))->assertCreated();

        $this->assertSame(0, ContactMessage::count());
        Mail::assertNothingSent();
    }

    public function test_submissions_are_rate_limited_per_ip(): void
    {
        Mail::fake();

        for ($i = 0; $i < 3; $i++) {
            $this->postJson(self::URL, $this->payload())->assertCreated();
        }

        $this->postJson(self::URL, $this->payload())->assertTooManyRequests();
        $this->assertSame(3, ContactMessage::count());
    }
}
