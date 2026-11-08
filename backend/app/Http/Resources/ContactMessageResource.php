<?php

namespace App\Http\Resources;

use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** @mixin ContactMessage */
class ContactMessageResource extends JsonResource
{
    private bool $summary = false;

    /** List shape: a short preview instead of the full message and the internal notes. */
    public function summary(): static
    {
        $this->summary = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        if ($this->summary) {
            return [
                'id' => $this->id,
                'site' => $this->site->value,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'email' => $this->email,
                'subject' => $this->subject?->value,
                'preview' => Str::limit(preg_replace('/\s+/u', ' ', $this->message) ?? '', 140),
                'status' => $this->status->value,
                'assigned_admin' => $this->whenLoaded('assignedAdmin', fn () => $this->assignedAdmin ? [
                    'id' => $this->assignedAdmin->id,
                    'name' => $this->assignedAdmin->name,
                ] : null),
                'created_at' => $this->created_at?->toIso8601String(),
            ];
        }

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
