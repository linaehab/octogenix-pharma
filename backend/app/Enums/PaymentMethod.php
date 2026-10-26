<?php

namespace App\Enums;

/** Confirmed payment methods (decision C3). */
enum PaymentMethod: string
{
    case Card = 'card';
    case Cod = 'cod';
}
