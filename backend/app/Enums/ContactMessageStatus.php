<?php

namespace App\Enums;

enum ContactMessageStatus: string
{
    case New = 'new';
    case Read = 'read';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
    case Spam = 'spam';
    case Archived = 'archived';
}
