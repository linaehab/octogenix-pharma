<?php

namespace App\Enums;

enum ContactMessageStatus: string
{
    case New = 'new';
    case Read = 'read';
    /** Someone answered the sender (outside the dashboard: the app does not send email). */
    case Replied = 'replied';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
    case Spam = 'spam';
    case Archived = 'archived';

    /**
     * Allowed status changes. A message never becomes "new" again (it has been seen), and it can
     * be marked replied only after it was opened. Keeping the same status is not a change.
     */
    public function canChangeTo(self $target): bool
    {
        return $target !== $this
            && $target !== self::New
            && ! ($this === self::New && $target === self::Replied);
    }
}
