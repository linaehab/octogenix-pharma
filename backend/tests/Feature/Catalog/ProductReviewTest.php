<?php

namespace Tests\Feature\Catalog;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use Database\Seeders\ReviewTestDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore();
        $this->product = $this->variant(stock: 20, price: 50000)->product;
    }

    private function review(array $overrides = []): array
    {
        return array_replace([
            'name' => 'Mona',
            'email' => 'Mona@Example.com',
            'rating' => 5,
            'title' => 'Gentle on her tummy',
            'body' => 'My daughter drinks it happily and sleeps well after her bottle.',
            'recommends' => true,
            'locale' => 'en',
        ], $overrides);
    }

    private function submit(array $overrides = [])
    {
        return $this->postJson("/api/v1/products/{$this->product->slug}/reviews", $this->review($overrides));
    }

    /** Stores reviews directly, already moderated. */
    private function approved(int $rating, array $attributes = []): ProductReview
    {
        $review = new ProductReview(['author_name' => 'Parent', 'rating' => $rating, 'title' => "Rated {$rating}", 'body' => str_repeat('Good milk. ', 3), 'recommends' => $rating >= 4]);
        $review->forceFill(['product_id' => $this->product->id, 'status' => 'approved', 'locale' => 'en', ...$attributes])->save();

        return $review;
    }

    private function admin(AdminRole $role = AdminRole::StoreManager): static
    {
        return $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();
    }

    public function test_a_submitted_review_is_stored_as_pending_and_not_public(): void
    {
        $this->submit()->assertCreated()->assertJsonPath('data.status', 'pending');

        $review = ProductReview::sole();
        $this->assertSame(['pending', 'Mona', 'mona@example.com', 5, false, true], [
            $review->status->value, $review->author_name, $review->author_email, $review->rating, $review->is_verified_purchase, $review->recommends,
        ]);
        $this->getJson("/api/v1/products/{$this->product->slug}/reviews")->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.summary.count', 0)
            ->assertJsonPath('meta.summary.average', null);
        $this->getJson('/api/v1/products')->assertJsonPath('data.0.rating', null);
    }

    public function test_reviews_are_validated(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->submit(['name' => '', 'rating' => 6, 'title' => 'ab', 'body' => 'short'])
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'rating', 'title', 'body']);
        $this->submit(['body' => 'Lovely milk <script>alert(1)</script> really'])->assertJsonValidationErrors(['body']);
        $this->submit(['order_number' => 'JV-1'])->assertJsonValidationErrors(['order_email']);
        $this->postJson('/api/v1/products/not-a-product/reviews', $this->review())->assertNotFound();
        $this->assertSame(0, ProductReview::count());
    }

    public function test_review_submissions_are_rate_limited(): void
    {
        foreach (range(1, 3) as $i) {
            $this->submit(['title' => "Review number {$i}"])->assertCreated();
        }

        $this->submit()->assertTooManyRequests();
        $this->assertSame(3, ProductReview::count());
    }

    public function test_the_honeypot_answers_like_a_success_but_stores_nothing(): void
    {
        $this->submit(['website' => 'http://spam.example'])->assertCreated();

        $this->assertSame(0, ProductReview::count());
    }

    public function test_a_real_order_with_the_product_makes_a_verified_purchase_once(): void
    {
        $checkout = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->product->variants()->sole()->id => 1]))->assertCreated();
        $number = $checkout->json('data.order_number');

        $this->submit(['order_number' => $number, 'order_email' => 'someone@else.com'])->assertJsonValidationErrors(['order_number']);
        $this->submit(['order_number' => $number, 'order_email' => ' MONA@example.com '])->assertCreated();
        $this->assertTrue(ProductReview::sole()->is_verified_purchase);
        $this->assertSame($number, ProductReview::sole()->order->order_number);

        $this->submit(['order_number' => $number, 'order_email' => 'mona@example.com'])->assertJsonValidationErrors(['order_number']);
        $this->assertSame(1, ProductReview::count());
    }

    public function test_a_cancelled_order_is_not_a_purchase(): void
    {
        $checkout = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->product->variants()->sole()->id => 1]))->assertCreated();
        Order::query()->update(['status' => 'cancelled']);

        $this->submit(['order_number' => $checkout->json('data.order_number'), 'order_email' => 'mona@example.com'])
            ->assertJsonValidationErrors(['order_number']);
    }

    public function test_the_summary_and_product_rating_come_from_approved_reviews_only(): void
    {
        $this->approved(5);
        $this->approved(5);
        $this->approved(4);
        $this->approved(2);
        $this->approved(1, ['status' => 'pending']);
        $this->approved(1, ['status' => 'rejected']);

        $this->getJson("/api/v1/products/{$this->product->slug}/reviews")->assertOk()
            ->assertJsonPath('meta.summary.count', 4)
            ->assertJsonPath('meta.summary.average', 4)
            ->assertJsonPath('meta.summary.distribution', ['5' => 2, '4' => 1, '3' => 0, '2' => 1, '1' => 0])
            ->assertJsonPath('meta.summary.recommend_percent', 75);
        $this->getJson('/api/v1/products')->assertJsonPath('data.0.rating', ['average' => 4, 'count' => 4]);
        $this->getJson("/api/v1/products/{$this->product->slug}")->assertJsonPath('data.rating.count', 4);
    }

    public function test_public_reviews_can_be_sorted_filtered_and_paged_without_private_data(): void
    {
        $old = $this->approved(3, ['created_at' => now()->subDays(3)]);
        $this->approved(5, ['created_at' => now()->subDays(2), 'helpful_count' => 7]);
        $new = $this->approved(1, ['created_at' => now()->subDay(), 'author_email' => 'private@example.com']);

        $url = "/api/v1/products/{$this->product->slug}/reviews";
        $this->assertSame([1, 5, 3], $this->getJson($url)->json('data.*.rating'));
        $this->assertSame([5, 3, 1], $this->getJson("{$url}?sort=highest")->json('data.*.rating'));
        $this->assertSame([1, 3, 5], $this->getJson("{$url}?sort=lowest")->json('data.*.rating'));
        $this->assertSame([5, 1, 3], $this->getJson("{$url}?sort=helpful")->json('data.*.rating'));
        $this->assertSame([$old->id], $this->getJson("{$url}?rating=3")->json('data.*.id'));

        $page = $this->getJson("{$url}?per_page=2&page=2")->assertOk();
        $this->assertSame([$old->id], $page->json('data.*.id'));
        $this->assertSame(3, $page->json('meta.total'));
        $this->assertSame(3, $page->json('meta.summary.count'), 'The summary ignores filters and pages.');

        $first = $this->getJson($url)->json('data.0');
        $this->assertSame($new->id, $first['id']);
        $this->assertArrayNotHasKey('author_email', $first);
        $this->assertArrayNotHasKey('ip_address', $first);
        $this->getJson("{$url}?sort=random")->assertUnprocessable();
    }

    public function test_helpful_votes_count_once_per_browser(): void
    {
        $review = $this->approved(5);
        $token = (string) Str::uuid();

        $this->postJson("/api/v1/reviews/{$review->id}/votes", ['helpful' => true, 'voter_token' => $token])
            ->assertOk()->assertJsonPath('data.helpful_count', 1);
        $this->postJson("/api/v1/reviews/{$review->id}/votes", ['helpful' => false, 'voter_token' => $token])
            ->assertConflict();
        $this->postJson("/api/v1/reviews/{$review->id}/votes", ['helpful' => false, 'voter_token' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('data.not_helpful_count', 1)->assertJsonPath('data.helpful_count', 1);
        $this->postJson("/api/v1/reviews/{$review->id}/votes", ['helpful' => true, 'voter_token' => 'not-a-uuid'])
            ->assertJsonValidationErrors(['voter_token']);

        $pending = $this->approved(4, ['status' => 'pending']);
        $this->postJson("/api/v1/reviews/{$pending->id}/votes", ['helpful' => true, 'voter_token' => $token])->assertNotFound();
        $this->assertSame([1, 1], [$review->refresh()->helpful_count, $review->not_helpful_count]);
    }

    public function test_admins_moderate_reviews_and_approved_ones_become_public(): void
    {
        $this->submit()->assertCreated();
        $this->submit(['name' => 'Ahmed', 'rating' => 3, 'title' => 'Fine milk', 'recommends' => null])->assertCreated();
        [$mona, $ahmed] = ProductReview::orderBy('id')->get()->all();

        $list = $this->admin()->getJson('/api/v1/admin/reviews?status=pending')->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.totals.pending', 2)
            ->assertJsonPath('meta.totals.approved_average', null);
        $this->assertSame('mona@example.com', $list->json('data.1.author_email'));
        $this->assertSame($this->product->slug, $list->json('data.1.product.slug'));

        $this->patchJson("/api/v1/admin/reviews/{$mona->id}", ['status' => 'approved', 'title' => 'Gentle on her tummy!'])
            ->assertOk()->assertJsonPath('data.status', 'approved')->assertJsonPath('data.title', 'Gentle on her tummy!');
        $this->assertNotNull($mona->refresh()->moderated_at);
        $this->assertNotNull($mona->moderated_by_admin_id);
        $this->patchJson("/api/v1/admin/reviews/{$ahmed->id}", ['status' => 'rejected'])->assertOk();
        $this->patchJson("/api/v1/admin/reviews/{$ahmed->id}", ['rating' => 9])->assertJsonValidationErrors(['rating']);

        $this->getJson("/api/v1/products/{$this->product->slug}/reviews")
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Gentle on her tummy!')
            ->assertJsonPath('meta.summary.count', 1)->assertJsonPath('meta.summary.average', 5);
        $this->getJson('/api/v1/admin/reviews')->assertJsonPath('meta.totals', [
            'all' => 2, 'pending' => 0, 'approved' => 1, 'rejected' => 1, 'approved_average' => 5,
        ]);
        $this->getJson('/api/v1/admin/reviews?search=Ahmed')->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/admin/reviews/{$mona->id}")->assertOk()->assertJsonPath('data.author_name', 'Mona');

        $this->deleteJson("/api/v1/admin/reviews/{$mona->id}")->assertNoContent();
        $this->assertSoftDeleted($mona);
        $this->getJson("/api/v1/products/{$this->product->slug}/reviews")->assertJsonPath('meta.summary.count', 0);
    }

    public function test_the_review_test_seeder_runs_only_in_test_mode(): void
    {
        $this->expectException(\RuntimeException::class);

        $this->seed(ReviewTestDataSeeder::class);
    }

    public function test_the_review_test_seeder_creates_marked_reviews_and_replaces_them_on_rerun(): void
    {
        config(['payments.test_mode' => true]);
        $this->product->brand->forceFill(['slug' => 'jovie'])->save(); // the seeder targets Jovie products
        $real = $this->approved(5, ['author_name' => 'Real parent']);

        $this->seed(ReviewTestDataSeeder::class);
        $this->seed(ReviewTestDataSeeder::class);

        $seeded = ProductReview::where('author_email', 'like', '%'.ReviewTestDataSeeder::EMAIL_DOMAIN)->get();
        $this->assertCount(10, $seeded, 'Ten per product, not duplicated by the second run.');
        $this->assertTrue($seeded->every(fn ($r) => str_starts_with($r->title, '[TEST] ')));
        $this->assertSame(['approved' => 8, 'pending' => 1, 'rejected' => 1], $seeded->countBy(fn ($r) => $r->status->value)->sortKeys()->all());
        $this->assertTrue($seeded->every(fn ($r) => $r->votes()->where('is_helpful', true)->count() === $r->helpful_count));

        $this->getJson("/api/v1/products/{$this->product->slug}/reviews")
            ->assertJsonPath('meta.summary.count', 9)
            ->assertJsonPath('meta.total', 9);

        $this->assertSame(10, ReviewTestDataSeeder::remove());
        $this->assertSame([$real->id], ProductReview::pluck('id')->all(), 'Real reviews are never touched.');
        $this->assertSame(0, \App\Models\ProductReviewVote::count());
    }

    public function test_only_admins_with_the_reviews_permission_can_moderate(): void
    {
        $this->submit()->assertCreated();
        $review = ProductReview::sole();

        $this->getJson('/api/v1/admin/reviews')->assertUnauthorized();
        $this->admin(AdminRole::Support)->getJson('/api/v1/admin/reviews')->assertForbidden();
        $this->patchJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])->assertForbidden();
        $this->assertSame('pending', $review->refresh()->status->value);
    }
}
