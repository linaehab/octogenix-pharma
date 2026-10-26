<?php

namespace App\Enums;

/** Public sites inside the Angular app (corporate at /, Jovie store at /jovie). */
enum Site: string
{
    case Corporate = 'corporate';
    case Jovie = 'jovie';
}
