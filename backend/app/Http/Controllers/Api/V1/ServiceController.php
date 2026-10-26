<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ServiceCategory;
use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /** Active services grouped by tab: { data: { customers: [...], suppliers: [...] } }, in display order. */
    public function index(Request $request): JsonResponse
    {
        $services = Service::query()->active()->ordered()->get()->groupBy(fn (Service $s) => $s->category->value);

        $data = [];
        foreach (ServiceCategory::cases() as $category) {
            $data[$category->value] = ServiceResource::collection($services->get($category->value, collect()))
                ->toArray($request);
        }

        return response()->json(['data' => $data]);
    }
}
