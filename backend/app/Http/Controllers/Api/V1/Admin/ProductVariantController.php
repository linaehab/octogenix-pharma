<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AdminPermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductVariantRequest;
use App\Http\Resources\Admin\ProductVariantResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\CatalogService;
use Illuminate\Http\JsonResponse;

/** Routes require catalog.manage; opening stock and the low-stock level additionally require inventory.manage. */
class ProductVariantController extends Controller
{
    public function __construct(private readonly CatalogService $catalog) {}

    public function store(ProductVariantRequest $request, Product $product): ProductVariantResource
    {
        $admin = $request->user('admin');

        abort_if(
            ($request->validated('initial_stock') ?? 0) > 0 && ! $admin->hasPermission(AdminPermission::ManageInventory),
            403,
            'Setting opening stock requires permission to manage inventory.'
        );

        $this->authorizeThreshold($request);

        return new ProductVariantResource($this->catalog->createVariant($product, $request->validated(), $admin));
    }

    /** The low-stock level belongs to inventory management, so it needs inventory.manage too. */
    private function authorizeThreshold(ProductVariantRequest $request): void
    {
        abort_if(
            array_key_exists('low_stock_threshold', $request->validated())
                && ! $request->user('admin')->hasPermission(AdminPermission::ManageInventory),
            403,
            'Changing the low-stock level requires permission to manage inventory.'
        );
    }

    public function update(ProductVariantRequest $request, ProductVariant $variant): ProductVariantResource
    {
        $this->authorizeThreshold($request);

        return new ProductVariantResource($this->catalog->updateVariant($variant, $request->validated()));
    }

    public function destroy(ProductVariant $variant): JsonResponse
    {
        $this->catalog->deleteVariant($variant);

        return response()->json(null, 204);
    }
}
