<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AdminPermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\Admin\ProductResource;
use App\Models\Product;
use App\Services\CatalogService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/** Routes require the catalog.manage permission. */
class ProductController extends Controller
{
    private const RELATIONS = ['brand', 'variants', 'images'];

    public function __construct(private readonly CatalogService $catalog) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'brand_id' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            // active / inactive: live products; archived: soft-deleted ones (kept for order history).
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'archived'])],
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $status = $filters['status'] ?? null;

        return ProductResource::collection(
            Product::query()
                ->when($status === 'archived', fn (Builder $q) => $q->onlyTrashed())
                ->with(self::RELATIONS)
                ->withCount('orderItems')
                ->when($filters['brand_id'] ?? null, fn (Builder $q, $id) => $q->where('brand_id', $id))
                ->when(array_key_exists('is_active', $filters), fn (Builder $q) => $q->where('is_active', $request->boolean('is_active')))
                ->when($status === 'active', fn (Builder $q) => $q->where('is_active', true))
                ->when($status === 'inactive', fn (Builder $q) => $q->where('is_active', false))
                ->when(array_key_exists('is_featured', $filters), fn (Builder $q) => $q->where('is_featured', $request->boolean('is_featured')))
                ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                    $like = '%'.addcslashes($search, '%_\\').'%';
                    $q->where(fn (Builder $q) => $q->where('name_en', 'like', $like)
                        ->orWhere('name_ar', 'like', $like)
                        ->orWhere('slug', 'like', $like)
                        ->orWhereHas('variants', fn (Builder $v) => $v->where('sku', 'like', $like)));
                })
                ->ordered()
                ->paginate($filters['per_page'] ?? 25)
        );
    }

    public function show(Product $product): ProductResource
    {
        return new ProductResource($product->load(self::RELATIONS)->loadCount('orderItems'));
    }

    /**
     * New products start hidden (they need an image before they can be shown). With `variant`, the
     * product and its single size are created together in one transaction.
     */
    public function store(ProductRequest $request): ProductResource
    {
        $this->authorizeOpeningStock($request);
        $product = $this->catalog->createProduct($request->productData(), $request->variantData(), $request->user('admin'));

        return new ProductResource($product->load(self::RELATIONS)->loadCount('orderItems'));
    }

    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $this->authorizeOpeningStock($request);
        $product = $this->catalog->updateProduct($product, $request->productData(), $request->variantData());

        return new ProductResource($product->load(self::RELATIONS)->loadCount('orderItems'));
    }

    /**
     * Archive: the product is hidden, then soft-deleted. Nothing is removed from the database, so
     * orders, order lines and reviews that refer to it stay intact; it can be restored.
     */
    public function destroy(Product $product): JsonResponse
    {
        $this->catalog->archiveProduct($product);

        return response()->json(null, 204);
    }

    /** Brings an archived product back to the list, still hidden from the store. */
    public function restore(Product $product): ProductResource
    {
        abort_unless($product->trashed(), 422, 'This product is not archived.');

        return new ProductResource($this->catalog->restoreProduct($product)->load(self::RELATIONS)->loadCount('orderItems'));
    }

    /** Opening stock is a stock change, so it also needs the inventory permission (as for sizes). */
    private function authorizeOpeningStock(ProductRequest $request): void
    {
        abort_if(
            ($request->variantData()['initial_stock'] ?? 0) > 0
                && ! $request->user('admin')->hasPermission(AdminPermission::ManageInventory),
            403,
            'Setting opening stock requires permission to manage inventory.'
        );
    }
}
