<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Public catalog for the Jovie store (/jovie/...). Only active products of active brands. */
class ProductController extends Controller
{
    private const RELATIONS = ['brand', 'variants', 'images'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'brand' => ['sometimes', 'string', 'max:150'],
            'stage' => ['sometimes', 'integer', 'min:1', 'max:9'],
            'featured' => ['sometimes', 'boolean'],
        ]);

        $products = Product::query()
            ->visible()
            ->with(self::RELATIONS)
            ->when($filters['brand'] ?? null, fn (Builder $q, string $slug) => $q->whereHas('brand', fn (Builder $b) => $b->where('slug', $slug)))
            ->when(isset($filters['stage']), fn (Builder $q) => $q->where('stage', $filters['stage']))
            ->when($request->boolean('featured'), fn (Builder $q) => $q->where('is_featured', true))
            ->ordered()
            ->paginate(48);

        return ProductResource::collection($products);
    }

    public function show(string $slug): ProductResource
    {
        $product = Product::query()->visible()->with(self::RELATIONS)->where('slug', $slug)->firstOrFail();

        return (new ProductResource($product))->detailed();
    }
}
