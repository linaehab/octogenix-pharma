<?php

namespace App\Enums;

/** Where a brand card links to: nowhere, an Angular route, or an external https site. */
enum BrandLinkType: string
{
    case None = 'none';
    case Internal = 'internal';
    case External = 'external';
}
