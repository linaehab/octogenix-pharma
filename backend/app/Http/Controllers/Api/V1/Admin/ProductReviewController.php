<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\ProductReviewResource;
use App\Models\ProductReview;
use App\Rules\PlainText;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/**
 * Review moderation (reviews.manage, enforced on the routes): list with totals and the average of
 * approved reviews, approve / reject, correct the text, delete.
 */
class ProductReviewController extends Controller
{
    private const RELATIONS = ['product', 'order', 'moderatedBy'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::enum(ReviewStatus::class)],
            'product' => ['sometimes', 'string', 'max:150'],
            'rating' => ['sometimes', 'integer', 'between:1,5'],
            'verified' => ['sometimes', 'boolean'],
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $reviews = ProductReview::query()
            ->with(self::RELATIONS)
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['product'] ?? null, fn ($q, $slug) => $q->whereHas('product', fn ($p) => $p->where('slug', $slug)))
            ->when(isset($filters['rating']), fn ($q) => $q->where('rating', $filters['rating']))
            ->when(isset($filters['verified']), fn ($q) => $q->where('is_verified_purchase', $request->boolean('verified')))
            ->when($filters['search'] ?? null, function ($q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn ($q) => $q->where('author_name', 'like', $like)
                    ->orWhere('author_email', 'like', $like)
                    ->orWhere('title', 'like', $like)
                    ->orWhere('body', 'like', $like));
            })
            ->latest('id')
            ->paginate($filters['per_page'] ?? 25);

        $byStatus = ProductReview::query()->toBase()->selectRaw('status, count(*) as n')
            ->whereNull('deleted_at')->groupBy('status')->pluck('n', 'status');
        $average = ProductReview::query()->approved()->avg('rating');

        return ProductReviewResource::collection($reviews)->additional(['meta' => ['totals' => [
            'all' => (int) $byStatus->sum(),
            ...collect(ReviewStatus::cases())->mapWithKeys(fn (ReviewStatus $s) => [$s->value => (int) ($byStatus[$s->value] ?? 0)])->all(),
            'approved_average' => $average !== null ? round((float) $average, 1) : null,
        ]]]);
    }

    public function show(ProductReview $review): ProductReviewResource
    {
        return new ProductReviewResource($review->load(self::RELATIONS));
    }

    /** { status?, author_name?, rating?, title?, body?, recommends? } — a status change records the moderator. */
    public function update(Request $request, ProductReview $review): ProductReviewResource
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::enum(ReviewStatus::class)],
            'author_name' => ['sometimes', 'string', 'min:2', 'max:80', new PlainText],
            'rating' => ['sometimes', 'integer', 'between:1,5'],
            'title' => ['sometimes', 'string', 'min:3', 'max:120', new PlainText],
            'body' => ['sometimes', 'string', 'min:10', 'max:3000', new PlainText],
            'recommends' => ['sometimes', 'nullable', 'boolean'],
        ]);

        $review->fill(collect($data)->except('status')->all());
        if (isset($data['status']) && $data['status'] !== $review->status->value) {
            $review->forceFill([
                'status' => ReviewStatus::from($data['status']),
                'moderated_by_admin_id' => $request->user('admin')->id,
                'moderated_at' => now(),
            ]);
        }
        $review->save();

        return new ProductReviewResource($review->load(self::RELATIONS));
    }

    public function destroy(ProductReview $review): Response
    {
        $review->delete();

        return response()->noContent();
    }
}
