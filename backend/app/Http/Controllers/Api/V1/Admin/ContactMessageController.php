<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AdminPermission;
use App\Enums\ContactMessageStatus;
use App\Enums\EmailNotificationStatus;
use App\Enums\Site;
use App\Exceptions\ContactMessageChangedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateContactMessageRequest;
use App\Http\Resources\ContactMessageResource;
use App\Jobs\SendContactMessageNotification;
use App\Models\ContactMessage;
use App\Services\AuditLogger;
use App\Support\ReportPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * index/show need messages.view; update/resend need messages.manage (enforced on the routes).
 *
 * The dashboard does not send email: "replied" records that someone answered the sender
 * (e.g. from their own mail program). Status changes and assignments are written to the audit
 * log without the message text or the sender's details.
 */
class ContactMessageController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::enum(ContactMessageStatus::class)],
            'site' => ['sometimes', Rule::enum(Site::class)],
            'email_notification_status' => ['sometimes', Rule::enum(EmailNotificationStatus::class)],
            'search' => ['sometimes', 'string', 'max:100'],
            // Calendar days in Egyptian time, inclusive.
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'sort' => ['sometimes', Rule::in(['newest', 'oldest'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $day = fn (string $date) => CarbonImmutable::createFromFormat('Y-m-d', $date, ReportPeriod::TIMEZONE);

        $messages = ContactMessage::query()
            ->with('assignedAdmin')
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['site'] ?? null, fn ($q, $site) => $q->where('site', $site))
            ->when($filters['email_notification_status'] ?? null,
                fn ($q, $status) => $q->where('email_notification_status', $status))
            ->when($filters['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', $day($v)->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<=', $day($v)->endOfDay()->utc()))
            ->when($filters['search'] ?? null, function ($q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn (Builder $q) => $q->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhereRaw("CONCAT(first_name, ' ', COALESCE(last_name, '')) LIKE ?", [$like])
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('subject', 'like', $like));
            })
            ->orderBy('id', ($filters['sort'] ?? 'newest') === 'oldest' ? 'asc' : 'desc')
            ->paginate($filters['per_page'] ?? 25);

        return ContactMessageResource::collection($messages->through(fn (ContactMessage $m) => (new ContactMessageResource($m))->summary()));
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

    /**
     * Status, notes and assignment. Optional expected_status: the status the admin saw; if it
     * changed since, nothing is saved (409 with the current message). Status changes must be
     * allowed transitions (ContactMessageStatus::canChangeTo).
     */
    public function update(UpdateContactMessageRequest $request, ContactMessage $contactMessage): ContactMessageResource
    {
        $data = $request->validated();
        $expected = $data['expected_status'] ?? null;
        unset($data['expected_status']);

        $message = DB::transaction(function () use ($contactMessage, $data, $expected) {
            $locked = ContactMessage::query()->lockForUpdate()->findOrFail($contactMessage->id);

            if ($expected !== null && $locked->status->value !== $expected) {
                throw new ContactMessageChangedException((new ContactMessageResource($locked->load('assignedAdmin')))->resolve());
            }

            if (isset($data['status'])) {
                $status = ContactMessageStatus::from($data['status']);
                if ($status === $locked->status) {
                    unset($data['status']);
                } elseif (! $locked->status->canChangeTo($status)) {
                    throw ValidationException::withMessages(['status' => $locked->status === ContactMessageStatus::New && $status === ContactMessageStatus::Replied
                        ? 'Open the message before marking it as replied.'
                        : 'This status change is not allowed.']);
                } else {
                    $data['read_at'] = $locked->read_at ?? now();
                    $data['resolved_at'] = $status === ContactMessageStatus::Resolved ? ($locked->resolved_at ?? now()) : null;
                }
            }

            $before = ['status' => $locked->status->value, 'assigned_admin_id' => $locked->assigned_admin_id, 'admin_notes' => $locked->admin_notes];
            $locked->update($data);
            $this->audit($locked, $before);

            return $locked;
        });

        return new ContactMessageResource($message->load('assignedAdmin'));
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

    /**
     * Audit entry without personal details: the status and assignee change as values; the notes
     * only as "changed" (they may contain the sender's details).
     *
     * @param  array{status: string, assigned_admin_id: ?int, admin_notes: ?string}  $before
     */
    private function audit(ContactMessage $message, array $before): void
    {
        $changes = AuditLogger::diff(
            ['status' => $before['status'], 'assigned_admin_id' => $before['assigned_admin_id']],
            ['status' => $message->status->value, 'assigned_admin_id' => $message->assigned_admin_id],
        );
        if ($before['admin_notes'] !== $message->admin_notes) {
            $changes['admin_notes'] = ['from' => 'not shown', 'to' => 'changed'];
        }
        if ($changes === []) {
            return;
        }

        $action = match (true) {
            array_keys($changes) === ['status'] && $message->status === ContactMessageStatus::Replied => 'messages.marked_replied',
            array_keys($changes) === ['status'] => 'messages.status_changed',
            default => 'messages.updated',
        };
        app(AuditLogger::class)->record($action, 'contact_message', $message->id, "Message #{$message->id}", $changes);
    }
}
