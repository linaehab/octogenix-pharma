<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\Admin\ProductResource;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Routes require the catalog.manage permission. */
class ProductController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'brand_id' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return ProductResource::collection(
            Product::query()
                ->with(['brand', 'variants', 'images'])
                ->when($filters['brand_id'] ?? null, fn (Builder $q, $id) => $q->where('brand_id', $id))
                ->when(array_key_exists('is_active', $filters), fn (Builder $q) => $q->where('is_active', $request->boolean('is_active')))
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
        return new ProductResource($product->load(['brand', 'variants', 'images']));
    }

    /** New products start inactive: images and sizes/packs are added before activation. */
    public function store(ProductRequest $request): ProductResource
    {
        return new ProductResource(Product::create($request->validated())->load(['brand', 'variants', 'images']));
    }

    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $product->update($request->validated());

        return new ProductResource($product->load(['brand', 'variants', 'images']));
    }

    /** Soft delete; once orders exist (phase 6) the product row stays for order history regardless. */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(null, 204);
    }
}
