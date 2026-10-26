<?php

namespace App\Models;

use App\Enums\ContactMessageStatus;
use App\Enums\ContactSubject;
use App\Enums\EmailNotificationStatus;
use App\Enums\Site;
use Database\Factories\ContactMessageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property Site $site
 * @property string $first_name
 * @property string|null $last_name
 * @property string $email
 * @property string|null $phone
 * @property ContactSubject|null $subject
 * @property string $message
 * @property string $locale
 * @property ContactMessageStatus $status
 * @property int|null $assigned_admin_id
 * @property string|null $admin_notes
 * @property \Illuminate\Support\Carbon|null $read_at
 * @property \Illuminate\Support\Carbon|null $resolved_at
 * @property EmailNotificationStatus $email_notification_status
 * @property int $email_notification_attempts
 * @property \Illuminate\Support\Carbon|null $email_notified_at
 * @property string|null $email_last_error
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property-read AdminUser|null $assignedAdmin
 */
class ContactMessage extends Model
{
    /** @use HasFactory<ContactMessageFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'site',
        'first_name',
        'last_name',
        'email',
        'phone',
        'subject',
        'message',
        'locale',
        'status',
        'assigned_admin_id',
        'admin_notes',
        'read_at',
        'resolved_at',
        'ip_address',
        'user_agent',
    ];

    /** Defaults mirror the column defaults so a freshly created model is complete without a refresh. */
    protected $attributes = [
        'status' => 'new',
        'email_notification_status' => 'pending',
        'email_notification_attempts' => 0,
    ];

    protected function casts(): array
    {
        return [
            'site' => Site::class,
            'subject' => ContactSubject::class,
            'status' => ContactMessageStatus::class,
            'email_notification_status' => EmailNotificationStatus::class,
            'email_notification_attempts' => 'integer',
            'read_at' => 'datetime',
            'resolved_at' => 'datetime',
            'email_notified_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<AdminUser, $this> */
    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'assigned_admin_id');
    }

    public function fullName(): string
    {
        return trim($this->first_name.' '.($this->last_name ?? ''));
    }
}
