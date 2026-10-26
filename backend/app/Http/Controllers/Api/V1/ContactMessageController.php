<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Site;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContactMessageRequest;
use App\Jobs\SendContactMessageNotification;
use App\Models\ContactMessage;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Throwable;

class ContactMessageController extends Controller
{
    /**
     * Stores the message first, then queues the company notification. A failure to queue
     * or send the email is recorded on the message and never turns the submission into an error.
     */
    public function store(StoreContactMessageRequest $request): JsonResponse
    {
        $response = response()->json(['message' => 'Your message has been received.'], 201);

        if ($request->isHoneypotFilled()) {
            return $response;
        }

        $message = ContactMessage::create([
            ...$request->safe()->only(['first_name', 'last_name', 'email', 'subject', 'message']),
            'phone' => PhoneNumber::normalize($request->validated('phone')),
            'site' => $request->validated('site') ?? Site::Corporate->value,
            'locale' => $request->locale(),
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 252),
        ]);

        try {
            SendContactMessageNotification::dispatch($message);
        } catch (Throwable $e) {
            report($e);
        }

        return $response;
    }
}
