<?php

namespace App\Enums;

/** Who changed an order (order_status_histories.actor_type, orders.cancelled_by). */
enum OrderActor: string
{
    case Customer = 'customer';
    case Guest = 'guest';
    case Admin = 'admin';
    case System = 'system';
    case PaymentGateway = 'payment_gateway';
}
