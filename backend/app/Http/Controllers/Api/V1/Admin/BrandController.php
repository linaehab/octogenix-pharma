<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BrandRequest;
use App\Http\Resources\Admin\BrandResource;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

/** Routes require the content.manage permission. */
class BrandController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return BrandResource::collection(Brand::query()->ordered()->get());
    }

    public function show(Brand $brand): BrandResource
    {
        return new BrandResource($brand);
    }

    public function store(BrandRequest $request): BrandResource
    {
        return new BrandResource(Brand::create($request->validated()));
    }

    public function update(BrandRequest $request, Brand $brand): BrandResource
    {
        $brand->update($request->validated());

        return new BrandResource($brand);
    }

    /** Soft delete: the row and its slug are kept. Brands that still have products are deactivated instead. */
    public function destroy(Brand $brand): JsonResponse
    {
        if ($brand->products()->exists()) {
            throw ValidationException::withMessages([
                'brand' => 'This brand still has products. Deactivate the brand instead of deleting it.',
            ]);
        }

        $brand->delete();

        return response()->json(null, 204);
    }
}
