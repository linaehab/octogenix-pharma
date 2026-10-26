<?php

namespace App\Http\Resources;

use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ContactMessage */
class ContactMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'site' => $this->site->value,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'subject' => $this->subject?->value,
            'message' => $this->message,
            'locale' => $this->locale,
            'status' => $this->status->value,
            'assigned_admin' => $this->whenLoaded('assignedAdmin', fn () => $this->assignedAdmin ? [
                'id' => $this->assignedAdmin->id,
                'name' => $this->assignedAdmin->name,
            ] : null),
            'admin_notes' => $this->admin_notes,
            'read_at' => $this->read_at?->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'email_notification' => [
                'status' => $this->email_notification_status->value,
                'attempts' => $this->email_notification_attempts,
                'notified_at' => $this->email_notified_at?->toIso8601String(),
                'last_error' => $this->email_last_error,
            ],
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
