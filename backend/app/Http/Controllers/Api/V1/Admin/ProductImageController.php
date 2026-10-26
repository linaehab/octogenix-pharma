<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductImageResource;
use App\Models\Product;
use App\Models\ProductImage;
use App\Rules\PlainText;
use App\Rules\ValidImagePath;
use App\Services\CatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Routes require catalog.manage. Upload the file first (POST /admin/uploads/images), then
 * attach the returned path here.
 */
class ProductImageController extends Controller
{
    public function __construct(private readonly CatalogService $catalog) {}

    public function store(Request $request, Product $product): ProductImageResource
    {
        $data = $request->validate([
            'path' => ['required', 'string', new ValidImagePath],
            'alt_en' => ['nullable', 'string', 'max:255', new PlainText],
            'alt_ar' => ['nullable', 'string', 'max:255', new PlainText],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        return new ProductImageResource($this->catalog->addImage($product, $data));
    }

    public function update(Request $request, ProductImage $image): ProductImageResource
    {
        $data = $request->validate([
            'alt_en' => ['sometimes', 'nullable', 'string', 'max:255', new PlainText],
            'alt_ar' => ['sometimes', 'nullable', 'string', 'max:255', new PlainText],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        return new ProductImageResource($this->catalog->updateImage($image, $data));
    }

    public function destroy(ProductImage $image): JsonResponse
    {
        $this->catalog->deleteImage($image);

        return response()->json(null, 204);
    }

    /** Body: { "ids": [...] } — every image of the product in the new order. */
    public function reorder(Request $request, Product $product): JsonResponse
    {
        $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);

        $this->catalog->reorderImages($product, $request->input('ids'));

        return response()->json(null, 204);
    }
}
