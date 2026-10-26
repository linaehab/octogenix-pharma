<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BrandController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return BrandResource::collection(Brand::query()->active()->ordered()->get());
    }

    public function show(string $slug): BrandResource
    {
        return new BrandResource(Brand::query()->active()->where('slug', $slug)->firstOrFail());
    }
}
