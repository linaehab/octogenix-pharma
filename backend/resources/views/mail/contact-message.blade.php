{{-- Visitor input is only ever output with escaped {{ }} echoes. --}}
<!DOCTYPE html>
<html lang="en">
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
    <h2 style="margin: 0 0 16px;">New contact message</h2>
    <table cellpadding="6" style="border-collapse: collapse;">
        <tr><td><strong>Name</strong></td><td>{{ $contactMessage->fullName() }}</td></tr>
        <tr><td><strong>Email</strong></td><td>{{ $contactMessage->email }}</td></tr>
        <tr><td><strong>Phone</strong></td><td>{{ $contactMessage->phone ?? '—' }}</td></tr>
        <tr><td><strong>Subject</strong></td><td>{{ $contactMessage->subject?->value ?? '—' }}</td></tr>
        <tr><td><strong>Site</strong></td><td>{{ $contactMessage->site->value }}</td></tr>
        <tr><td><strong>Language</strong></td><td>{{ $contactMessage->locale }}</td></tr>
    </table>
    <p style="white-space: pre-wrap; border-left: 3px solid #d1d5db; padding-left: 12px;">{{ $contactMessage->message }}</p>
    <p><a href="{{ $dashboardUrl }}">Open in dashboard</a></p>
</body>
</html>
