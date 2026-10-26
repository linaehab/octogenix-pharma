<?php

namespace App\Enums;

/** Kind of editable content entry. */
enum ContentType: string
{
    case Text = 'text';
    case Textarea = 'textarea';
    case Image = 'image';
}
