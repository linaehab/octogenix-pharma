<?php

namespace App\Enums;

/** Values exactly as sent by the Angular contact form's subject <select>. */
enum ContactSubject: string
{
    case General = 'general';
    case Partnership = 'partnership';
    case Distribution = 'distribution';
    case ImportExport = 'import-export';
    case Other = 'other';
}
