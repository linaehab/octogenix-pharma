{{-- Plain-text part: not rendered as HTML, so values are output raw to avoid &amp; entities. --}}
New contact message

Name: {!! $contactMessage->fullName() !!}
Email: {!! $contactMessage->email !!}
Phone: {!! $contactMessage->phone ?? '-' !!}
Subject: {!! $contactMessage->subject?->value ?? '-' !!}
Site: {!! $contactMessage->site->value !!}
Language: {!! $contactMessage->locale !!}

{!! $contactMessage->message !!}

Open in dashboard: {!! $dashboardUrl !!}
