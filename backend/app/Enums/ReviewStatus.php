<?php

namespace App\Enums;

/** Moderation state of a product review. Only approved reviews are public. */
enum ReviewStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    /** Was approved, then taken off the store by an admin; can be restored. */
    case Hidden = 'hidden';

    /**
     * Allowed moderation changes: a pending review is approved or rejected; an approved review can
     * be hidden and a hidden one restored (approved again). Rejected is final.
     */
    public function canChangeTo(self $target): bool
    {
        return match ($this) {
            self::Pending => in_array($target, [self::Approved, self::Rejected], true),
            self::Approved => $target === self::Hidden,
            self::Hidden => $target === self::Approved,
            self::Rejected => false,
        };
    }
}
