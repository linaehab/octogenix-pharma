<?php

namespace App\Enums;

/** Why stock changed (design v0.3 §5.C). No expiry/batch reasons by decision C7. */
enum InventoryReason: string
{
    case InitialStock = 'initial_stock';
    case Restock = 'restock';
    case ManualAdjustment = 'manual_adjustment';
    case StockCountCorrection = 'stock_count_correction';
    case WriteOff = 'write_off';
    case OrderReserved = 'order_reserved';
    case OrderReleased = 'order_released';
    case ReturnRestock = 'return_restock';

    /** Reasons an admin can record directly from the dashboard. */
    public static function manual(): array
    {
        return [self::Restock, self::ManualAdjustment, self::StockCountCorrection, self::WriteOff];
    }

    public function requiresOrder(): bool
    {
        return in_array($this, [self::OrderReserved, self::OrderReleased, self::ReturnRestock], true);
    }
}
