<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\InventoryReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StockAdjustmentRequest;
use App\Http\Resources\Admin\ProductVariantResource;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

/** Routes require the inventory.manage permission. */
class InventoryController extends Controller
{
    public function __construct(private readonly InventoryService $inventory) {}

    public function adjust(StockAdjustmentRequest $request, ProductVariant $variant): JsonResponse
    {
        $reason = InventoryReason::from($request->validated('reason'));
        $admin = $request->user('admin');
        $note = $request->validated('note');

        if ($reason === InventoryReason::StockCountCorrection) {
            $movement = $this->inventory->recordCount($variant, (int) $request->validated('counted_quantity'), $admin, $note);

            if ($movement === null) {
                throw ValidationException::withMessages(['counted_quantity' => 'The stock already matches this count.']);
            }
        } else {
            $quantity = (int) $request->validated('quantity');
            $change = $reason === InventoryReason::WriteOff ? -$quantity : $quantity;
            $movement = $this->inventory->adjust($variant, $change, $reason, $admin, $note);
        }

        return response()->json([
            'data' => [
                'movement' => $this->movementPayload($movement->load('admin')),
                'variant' => new ProductVariantResource($variant->refresh()),
            ],
        ], 201);
    }

    public function movements(ProductVariant $variant): JsonResponse
    {
        $movements = $variant->movements()->with('admin')->latest('id')->paginate(50);

        return response()->json([
            'data' => $movements->getCollection()->map(fn (InventoryMovement $m) => $this->movementPayload($m)),
            'meta' => ['current_page' => $movements->currentPage(), 'last_page' => $movements->lastPage(), 'total' => $movements->total()],
        ]);
    }

    /** Active variants at or below their low-stock threshold. */
    public function lowStock(): AnonymousResourceCollection
    {
        return ProductVariantResource::collection(
            ProductVariant::query()
                ->where('is_active', true)
                ->whereNotNull('low_stock_threshold')
                ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
                ->orderBy('stock_quantity')
                ->get()
        );
    }

    private function movementPayload(InventoryMovement $movement): array
    {
        return [
            'id' => $movement->id,
            'quantity_change' => $movement->quantity_change,
            'stock_after' => $movement->stock_after,
            'reason' => $movement->reason->value,
            'order_id' => $movement->order_id,
            'admin' => $movement->admin ? ['id' => $movement->admin->id, 'name' => $movement->admin->name] : null,
            'note' => $movement->note,
            'created_at' => $movement->created_at->toIso8601String(),
        ];
    }
}
