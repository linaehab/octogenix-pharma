<?php

namespace App\Enums;

/** Moderation state of a product review. Only approved reviews are public. */
enum ReviewStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
