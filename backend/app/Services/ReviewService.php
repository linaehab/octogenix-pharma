<?php

namespace App\Services;

use App\Enums\AdminPermission;
use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductReviewVote;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Product reviews: submission (always pending until an admin approves it), the public rating
 * summary computed from approved reviews only, and "Was this helpful?" votes (one per browser).
 */
class ReviewService
{
    /** Orders that count as a purchase for the "verified purchase" badge. */
    private const NOT_PURCHASED = [OrderStatus::PendingPayment, OrderStatus::Cancelled, OrderStatus::Expired];

    /**
     * @param  array{name: string, email: ?string, rating: int, title: string, body: string, recommends: ?bool, order_number: ?string, order_email: ?string, locale: string, ip_address: ?string, user_agent: ?string}  $input
     *
     * @throws ValidationException when the given order does not prove the purchase
     */
    public function submit(Product $product, array $input): ProductReview
    {
        $order = null;
        if (filled($input['order_number'])) {
            $order = Order::query()
                ->where('order_number', trim($input['order_number']))
                ->where('customer_email', Str::lower(trim((string) $input['order_email'])))
                ->whereNotIn('status', self::NOT_PURCHASED)
                ->whereHas('items', fn ($q) => $q->where('product_id', $product->id))
                ->first()
                ?? throw ValidationException::withMessages([
                    'order_number' => 'We could not find an order with this product for this order number and email.',
                ]);

            if (ProductReview::withTrashed()->where('order_id', $order->id)->where('product_id', $product->id)->exists()) {
                throw ValidationException::withMessages(['order_number' => 'A review for this product has already been sent with this order.']);
            }
        }

        $review = new ProductReview([
            'author_name' => trim($input['name']),
            'rating' => $input['rating'],
            'title' => trim($input['title']),
            'body' => trim($input['body']),
            'recommends' => $input['recommends'],
        ]);
        $review->forceFill([
            'product_id' => $product->id,
            'order_id' => $order?->id,
            'author_email' => filled($input['email']) ? Str::lower(trim($input['email'])) : null,
            'is_verified_purchase' => $order !== null,
            'status' => ReviewStatus::Pending,
            'locale' => $input['locale'],
            'ip_address' => $input['ip_address'],
            'user_agent' => $input['user_agent'] !== null ? Str::limit($input['user_agent'], 252) : null,
        ]);

        try {
            $review->save();
            // Dashboard notification: product and rating only, never the author's details.
            app(AdminNotifier::class)->notify('reviews.pending', AdminPermission::ManageReviews, [
                'name_en' => $product->name_en,
                'name_ar' => $product->name_ar,
                'rating' => (int) $review->rating,
            ], null, "reviews.pending:{$review->id}");
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['order_number' => 'A review for this product has already been sent with this order.']);
        }

        return $review;
    }

    /**
     * Average, count and star distribution of the approved reviews of a product.
     *
     * @return array{count: int, average: float|null, distribution: array<int, int>, recommend_percent: int|null}
     */
    public function summary(Product $product): array
    {
        $rows = $product->approvedReviews()->toBase()
            ->selectRaw('rating, count(*) as n, sum(case when recommends = 1 then 1 else 0 end) as yes, sum(case when recommends is not null then 1 else 0 end) as answered')
            ->groupBy('rating')->get();

        $distribution = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
        $count = $sum = $yes = $answered = 0;
        foreach ($rows as $row) {
            $distribution[(int) $row->rating] = (int) $row->n;
            $count += (int) $row->n;
            $sum += (int) $row->rating * (int) $row->n;
            $yes += (int) $row->yes;
            $answered += (int) $row->answered;
        }

        return [
            'count' => $count,
            'average' => $count ? round($sum / $count, 1) : null,
            'distribution' => $distribution,
            'recommend_percent' => $answered ? (int) round($yes * 100 / $answered) : null,
        ];
    }

    /**
     * Records one vote per review and browser and updates the counters in the same transaction.
     *
     * @throws ConflictHttpException when this browser already voted on the review
     */
    public function vote(ProductReview $review, bool $helpful, string $voterToken, ?string $ip): ProductReview
    {
        try {
            DB::transaction(function () use ($review, $helpful, $voterToken, $ip) {
                ProductReviewVote::query()->create([
                    'product_review_id' => $review->id,
                    'voter_hash' => hash('sha256', $voterToken),
                    'ip_hash' => hash('sha256', (string) $ip.'|'.config('app.key')),
                    'is_helpful' => $helpful,
                ]);
                ProductReview::query()->whereKey($review->id)->increment($helpful ? 'helpful_count' : 'not_helpful_count');
            });
        } catch (UniqueConstraintViolationException) {
            throw new ConflictHttpException('You have already voted on this review.');
        }

        return $review->refresh();
    }
}
