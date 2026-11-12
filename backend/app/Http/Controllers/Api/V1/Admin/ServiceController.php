<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ServiceCategory;
use App\Exceptions\WebsiteContentChangedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceRequest;
use App\Http\Resources\Admin\ServiceResource;
use App\Models\Service;
use App\Services\AuditLogger;
use App\Support\DateInput;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Corporate services in the Customers / Suppliers tabs (routes require content.manage). Every
 * change is audited under "website"; edits may send expected_updated_at (409 if changed since).
 */
class ServiceController extends Controller
{
    private const AUDITED = [
        'category', 'title_en', 'title_ar', 'description_en', 'description_ar',
        'image_path', 'hover_image_path', 'image_alt_en', 'image_alt_ar', 'sort_order', 'is_active',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

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

    /** A new service goes to the end of its tab unless a position is given. */
    public function store(ServiceRequest $request): ServiceResource
    {
        $service = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $data['sort_order'] ??= ((int) Service::withTrashed()->where('category', $data['category'])->max('sort_order')) + 1;
            $service = Service::create($data);
            $this->audit->record('website.service_created', 'service', $service->id, $service->title_en,
                AuditLogger::diff([], $service->refresh()->only(self::AUDITED)));

            return $service;
        });

        return new ServiceResource($service);
    }

    public function update(ServiceRequest $request, Service $service): ServiceResource
    {
        $expected = $request->validate(['expected_updated_at' => ['sometimes', 'nullable', 'date']])['expected_updated_at'] ?? null;

        $service = DB::transaction(function () use ($request, $service, $expected) {
            $locked = Service::query()->lockForUpdate()->findOrFail($service->id);
            if ($expected !== null && DateInput::utc($expected)?->getTimestamp() !== $locked->updated_at?->getTimestamp()) {
                throw new WebsiteContentChangedException((new ServiceResource($locked))->resolve());
            }

            $before = $locked->only(self::AUDITED);
            $locked->fill($request->validated())->save();
            $diff = AuditLogger::diff($before, $locked->only(self::AUDITED));
            if ($diff !== []) {
                $action = array_keys($diff) === ['is_active']
                    ? 'website.service_'.($diff['is_active']['to'] ? 'activated' : 'deactivated')
                    : 'website.service_updated';
                $this->audit->record($action, 'service', $locked->id, $locked->title_en, $diff);
            }

            return $locked;
        });

        return new ServiceResource($service);
    }

    /** Soft delete: nothing references services, and the row is kept for the record. */
    public function destroy(Service $service): JsonResponse
    {
        DB::transaction(function () use ($service) {
            $service->delete();
            $this->audit->record('website.service_deleted', 'service', $service->id, $service->title_en);
        });

        return response()->json(null, 204);
    }

    /** Body: { "category": "customers", "ids": [3, 1, 2] } — every service of that tab in the new order. */
    public function reorder(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'category' => ['required', Rule::enum(ServiceCategory::class)],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ]);
        $ids = array_map('intval', $data['ids']);

        DB::transaction(function () use ($data, $ids) {
            $existing = Service::query()->where('category', $data['category'])->lockForUpdate()->pluck('sort_order', 'id');
            if ($existing->keys()->sort()->values()->all() !== collect($ids)->sort()->values()->all()) {
                throw ValidationException::withMessages(['ids' => 'Send every service of this tab exactly once.']);
            }
            $changes = [];
            foreach ($ids as $position => $id) {
                if ((int) $existing[$id] !== $position) {
                    Service::query()->whereKey($id)->update(['sort_order' => $position]);
                    $changes["service_{$id}"] = ['from' => (int) $existing[$id], 'to' => $position];
                }
            }
            if ($changes !== []) {
                $this->audit->record('website.services_reordered', 'service', null, "Display order ({$data['category']})", $changes);
            }
        });

        return $this->index(new Request(['category' => $data['category']]));
    }
}
