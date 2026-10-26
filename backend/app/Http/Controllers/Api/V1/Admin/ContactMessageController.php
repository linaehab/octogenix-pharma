<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AdminPermission;
use App\Enums\ContactMessageStatus;
use App\Enums\EmailNotificationStatus;
use App\Enums\Site;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateContactMessageRequest;
use App\Http\Resources\ContactMessageResource;
use App\Jobs\SendContactMessageNotification;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Throwable;

/** index/show need messages.view; update/resend need messages.manage (enforced on the routes). */
class ContactMessageController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::enum(ContactMessageStatus::class)],
            'site' => ['sometimes', Rule::enum(Site::class)],
            'email_notification_status' => ['sometimes', Rule::enum(EmailNotificationStatus::class)],
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $messages = ContactMessage::query()
            ->with('assignedAdmin')
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['site'] ?? null, fn ($q, $site) => $q->where('site', $site))
            ->when($filters['email_notification_status'] ?? null,
                fn ($q, $status) => $q->where('email_notification_status', $status))
            ->when($filters['search'] ?? null, function ($q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn ($q) => $q->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like));
            })
            ->latest('id')
            ->paginate($filters['per_page'] ?? 25);

        return ContactMessageResource::collection($messages);
    }

    /** Opening a new message marks it read, but only for admins allowed to manage messages. */
    public function show(Request $request, ContactMessage $contactMessage): ContactMessageResource
    {
        if ($contactMessage->status === ContactMessageStatus::New
            && $request->user('admin')->hasPermission(AdminPermission::ManageMessages)) {
            $contactMessage->update(['status' => ContactMessageStatus::Read, 'read_at' => now()]);
        }

        return new ContactMessageResource($contactMessage->load('assignedAdmin'));
    }

    public function update(UpdateContactMessageRequest $request, ContactMessage $contactMessage): ContactMessageResource
    {
        $data = $request->validated();

        if (isset($data['status'])) {
            $status = ContactMessageStatus::from($data['status']);
            $data['read_at'] = $contactMessage->read_at ?? ($status === ContactMessageStatus::New ? null : now());
            $data['resolved_at'] = $status === ContactMessageStatus::Resolved
                ? ($contactMessage->resolved_at ?? now())
                : null;
        }

        $contactMessage->update($data);

        return new ContactMessageResource($contactMessage->load('assignedAdmin'));
    }

    /** Queues the company notification again, e.g. after fixing the recipients or mail settings. */
    public function resendNotification(ContactMessage $contactMessage): JsonResponse
    {
        $contactMessage->forceFill(['email_notification_status' => EmailNotificationStatus::Pending])->save();

        try {
            SendContactMessageNotification::dispatch($contactMessage);
        } catch (Throwable $e) {
            // The outcome is recorded on the message by the job; the dashboard shows it.
            report($e);
        }

        return response()->json(['message' => 'The notification has been queued.'], 202);
    }
}
