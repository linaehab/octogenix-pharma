<?php

namespace App\Services;

use App\Enums\AdminPermission;
use App\Enums\InventoryReason;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\StockChangedException;
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
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly AdminNotifier $notifier,
    ) {}

    /**
     * @param  int|null  $expectedStock  the stock the admin saw; when given, the change is refused
     *                                   if the stock is different by the time the row is locked
     *                                   (a double submission, another admin or an order)
     *
     * @throws InsufficientStockException when a decrease exceeds the available stock
     * @throws StockChangedException when $expectedStock no longer matches
     */
    public function adjust(
        ProductVariant $variant,
        int $change,
        InventoryReason $reason,
        ?AdminUser $admin = null,
        ?string $note = null,
        ?int $orderId = null,
        ?int $expectedStock = null,
    ): InventoryMovement {
        if ($change === 0) {
            throw new InvalidArgumentException('A stock change cannot be zero.');
        }
        if ($reason->requiresOrder() && $orderId === null) {
            throw new InvalidArgumentException("Reason [{$reason->value}] requires an order.");
        }

        $movement = DB::transaction(function () use ($variant, $change, $reason, $admin, $note, $orderId, $expectedStock) {
            $row = ProductVariant::withTrashed()->whereKey($variant->getKey())->lockForUpdate()
                ->first(['id', 'product_id', 'sku', 'stock_quantity', 'low_stock_threshold']);
            $current = $row->stock_quantity;

            if ($expectedStock !== null && $expectedStock !== (int) $current) {
                throw new StockChangedException($expectedStock, (int) $current);
            }

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

            $movement = InventoryMovement::create([
                'product_variant_id' => $variant->getKey(),
                'quantity_change' => $change,
                'stock_after' => (int) $current + $change,
                'reason' => $reason,
                'order_id' => $orderId,
                'admin_user_id' => $admin?->getKey(),
                'note' => $note,
            ]);
            $this->auditAndNotify($row, $movement, (int) $current, $admin);

            return $movement;
        });

        $variant->setRawAttributes(['stock_quantity' => $movement->stock_after] + $variant->getAttributes(), sync: true);

        return $movement;
    }

    /**
     * Inside the stock transaction: an audit entry for stock an admin changed by hand (order
     * reservations and releases are part of the order's own history), and a notification when this
     * movement takes the product down to its low-stock level or out of stock. The notification is
     * keyed by the movement, so it is sent once, after the change is committed.
     */
    private function auditAndNotify(ProductVariant $row, InventoryMovement $movement, int $before, ?AdminUser $admin): void
    {
        $product = $row->product()->withTrashed()->first(['id', 'name_en', 'name_ar']);
        $reason = $movement->reason;

        if ($admin !== null && (in_array($reason, InventoryReason::manual(), true) || $reason === InventoryReason::InitialStock)) {
            $action = match (true) {
                $reason === InventoryReason::StockCountCorrection => 'inventory.stock_counted',
                $movement->quantity_change > 0 => 'inventory.stock_increased',
                default => 'inventory.stock_decreased',
            };
            $this->audit->record($action, 'product', $row->product_id, $product?->name_en, [
                'stock' => ['from' => $before, 'to' => $movement->stock_after],
                'reason' => ['from' => null, 'to' => $reason->value],
                'movement_id' => ['from' => null, 'to' => $movement->id],
            ], $admin);
        }

        $after = $movement->stock_after;
        $threshold = $row->low_stock_threshold;
        $type = match (true) {
            $before > 0 && $after <= 0 => 'inventory.out_of_stock',
            $threshold !== null && $before > $threshold && $after <= $threshold => 'inventory.low_stock',
            default => null,
        };
        if ($type !== null) {
            $this->notifier->notify($type, AdminPermission::ManageInventory, [
                'sku' => $row->sku,
                'name_en' => $product?->name_en,
                'name_ar' => $product?->name_ar,
                'stock' => $after,
                'threshold' => $threshold,
            ], '/admin/inventory', "{$type}:movement:{$movement->id}");
        }
    }

    /**
     * Records a physical stock count: moves the stock to the counted quantity.
     * Returns null when the count already matches (nothing to record).
     */
    public function recordCount(ProductVariant $variant, int $counted, ?AdminUser $admin, ?string $note, ?int $expectedStock = null): ?InventoryMovement
    {
        if ($counted < 0) {
            throw new InvalidArgumentException('A counted quantity cannot be negative.');
        }

        return DB::transaction(function () use ($variant, $counted, $admin, $note, $expectedStock) {
            $current = (int) ProductVariant::withTrashed()->whereKey($variant->getKey())->lockForUpdate()->value('stock_quantity');

            if ($expectedStock !== null && $expectedStock !== $current) {
                throw new StockChangedException($expectedStock, $current);
            }

            return $counted === $current
                ? null
                : $this->adjust($variant, $counted - $current, InventoryReason::StockCountCorrection, $admin, $note);
        });
    }
}
