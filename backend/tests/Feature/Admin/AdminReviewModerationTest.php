<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\ReviewStatus;
use App\Models\AdminAuditLog;
use App\Models\AdminNotification;
use App\Models\AdminUser;
use App\Models\Product;
use App\Models\ProductReview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** Review moderation in the dashboard, public visibility of ratings, notifications and audit. */
class AdminReviewModerationTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/admin/reviews';

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->product = Product::factory()->sellable(10, 45000)->create(['name_en' => 'Jovie Stage 1', 'name_ar' => 'جوفي 1']);
    }

    private function review(ReviewStatus $status, int $rating = 5, array $attributes = [], ?Product $product = null): ProductReview
    {
        $review = new ProductReview(['author_name' => 'Mona', 'rating' => $rating, 'title' => 'Lovely milk', 'body' => 'My baby loves it, very gentle.', 'recommends' => true]);
        $review->forceFill(['product_id' => ($product ?? $this->product)->id, 'status' => $status, 'locale' => 'en',
            'author_email' => 'mona@example.com', ...$attributes])->save();

        return $review;
    }

    private function signIn(AdminRole $role = AdminRole::ContentEditor): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    public function test_a_submission_is_pending_and_notifies_review_managers_with_a_link_and_no_personal_details(): void
    {
        $editor = AdminUser::factory()->role(AdminRole::ContentEditor)->create();
        $manager = AdminUser::factory()->role(AdminRole::StoreManager)->create();
        $support = AdminUser::factory()->role(AdminRole::Support)->create();

        $this->postJson("/api/v1/products/{$this->product->slug}/reviews", [
            'name' => 'Secret Parent', 'email' => 'parent@example.com', 'rating' => 4,
            'title' => 'Good for us', 'body' => 'Private words about our baby.', 'recommends' => true,
        ])->assertCreated();
        $review = ProductReview::sole();
        $this->assertSame(ReviewStatus::Pending, $review->status);

        $notes = AdminNotification::where('type', 'reviews.pending')->get();
        $this->assertEqualsCanonicalizing([$editor->id, $manager->id], $notes->pluck('admin_user_id')->all());
        $this->assertNotContains($support->id, $notes->pluck('admin_user_id')->all());
        $this->assertSame("/admin/reviews/{$review->id}", $notes->first()->link);
        $this->assertEqualsCanonicalizing(['review_id' => $review->id, 'name_en' => 'Jovie Stage 1', 'name_ar' => 'جوفي 1', 'rating' => 4], $notes->first()->data);
        foreach (['Secret Parent', 'parent@example.com', 'Private words', 'Good for us'] as $private) {
            $this->assertStringNotContainsString($private, json_encode($notes->pluck('data')));
        }
        $this->assertSame(1, $notes->unique('dedupe_key')->count(), 'One notification per admin and review.');

        // Not public until approved; invalid input is refused.
        $this->getJson("/api/v1/products/{$this->product->slug}/reviews")->assertJsonCount(0, 'data');
        foreach ([['rating' => 6], ['rating' => 0], ['body' => 'short'], ['body' => '<b>Bold</b> text that is long enough']] as $bad) {
            $this->travel(61)->seconds(); // submissions are limited to 3 a minute per address
            $this->postJson("/api/v1/products/{$this->product->slug}/reviews", [
                'name' => 'Ali', 'rating' => 5, 'title' => 'Nice one', 'body' => 'A normal and long enough review.', ...$bad,
            ])->assertUnprocessable();
        }
    }

    public function test_moderation_follows_the_allowed_changes_and_is_audited_without_review_content(): void
    {
        $admin = $this->signIn();
        $review = $this->review(ReviewStatus::Pending);
        $other = $this->review(ReviewStatus::Pending, 2);

        $this->patchJson(self::URL."/{$review->id}", ['status' => 'hidden'])->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->patchJson(self::URL."/{$review->id}", ['status' => 'approved', 'expected_status' => 'pending'])
            ->assertOk()->assertJsonPath('data.status', 'approved');
        $this->assertSame($admin->id, $review->refresh()->moderated_by_admin_id);

        // A screen that still shows "pending" does not overwrite the newer status.
        $this->patchJson(self::URL."/{$review->id}", ['status' => 'rejected', 'expected_status' => 'pending'])
            ->assertStatus(409)->assertJsonPath('current.status', 'approved');
        $this->patchJson(self::URL."/{$review->id}", ['status' => 'rejected'])->assertUnprocessable();
        $this->patchJson(self::URL."/{$review->id}", ['status' => 'pending'])->assertUnprocessable();

        $this->patchJson(self::URL."/{$review->id}", ['status' => 'hidden', 'expected_status' => 'approved'])->assertOk()->assertJsonPath('data.status', 'hidden');
        $this->patchJson(self::URL."/{$review->id}", ['status' => 'approved', 'expected_status' => 'hidden'])->assertOk()->assertJsonPath('data.status', 'approved');
        $this->patchJson(self::URL."/{$other->id}", ['status' => 'rejected'])->assertOk();
        $this->patchJson(self::URL."/{$other->id}", ['status' => 'approved'])->assertUnprocessable();

        $logs = AdminAuditLog::orderBy('id')->get();
        $this->assertSame(['reviews.approved', 'reviews.hidden', 'reviews.restored', 'reviews.rejected'], $logs->pluck('action')->all());
        $this->assertEquals(['status' => ['from' => 'approved', 'to' => 'hidden'], 'product_id' => ['from' => null, 'to' => $this->product->id]], $logs[1]->changes);
        $this->assertSame(['review', (string) $review->id, $admin->id], [$logs[1]->subject_type, $logs[1]->subject_id, $logs[1]->admin_user_id]);
        $everything = json_encode($logs->toArray());
        foreach (['Mona', 'mona@example.com', 'Lovely milk', 'very gentle'] as $private) {
            $this->assertStringNotContainsString($private, $everything);
        }
        $this->assertSame('My baby loves it, very gentle.', $review->refresh()->body, 'The original text is kept.');
    }

    public function test_only_approved_reviews_are_public_and_ratings_follow_moderation(): void
    {
        $approved5 = $this->review(ReviewStatus::Approved, 5);
        $this->review(ReviewStatus::Approved, 3);
        $this->review(ReviewStatus::Pending, 1, ['title' => 'Pending one']);
        $this->review(ReviewStatus::Rejected, 1, ['title' => 'Rejected one']);
        $this->review(ReviewStatus::Hidden, 1, ['title' => 'Hidden one']);
        $empty = Product::factory()->sellable()->create();
        $this->review(ReviewStatus::Pending, 5, [], $empty);

        $slug = $this->product->slug;
        $public = $this->getJson("/api/v1/products/{$slug}/reviews")->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.summary.count', 2)
            ->assertJsonPath('meta.summary.average', 4);
        $this->assertEqualsCanonicalizing(['Lovely milk', 'Lovely milk'], array_column($public->json('data'), 'title'));
        $this->assertStringNotContainsString('Pending one', $public->getContent());
        $this->assertStringNotContainsString('mona@example.com', $public->getContent());
        $this->assertArrayNotHasKey('status', $public->json('data.0'));

        $this->getJson("/api/v1/products/{$slug}")->assertJsonPath('data.rating', ['average' => 4, 'count' => 2]);
        $this->getJson("/api/v1/products/{$empty->slug}")->assertJsonPath('data.rating', null);
        $this->getJson("/api/v1/products/{$empty->slug}/reviews")->assertJsonPath('meta.summary.average', null);
        $listed = collect($this->getJson('/api/v1/products')->json('data'))->keyBy('slug');
        $this->assertSame(['average' => 4, 'count' => 2], $listed[$slug]['rating']);
        $this->assertNull($listed[$empty->slug]['rating']);

        // Hiding the 5-star review changes the public figures at once; restoring brings them back.
        $this->signIn();
        $this->patchJson(self::URL."/{$approved5->id}", ['status' => 'hidden'])->assertOk();
        $this->getJson("/api/v1/products/{$slug}")->assertJsonPath('data.rating', ['average' => 3, 'count' => 1]);
        $this->postJson("/api/v1/reviews/{$approved5->id}/votes", ['helpful' => true, 'voter_token' => '7d4e9c62-2f3a-4c1b-9d3e-1a2b3c4d5e6f'])->assertNotFound();
        $this->patchJson(self::URL."/{$approved5->id}", ['status' => 'approved'])->assertOk();
        $this->getJson("/api/v1/products/{$slug}/reviews")->assertJsonPath('meta.summary.count', 2);
    }

    public function test_the_dashboard_list_is_short_filtered_sorted_and_paged_on_the_server(): void
    {
        $this->signIn(AdminRole::StoreManager);
        $other = Product::factory()->sellable()->create(['name_en' => 'Jovie Stage 3', 'name_ar' => 'جوفي 3']);
        Carbon::setTestNow('2026-11-01 10:00:00');
        $old = $this->review(ReviewStatus::Approved, 2, ['body' => str_repeat('Very long review text. ', 20)]);
        Carbon::setTestNow('2026-11-06 10:00:00');
        $mid = $this->review(ReviewStatus::Pending, 4, ['author_name' => 'Ahmed'], $other);
        Carbon::setTestNow('2026-11-08 10:00:00');
        $new = $this->review(ReviewStatus::Hidden, 5);
        Carbon::setTestNow();

        $list = $this->getJson(self::URL.'?summary=1&per_page=2')->assertOk()
            ->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.0.id', $new->id)
            ->assertJsonPath('meta.totals.hidden', 1);
        $row = $list->json('data.0');
        $this->assertArrayNotHasKey('author_email', $row);
        $this->assertArrayNotHasKey('body', $row);
        $this->assertSame('Jovie Stage 1', $row['product']['name']['en']);
        $this->assertEqualsCanonicalizing([$this->product->id, $other->id], array_column($list->json('meta.products'), 'id'));

        $oldest = $this->getJson(self::URL.'?summary=1&sort=oldest')->json('data.0');
        $this->assertSame($old->id, $oldest['id']);
        $this->assertLessThanOrEqual(143, mb_strlen($oldest['preview']));

        $this->getJson(self::URL.'?summary=1&search=stage 3')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mid->id);
        $this->getJson(self::URL.'?summary=1&search=ahmed')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mid->id);
        $this->getJson(self::URL."?summary=1&product_id={$other->id}")->assertJsonCount(1, 'data');
        $this->getJson(self::URL.'?summary=1&rating=2')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $old->id);
        $this->getJson(self::URL.'?summary=1&status=hidden')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $new->id);
        $this->getJson(self::URL.'?summary=1&from=2026-11-06&to=2026-11-06')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mid->id);
        $this->getJson(self::URL.'?from=2026-11-08&to=2026-11-01')->assertUnprocessable();
        $this->getJson(self::URL.'?status=gone')->assertUnprocessable();
        $this->getJson(self::URL.'?sort=random')->assertUnprocessable();

        $this->getJson(self::URL."/{$old->id}")->assertOk()->assertJsonPath('data.author_email', 'mona@example.com');
    }

    public function test_review_endpoints_need_the_reviews_permission(): void
    {
        $review = $this->review(ReviewStatus::Pending);

        $this->getJson(self::URL)->assertUnauthorized();
        $this->getJson(self::URL."/{$review->id}")->assertUnauthorized();
        $this->patchJson(self::URL."/{$review->id}", ['status' => 'approved'])->assertUnauthorized();

        $this->signIn(AdminRole::Support);
        $this->getJson(self::URL)->assertForbidden();
        $this->getJson(self::URL."/{$review->id}")->assertForbidden();
        $this->patchJson(self::URL."/{$review->id}", ['status' => 'approved'])->assertForbidden();

        $this->signIn();
        $this->patchJson(self::URL."/{$review->id}", ['status' => 'published'])->assertUnprocessable();
        $this->patchJson(self::URL."/{$review->id}", ['expected_status' => 'published'])->assertUnprocessable();
        $this->getJson(self::URL.'/999999')->assertNotFound();
        $this->assertSame(ReviewStatus::Pending, $review->refresh()->status);
    }
}
