<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\InventoryReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StockAdjustmentRequest;
use App\Http\Resources\Admin\ProductVariantResource;
use App\Models\AdminUser;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\DashboardSummaryService;
use App\Services\InventoryService;
use App\Support\ImagePath;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Routes require the inventory.manage permission. Stock only changes through InventoryService;
 * movements are append-only (read here, never edited or deleted).
 */
class InventoryController extends Controller
{
    private const STATUSES = [ProductVariant::STOCK_IN, ProductVariant::STOCK_LOW, ProductVariant::STOCK_OUT];

    public function __construct(private readonly InventoryService $inventory) {}

    /**
     * Stock of every live product (its single size), with the counts per stock status. Archived
     * products are left out; hidden ones are included (they still hold stock).
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $page = $this->tracked()
            ->with(['product' => fn ($q) => $q->with('primaryImage')])
            ->withMax('movements', 'created_at')
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn (Builder $q) => $q->where('sku', 'like', $like)
                    ->orWhereHas('product', fn (Builder $p) => $p->where('name_en', 'like', $like)->orWhere('name_ar', 'like', $like)));
            })
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->stockStatus($status))
            // Most urgent first: out of stock, then low, then the rest; each by product order.
            ->orderByRaw('CASE WHEN stock_quantity <= 0 THEN 0 WHEN low_stock_threshold IS NOT NULL AND stock_quantity <= low_stock_threshold THEN 1 ELSE 2 END')
            ->orderBy(Product::query()->select('sort_order')->whereColumn('products.id', 'product_variants.product_id'))
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => $page->getCollection()->map(fn (ProductVariant $v) => $this->stockRow($v)),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'summary' => $this->summary(),
            ],
        ]);
    }

    public function adjust(StockAdjustmentRequest $request, ProductVariant $variant): JsonResponse
    {
        $reason = InventoryReason::from($request->validated('reason'));
        $admin = $request->user('admin');
        $note = $request->validated('note');
        $expected = $request->validated('expected_stock');

        if ($reason === InventoryReason::StockCountCorrection) {
            $movement = $this->inventory->recordCount($variant, (int) $request->validated('counted_quantity'), $admin, $note, $expected);

            if ($movement === null) {
                throw ValidationException::withMessages(['counted_quantity' => 'The stock already matches this count.']);
            }
        } else {
            $quantity = (int) $request->validated('quantity');
            $change = $reason === InventoryReason::WriteOff ? -$quantity : $quantity;
            $movement = $this->inventory->adjust($variant, $change, $reason, $admin, $note, expectedStock: $expected);
        }

        return response()->json([
            'data' => [
                'movement' => $this->movementPayload($movement->load('admin')),
                'variant' => new ProductVariantResource($variant->refresh()),
            ],
        ], 201);
    }

    /** The low-stock level of one product. Null clears it (no low-stock alert for that product). */
    public function updateThreshold(Request $request, ProductVariant $variant): JsonResponse
    {
        $data = $request->validate([
            'low_stock_threshold' => ['present', 'nullable', 'integer', 'min:0', 'max:1000000'],
        ]);

        $variant->forceFill(['low_stock_threshold' => $data['low_stock_threshold']])->save();
        $variant->load(['product' => fn ($q) => $q->withTrashed()->with('primaryImage')])->loadMax('movements', 'created_at');

        return response()->json(['data' => $this->stockRow($variant)]);
    }

    public function movements(ProductVariant $variant): JsonResponse
    {
        $movements = $variant->movements()->with('admin')->latest('id')->paginate(50);

        return response()->json([
            'data' => $movements->getCollection()->map(fn (InventoryMovement $m) => $this->movementPayload($m)),
            'meta' => ['current_page' => $movements->currentPage(), 'last_page' => $movements->lastPage(), 'total' => $movements->total()],
        ]);
    }

    /**
     * Every stock movement, newest first, read-only. Dates are calendar days in Egyptian time, as on
     * the dashboard. The filter options (products, admins) come with the first page.
     */
    public function history(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'variant_id' => ['sometimes', 'integer'],
            'reason' => ['sometimes', Rule::enum(InventoryReason::class)],
            'admin_id' => ['sometimes', 'integer'],
            'order' => ['sometimes', 'string', 'max:30'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $day = fn (string $date) => CarbonImmutable::createFromFormat('Y-m-d', $date, DashboardSummaryService::TIMEZONE);

        $page = InventoryMovement::query()
            ->with(['admin', 'order:id,order_number', 'variant' => fn ($q) => $q->withTrashed()->with(['product' => fn ($p) => $p->withTrashed()])])
            ->when($filters['variant_id'] ?? null, fn (Builder $q, $id) => $q->where('product_variant_id', $id))
            ->when($filters['reason'] ?? null, fn (Builder $q, $reason) => $q->where('reason', $reason))
            ->when($filters['admin_id'] ?? null, fn (Builder $q, $id) => $q->where('admin_user_id', $id))
            ->when($filters['order'] ?? null, fn (Builder $q, string $number) => $q->whereHas('order',
                fn (Builder $o) => $o->where('order_number', 'like', '%'.addcslashes(trim($number), '%_\\').'%')))
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->where('created_at', '>=', $day($from)->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->where('created_at', '<=', $day($to)->endOfDay()->utc()))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => $page->getCollection()->map(fn (InventoryMovement $m) => $this->historyRow($m)),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'options' => [
                    'products' => ProductVariant::withTrashed()->whereHas('movements')
                        ->with(['product' => fn ($p) => $p->withTrashed()])->orderBy('id')->get()
                        ->map(fn (ProductVariant $v) => ['variant_id' => $v->id, 'sku' => $v->sku,
                            'name_en' => $v->product?->name_en, 'name_ar' => $v->product?->name_ar]),
                    'admins' => AdminUser::query()->whereIn('id', InventoryMovement::query()->whereNotNull('admin_user_id')->select('admin_user_id'))
                        ->orderBy('name')->get(['id', 'name']),
                    'reasons' => array_map(fn (InventoryReason $r) => $r->value, InventoryReason::cases()),
                ],
            ],
        ]);
    }

    /** Active variants with some stock left at or below their threshold. */
    public function lowStock(): AnonymousResourceCollection
    {
        return ProductVariantResource::collection(
            ProductVariant::query()
                ->lowOnStock()
                ->orderBy('stock_quantity')
                ->get()
        );
    }

    /** The single size of every live (non-archived) product. */
    private function tracked(): Builder
    {
        return ProductVariant::query()->where('is_default', true)->whereHas('product');
    }

    /** @return array{tracked: int, in_stock: int, low_stock: int, out_of_stock: int, without_threshold: int} */
    private function summary(): array
    {
        return [
            'tracked' => $this->tracked()->count(),
            'in_stock' => $this->tracked()->stockStatus(ProductVariant::STOCK_IN)->count(),
            'low_stock' => $this->tracked()->stockStatus(ProductVariant::STOCK_LOW)->count(),
            'out_of_stock' => $this->tracked()->stockStatus(ProductVariant::STOCK_OUT)->count(),
            'without_threshold' => $this->tracked()->whereNull('low_stock_threshold')->count(),
        ];
    }

    private function stockRow(ProductVariant $variant): array
    {
        $product = $variant->product;
        $lastMovement = $variant->movements_max_created_at;

        return [
            'variant_id' => $variant->id,
            'product_id' => $variant->product_id,
            'name_en' => $product?->name_en,
            'name_ar' => $product?->name_ar,
            'image_url' => ImagePath::url($product?->primaryImage?->path),
            'is_active' => (bool) $product?->is_active,
            'is_purchasable' => (bool) $product?->is_purchasable,
            'sku' => $variant->sku,
            'stock_quantity' => $variant->stock_quantity,
            'low_stock_threshold' => $variant->low_stock_threshold,
            'stock_status' => $variant->stockStatus(),
            'last_movement_at' => $lastMovement ? CarbonImmutable::parse($lastMovement)->toIso8601String() : null,
        ];
    }

    private function historyRow(InventoryMovement $movement): array
    {
        $variant = $movement->variant;

        return [
            ...$this->movementPayload($movement),
            'stock_before' => $movement->stockBefore(),
            'variant_id' => $movement->product_variant_id,
            'sku' => $variant?->sku,
            'name_en' => $variant?->product?->name_en,
            'name_ar' => $variant?->product?->name_ar,
            'order' => $movement->order ? ['id' => $movement->order->id, 'order_number' => $movement->order->order_number] : null,
        ];
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
