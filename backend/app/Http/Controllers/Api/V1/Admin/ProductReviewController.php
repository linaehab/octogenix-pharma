<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ReviewStatus;
use App\Exceptions\ReviewChangedException;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\ProductReviewResource;
use App\Models\Product;
use App\Models\ProductReview;
use App\Rules\PlainText;
use App\Services\AuditLogger;
use App\Support\ReportPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Review moderation (reviews.manage, enforced on the routes): list with totals and the average of
 * approved reviews; approve / reject a pending review, hide an approved one and restore it; correct
 * the text and delete (API only, not used by the dashboard). Only approved reviews are public.
 */
class ProductReviewController extends Controller
{
    private const RELATIONS = ['product', 'order', 'moderatedBy'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::enum(ReviewStatus::class)],
            'product' => ['sometimes', 'string', 'max:150'],
            'product_id' => ['sometimes', 'integer', 'min:1'],
            'rating' => ['sometimes', 'integer', 'between:1,5'],
            'verified' => ['sometimes', 'boolean'],
            'search' => ['sometimes', 'string', 'max:100'],
            // Calendar days in Egyptian time, inclusive.
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'sort' => ['sometimes', Rule::in(['newest', 'oldest'])],
            'summary' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $day = fn (string $date) => CarbonImmutable::createFromFormat('Y-m-d', $date, ReportPeriod::TIMEZONE);

        $reviews = ProductReview::query()
            ->with(self::RELATIONS)
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['product'] ?? null, fn ($q, $slug) => $q->whereHas('product', fn ($p) => $p->where('slug', $slug)))
            ->when($filters['product_id'] ?? null, fn ($q, $id) => $q->where('product_id', $id))
            ->when(isset($filters['rating']), fn ($q) => $q->where('rating', $filters['rating']))
            ->when(isset($filters['verified']), fn ($q) => $q->where('is_verified_purchase', $request->boolean('verified')))
            ->when($filters['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', $day($v)->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<=', $day($v)->endOfDay()->utc()))
            ->when($filters['search'] ?? null, function ($q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn ($q) => $q->where('author_name', 'like', $like)
                    ->orWhere('author_email', 'like', $like)
                    ->orWhere('title', 'like', $like)
                    ->orWhere('body', 'like', $like)
                    ->orWhereHas('product', fn ($p) => $p->withTrashed()->where('name_en', 'like', $like)->orWhere('name_ar', 'like', $like)));
            })
            ->orderBy('id', ($filters['sort'] ?? 'newest') === 'oldest' ? 'asc' : 'desc')
            ->paginate($filters['per_page'] ?? 25);

        // The dashboard list asks for the short form: a preview instead of the full text, no email.
        if ($request->boolean('summary')) {
            $reviews->through(fn (ProductReview $r) => (new ProductReviewResource($r))->summary());
        }

        $byStatus = ProductReview::query()->toBase()->selectRaw('status, count(*) as n')
            ->whereNull('deleted_at')->groupBy('status')->pluck('n', 'status');
        $average = ProductReview::query()->approved()->avg('rating');

        return ProductReviewResource::collection($reviews)->additional(['meta' => [
            'totals' => [
                'all' => (int) $byStatus->sum(),
                ...collect(ReviewStatus::cases())->mapWithKeys(fn (ReviewStatus $s) => [$s->value => (int) ($byStatus[$s->value] ?? 0)])->all(),
                'approved_average' => $average !== null ? round((float) $average, 1) : null,
            ],
            // Products that have reviews, for the product filter.
            'products' => Product::withTrashed()->whereHas('reviews')->orderBy('name_en')->get(['id', 'name_en', 'name_ar'])
                ->map(fn (Product $p) => ['id' => $p->id, 'name' => ['en' => $p->name_en, 'ar' => $p->name_ar]])->all(),
        ]]);
    }

    public function show(ProductReview $review): ProductReviewResource
    {
        return new ProductReviewResource($review->load(self::RELATIONS));
    }

    /**
     * { status?, expected_status?, author_name?, rating?, title?, body?, recommends? } — a status
     * change records the moderator and must be an allowed change (ReviewStatus::canChangeTo).
     * expected_status is the status the admin saw: if it changed meanwhile, nothing is saved (409).
     */
    public function update(Request $request, ProductReview $review): ProductReviewResource
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::enum(ReviewStatus::class)],
            'expected_status' => ['sometimes', Rule::enum(ReviewStatus::class)],
            'author_name' => ['sometimes', 'string', 'min:2', 'max:80', new PlainText],
            'rating' => ['sometimes', 'integer', 'between:1,5'],
            'title' => ['sometimes', 'string', 'min:3', 'max:120', new PlainText],
            'body' => ['sometimes', 'string', 'min:10', 'max:3000', new PlainText],
            'recommends' => ['sometimes', 'nullable', 'boolean'],
        ]);
        $expected = $data['expected_status'] ?? null;
        unset($data['expected_status']);

        $review = DB::transaction(function () use ($review, $data, $request, $expected) {
            $review = ProductReview::query()->lockForUpdate()->findOrFail($review->id);
            if ($expected !== null && $review->status->value !== $expected) {
                throw new ReviewChangedException((new ProductReviewResource($review->load(self::RELATIONS)))->resolve());
            }
            if (isset($data['status']) && $data['status'] !== $review->status->value
                && ! $review->status->canChangeTo(ReviewStatus::from($data['status']))) {
                throw ValidationException::withMessages(['status' => 'This status change is not allowed.']);
            }

            $fields = ['status', 'rating', 'title', 'body', 'author_name', 'recommends'];
            $before = $review->only($fields);
            $review->fill(collect($data)->except('status')->all());
            if (isset($data['status']) && $data['status'] !== $review->status->value) {
                $review->forceFill([
                    'status' => ReviewStatus::from($data['status']),
                    'moderated_by_admin_id' => $request->user('admin')->id,
                    'moderated_at' => now(),
                ]);
            }
            $review->save();

            // Moderation is recorded without the author's name or the review text.
            $diff = AuditLogger::diff($before, $review->only($fields));
            $edited = array_values(array_diff(array_keys($diff), ['status']));
            $changes = isset($diff['status']) ? ['status' => $diff['status']] : [];
            if ($edited !== []) {
                $changes['edited_fields'] = ['from' => null, 'to' => $edited];
            }
            if ($changes !== []) {
                $action = match ($diff['status']['to'] ?? null) {
                    ReviewStatus::Approved->value => ($diff['status']['from'] ?? null) === ReviewStatus::Hidden->value ? 'reviews.restored' : 'reviews.approved',
                    ReviewStatus::Rejected->value => 'reviews.rejected',
                    ReviewStatus::Hidden->value => 'reviews.hidden',
                    default => 'reviews.updated',
                };
                if (isset($changes['status'])) {
                    $changes['product_id'] = ['from' => null, 'to' => $review->product_id];
                }
                app(AuditLogger::class)->record($action, 'review', $review->id, $this->auditLabel($review), $changes);
            }

            return $review;
        });

        return new ProductReviewResource($review->load(self::RELATIONS));
    }

    public function destroy(ProductReview $review): Response
    {
        DB::transaction(function () use ($review) {
            $review->delete();
            app(AuditLogger::class)->record('reviews.deleted', 'review', $review->id, $this->auditLabel($review),
                ['status' => ['from' => $review->status->value, 'to' => null]]);
        });

        return response()->noContent();
    }

    /** "<product> · 4★": identifies the review without the author's name or text. */
    private function auditLabel(ProductReview $review): string
    {
        $product = $review->product()->withTrashed()->value('name_en');

        return trim(($product ?? 'Product').' · '.$review->rating.'★');
    }
}
