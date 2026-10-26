<?php

namespace App\Enums;

/**
 * Order lifecycle (design v0.3 §7.2).
 *
 * Card:  pending_payment → confirmed → processing → shipped → delivered   (or expired / cancelled)
 * COD:   pending_confirmation → confirmed → processing → shipped → delivered   (or cancelled)
 * Both:  shipped → returned (refused or failed delivery)
 */
enum OrderStatus: string
{
    case PendingPayment = 'pending_payment';
    case PendingConfirmation = 'pending_confirmation';
    case Confirmed = 'confirmed';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
    case Returned = 'returned';

    /** @return list<self> */
    public function allowedNext(): array
    {
        return match ($this) {
            self::PendingPayment => [self::Confirmed, self::Expired, self::Cancelled],
            self::PendingConfirmation => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Processing, self::Cancelled],
            self::Processing => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered, self::Returned],
            self::Delivered, self::Cancelled, self::Expired, self::Returned => [],
        };
    }

    public function canBecome(self $next): bool
    {
        return in_array($next, $this->allowedNext(), true);
    }

    /** Statuses that give the reserved stock back. */
    public function releasesStock(): bool
    {
        return $this === self::Cancelled || $this === self::Expired;
    }

    /** Customers (and guests) may cancel only before the order is confirmed (policy D-05 pending). */
    public function isCancellableByCustomer(): bool
    {
        return $this === self::PendingPayment || $this === self::PendingConfirmation;
    }

    public function timestampColumn(): ?string
    {
        return match ($this) {
            self::Confirmed => 'confirmed_at',
            self::Shipped => 'shipped_at',
            self::Delivered => 'delivered_at',
            self::Cancelled, self::Expired => 'cancelled_at',
            self::Returned => 'returned_at',
            default => null,
        };
    }
}
