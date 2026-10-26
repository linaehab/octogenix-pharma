<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ServiceCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceRequest;
use App\Http\Resources\Admin\ServiceResource;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/** Routes require the content.manage permission. */
class ServiceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate(['category' => ['sometimes', Rule::enum(ServiceCategory::class)]]);

        return ServiceResource::collection(
            Service::query()
                ->when($filters['category'] ?? null, fn ($q, $category) => $q->where('category', $category))
                ->orderBy('category')
                ->ordered()
                ->get()
        );
    }

    public function show(Service $service): ServiceResource
    {
        return new ServiceResource($service);
    }

    public function store(ServiceRequest $request): ServiceResource
    {
        return new ServiceResource(Service::create($request->validated()));
    }

    public function update(ServiceRequest $request, Service $service): ServiceResource
    {
        $service->update($request->validated());

        return new ServiceResource($service);
    }

    public function destroy(Service $service): JsonResponse
    {
        $service->delete();

        return response()->json(null, 204);
    }
}
