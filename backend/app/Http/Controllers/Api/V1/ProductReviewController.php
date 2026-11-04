<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductReviewRequest;
use App\Http\Resources\ProductReviewResource;
use App\Models\Product;
use App\Models\ProductReview;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Public reviews of an active product (Jovie shop product page).
 * - GET  /products/{slug}/reviews  approved reviews (sort, rating filter, pages) + meta.summary
 * - POST /products/{slug}/reviews  a new review, pending until an admin approves it
 * - POST /reviews/{review}/votes   "Was this helpful?" (one vote per browser token)
 */
class ProductReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviews) {}

    public function index(Request $request, string $slug): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'sort' => ['sometimes', 'in:newest,highest,lowest,helpful'],
            'rating' => ['sometimes', 'integer', 'between:1,5'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:20'],
        ]);
        $product = $this->product($slug);

        $query = $product->approvedReviews()
            ->when(isset($filters['rating']), fn ($q) => $q->where('rating', $filters['rating']));
        match ($filters['sort'] ?? 'newest') {
            'highest' => $query->orderByDesc('rating')->orderByDesc('id'),
            'lowest' => $query->orderBy('rating')->orderByDesc('id'),
            'helpful' => $query->orderByDesc('helpful_count')->orderByDesc('id'),
            default => $query->orderByDesc('created_at')->orderByDesc('id'),
        };

        return ProductReviewResource::collection($query->paginate($filters['per_page'] ?? 5)->withQueryString())
            ->additional(['meta' => ['summary' => $this->reviews->summary($product)]]);
    }

    public function store(StoreProductReviewRequest $request, string $slug): JsonResponse
    {
        $product = $this->product($slug);
        $answer = response()->json([
            'data' => ['status' => 'pending'],
            'message' => 'Thank you. Your review will appear after our team has checked it.',
        ], 201);

        // Bots filling the hidden field get the same answer, but nothing is stored.
        if ($request->isHoneypotFilled()) {
            return $answer;
        }

        $data = $request->validated();
        $this->reviews->submit($product, [
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'rating' => (int) $data['rating'],
            'title' => $data['title'],
            'body' => $data['body'],
            'recommends' => isset($data['recommends']) ? (bool) $data['recommends'] : null,
            'order_number' => $data['order_number'] ?? null,
            'order_email' => $data['order_email'] ?? null,
            'locale' => $data['locale'] ?? $request->getPreferredLanguage(['en', 'ar']) ?? 'en',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $answer;
    }

    public function vote(Request $request, ProductReview $review): ProductReviewResource
    {
        $data = $request->validate([
            'helpful' => ['required', 'boolean'],
            'voter_token' => ['required', 'uuid'],
        ]);
        abort_unless($review->status === ReviewStatus::Approved, 404);

        return new ProductReviewResource(
            $this->reviews->vote($review, (bool) $data['helpful'], $data['voter_token'], $request->ip())
        );
    }

    private function product(string $slug): Product
    {
        return Product::query()->visible()->where('slug', $slug)->firstOrFail();
    }
}
