<?php

namespace App\Services;

use App\Enums\InventoryReason;
use App\Exceptions\InsufficientStockException;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * The only code that changes product_variants.stock_quantity (design v0.3 §7.1).
 *
 * Each change runs in one transaction: the variant row is locked, the stock is updated with a
 * guard that can never take it below zero (the CHECK constraint is the database backstop), and
 * an inventory_movements row records the change and the resulting balance.
 * Order reservation/release (phase 6) builds on adjust() with order_id set.
 */
class InventoryService
{
    /** @throws InsufficientStockException when a decrease exceeds the available stock */
    public function adjust(
        ProductVariant $variant,
        int $change,
        InventoryReason $reason,
        ?AdminUser $admin = null,
        ?string $note = null,
        ?int $orderId = null,
    ): InventoryMovement {
        if ($change === 0) {
            throw new InvalidArgumentException('A stock change cannot be zero.');
        }
        if ($reason->requiresOrder() && $orderId === null) {
            throw new InvalidArgumentException("Reason [{$reason->value}] requires an order.");
        }

        $movement = DB::transaction(function () use ($variant, $change, $reason, $admin, $note, $orderId) {
            $current = ProductVariant::withTrashed()->whereKey($variant->getKey())->lockForUpdate()->value('stock_quantity');

            $updated = DB::table('product_variants')
                ->where('id', $variant->getKey())
                ->where('stock_quantity', '>=', max(0, -$change))
                ->update([
                    'stock_quantity' => DB::raw('stock_quantity + '.$change),
                    'updated_at' => now(),
                ]);

            if ($updated !== 1) {
                throw new InsufficientStockException($variant, requested: -$change, available: (int) $current);
            }

            return InventoryMovement::create([
                'product_variant_id' => $variant->getKey(),
                'quantity_change' => $change,
                'stock_after' => (int) $current + $change,
                'reason' => $reason,
                'order_id' => $orderId,
                'admin_user_id' => $admin?->getKey(),
                'note' => $note,
            ]);
        });

        $variant->setRawAttributes(['stock_quantity' => $movement->stock_after] + $variant->getAttributes(), sync: true);

        return $movement;
    }

    /**
     * Records a physical stock count: moves the stock to the counted quantity.
     * Returns null when the count already matches (nothing to record).
     */
    public function recordCount(ProductVariant $variant, int $counted, ?AdminUser $admin, ?string $note): ?InventoryMovement
    {
        if ($counted < 0) {
            throw new InvalidArgumentException('A counted quantity cannot be negative.');
        }

        return DB::transaction(function () use ($variant, $counted, $admin, $note) {
            $current = (int) ProductVariant::withTrashed()->whereKey($variant->getKey())->lockForUpdate()->value('stock_quantity');

            return $counted === $current
                ? null
                : $this->adjust($variant, $counted - $current, InventoryReason::StockCountCorrection, $admin, $note);
        });
    }
}
