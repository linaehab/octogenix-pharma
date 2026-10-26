<?php

namespace App\Enums;

/** Payment state of the order as a whole. Refund states arrive with the refunds feature (D-05). */
enum OrderPaymentStatus: string
{
    case Unpaid = 'unpaid';
    case Paid = 'paid';
}
