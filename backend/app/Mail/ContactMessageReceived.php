<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Company notification for a new contact form message. Reply goes straight to the visitor. */
class ContactMessageReceived extends Mailable
{
    public function __construct(public ContactMessage $contactMessage) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [new Address($this->contactMessage->email, $this->contactMessage->fullName())],
            subject: 'New contact message #'.$this->contactMessage->id.' from '.$this->contactMessage->fullName(),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.contact-message',
            text: 'mail.contact-message-text',
            with: [
                'dashboardUrl' => rtrim((string) config('app.frontend_url'), '/')
                    .'/admin/messages/'.$this->contactMessage->id,
            ],
        );
    }
}
