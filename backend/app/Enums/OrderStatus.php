<?php

namespace App\Enums;

/**
 * Order lifecycle (design v0.3 §7.2) — the fulfillment stage only; payment is OrderPaymentStatus.
 *
 * Card:  pending_payment → confirmed → processing → shipped → delivered   (or expired / cancelled)
 * COD:   pending_confirmation → confirmed → processing → shipped → delivered   (or cancelled)
 * Both:  shipped → returned (refused or failed delivery)
 *
 * Dashboard and store names (Phase 11.5): pending_confirmation = New, confirmed = Confirmed,
 * processing = Preparing, shipped = Prepared (ready for delivery; no courier tracking),
 * delivered = Delivered. allowedNext() is the normal flow (customers, system, payments);
 * adminTargets() adds the admin's manual corrections.
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

    /**
     * The working stages of an order, in order. Dashboard names: New, Confirmed, Preparing,
     * Prepared (the stored value "shipped": ready for delivery), Delivered.
     */
    public const WORKING_STAGES = [self::PendingConfirmation, self::Confirmed, self::Processing, self::Shipped, self::Delivered];

    /**
     * Where an admin may move an order (manual corrections included, approved for Phase 11.5):
     * - between the working stages, forward or back (New only for cash-on-delivery orders);
     * - to Cancelled from any stage before Delivered (stock goes back once);
     * - to Returned from Prepared or Delivered;
     * - Cancelled, Expired and Returned are final; an unpaid card order only waits for payment
     *   or is cancelled (OrderActions and the controller add the payment rules).
     *
     * @return list<self>
     */
    public function adminTargets(): array
    {
        if ($this === self::PendingPayment) {
            return [self::Confirmed, self::Cancelled];
        }
        if (! in_array($this, self::WORKING_STAGES, true)) {
            return [];
        }

        $targets = array_values(array_filter(self::WORKING_STAGES, fn (self $s) => $s !== $this));
        if ($this !== self::Delivered) {
            $targets[] = self::Cancelled;
        }
        if ($this === self::Shipped || $this === self::Delivered) {
            $targets[] = self::Returned;
        }

        return $targets;
    }

    public function adminCanChangeTo(self $next): bool
    {
        return in_array($next, $this->adminTargets(), true);
    }

    /** A move that is not the normal next step (a correction): it needs a note. */
    public function isCorrection(self $next): bool
    {
        return ! $this->canBecome($next);
    }

    /** Position of a working stage (null for the others), to clear later stages' times when moving back. */
    public function stageIndex(): ?int
    {
        $index = array_search($this, self::WORKING_STAGES, true);

        return $index === false ? null : $index;
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
