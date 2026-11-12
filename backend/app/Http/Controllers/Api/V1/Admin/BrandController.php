<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\WebsiteContentChangedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BrandRequest;
use App\Http\Resources\Admin\BrandResource;
use App\Models\Brand;
use App\Services\AuditLogger;
use App\Support\DateInput;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Corporate "Our Brands" (routes require content.manage). Every change is audited under
 * "website"; edits may send expected_updated_at (409 if the brand changed since).
 */
class BrandController extends Controller
{
    /** Columns recorded in the audit log (all editable fields, including image paths). */
    private const AUDITED = [
        'slug', 'name_en', 'name_ar', 'label_en', 'label_ar', 'short_description_en', 'short_description_ar',
        'description_en', 'description_ar', 'logo_path', 'image_path', 'hover_image_path', 'image_alt_en', 'image_alt_ar',
        'cta_label_en', 'cta_label_ar', 'link_type', 'link_url', 'has_store', 'is_featured', 'is_active', 'sort_order',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(): AnonymousResourceCollection
    {
        return BrandResource::collection(Brand::query()->withCount('products')->ordered()->get());
    }

    public function show(Brand $brand): BrandResource
    {
        return new BrandResource($brand->loadCount('products'));
    }

    /** A new brand goes to the end of the list unless a position is given. */
    public function store(BrandRequest $request): BrandResource
    {
        $brand = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $data['sort_order'] ??= ((int) Brand::withTrashed()->max('sort_order')) + 1;
            $brand = Brand::create($data);
            $this->audit->record('website.brand_created', 'brand', $brand->id, $brand->name_en,
                AuditLogger::diff([], $this->snapshot($brand->refresh())));

            return $brand;
        });

        return new BrandResource($brand->loadCount('products'));
    }

    public function update(BrandRequest $request, Brand $brand): BrandResource
    {
        $expected = $request->validate(['expected_updated_at' => ['sometimes', 'nullable', 'date']])['expected_updated_at'] ?? null;

        $brand = DB::transaction(function () use ($request, $brand, $expected) {
            $locked = Brand::query()->lockForUpdate()->findOrFail($brand->id);
            if ($expected !== null && DateInput::utc($expected)?->getTimestamp() !== $locked->updated_at?->getTimestamp()) {
                throw new WebsiteContentChangedException((new BrandResource($locked->loadCount('products')))->resolve());
            }

            $before = $this->snapshot($locked);
            $locked->fill($request->validated())->save();
            $diff = AuditLogger::diff($before, $this->snapshot($locked));
            if ($diff !== []) {
                $this->audit->record($this->action('brand', $diff), 'brand', $locked->id, $locked->name_en, $diff);
            }

            return $locked;
        });

        return new BrandResource($brand->loadCount('products'));
    }

    /** Soft delete: the row and its slug are kept. Brands that still have products are deactivated instead. */
    public function destroy(Brand $brand): JsonResponse
    {
        if ($brand->products()->exists()) {
            throw ValidationException::withMessages([
                'brand' => 'This brand still has products. Deactivate the brand instead of deleting it.',
            ]);
        }

        DB::transaction(function () use ($brand) {
            $brand->delete();
            $this->audit->record('website.brand_deleted', 'brand', $brand->id, $brand->name_en);
        });

        return response()->json(null, 204);
    }

    /** Body: { "ids": [3, 1, 2] } — every brand (not deleted) in the new display order. */
    public function reorder(Request $request): AnonymousResourceCollection
    {
        $request->validate(['ids' => ['required', 'array', 'min:1'], 'ids.*' => ['integer', 'distinct']]);
        $ids = array_map('intval', $request->input('ids'));

        DB::transaction(function () use ($ids) {
            $existing = Brand::query()->lockForUpdate()->orderBy('id')->pluck('sort_order', 'id');
            if ($existing->keys()->sort()->values()->all() !== collect($ids)->sort()->values()->all()) {
                throw ValidationException::withMessages(['ids' => 'Send every brand exactly once.']);
            }
            $changes = [];
            foreach ($ids as $position => $id) {
                if ((int) $existing[$id] !== $position) {
                    Brand::query()->whereKey($id)->update(['sort_order' => $position]);
                    $changes["brand_{$id}"] = ['from' => (int) $existing[$id], 'to' => $position];
                }
            }
            if ($changes !== []) {
                $this->audit->record('website.brands_reordered', 'brand', null, 'Display order', $changes);
            }
        });

        return $this->index();
    }

    /** @return array<string, mixed> */
    private function snapshot(Brand $brand): array
    {
        return $brand->only(self::AUDITED);
    }

    /** "activated"/"deactivated" when only the switch changed, otherwise "updated". */
    private function action(string $type, array $diff): string
    {
        if (array_keys($diff) === ['is_active']) {
            return "website.{$type}_".($diff['is_active']['to'] ? 'activated' : 'deactivated');
        }

        return "website.{$type}_updated";
    }
}
