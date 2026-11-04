<?php

namespace Database\Seeders;

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductReviewVote;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * TEST MODE reviews for trying the Reviews section and its moderation on a DEVELOPMENT database:
 *
 *     php artisan db:seed --class=ReviewTestDataSeeder
 *
 * Remove them again with:
 *
 *     php artisan tinker --execute="Database\Seeders\ReviewTestDataSeeder::remove();"
 *
 * Not part of DatabaseSeeder. Refuses to run in production or without STORE_TEST_MODE=true.
 * These are NOT customer reviews: every title starts with "[TEST]", every author is "Test
 * reviewer N" and every email ends with @reviews.seed.test, which is also how they are found
 * again. Running the seeder twice replaces the previous test reviews; real reviews are never
 * touched. Per active Jovie product: approved reviews with different ratings, dates, a long one
 * (Read more) and helpful votes, plus one pending and one rejected review for moderation.
 */
class ReviewTestDataSeeder extends Seeder
{
    public const EMAIL_DOMAIN = '@reviews.seed.test';

    /** [rating, status, recommends, days ago, helpful votes, not helpful votes, text key] */
    private const REVIEWS = [
        [5, 'approved', true, 2, 4, 0, 'taste'],
        [5, 'approved', true, 6, 2, 1, 'long'],
        [4, 'approved', true, 11, 1, 0, 'prepare'],
        [4, 'approved', true, 18, 0, 0, 'tin'],
        [3, 'approved', null, 25, 1, 1, 'okay'],
        [5, 'approved', true, 33, 3, 0, 'arabic'],
        [2, 'approved', false, 41, 0, 2, 'delivery'],
        [5, 'approved', true, 52, 0, 0, 'arabicShort'],
        [4, 'pending', true, 0, 0, 0, 'pending'],
        [1, 'rejected', false, 3, 0, 0, 'rejected'],
    ];

    /** Test texts only: no health or nutrition claims. */
    private const TEXTS = [
        'taste' => ['en', 'Our little one likes it', 'We switched a few weeks ago and our baby drinks the bottle happily.'],
        'long' => ['en', 'Long test review for Read more', 'This is a longer test review written to check the Read more and Read less buttons on the product page. We prepare the bottle in the morning and in the evening, following the table on the tin. The scoop sits well in the tin, the powder dissolves quickly when you shake the bottle, and cleaning up afterwards is easy. The tin closes well with the plastic cap, which matters to us because we travel a lot with the baby bag. Delivery to our governorate was simple and the tin arrived well packed.'],
        'prepare' => ['en', 'Easy to prepare', 'The powder dissolves quickly and the instructions on the tin are clear.'],
        'tin' => ['en', 'Practical tin', 'The scoop and the cap are practical. I would like a bigger tin as well.'],
        'okay' => ['en', 'Fine for us', 'It works for us, but it took a few days for our baby to get used to it.'],
        'arabic' => ['ar', 'طفلتي تحبه', 'بدأنا استخدامه منذ شهر وطفلتي تشرب الرضعة بسهولة. التحضير سهل والعلبة عملية.'],
        'delivery' => ['en', 'Delivery took longer', 'The product is fine, but the delivery took longer than we expected.'],
        'arabicShort' => ['ar', 'سهل التحضير', 'المسحوق يذوب بسرعة وتعليمات العلبة واضحة.'],
        'pending' => ['en', 'Waiting for approval', 'This test review stays pending so the moderation can be tried.'],
        'rejected' => ['en', 'Rejected test review', 'This test review is rejected and must never appear on the product page.'],
    ];

    public function run(): void
    {
        if (app()->isProduction() || ! config('payments.test_mode')) {
            throw new RuntimeException('ReviewTestDataSeeder runs only with STORE_TEST_MODE=true outside production.');
        }

        $products = Product::query()->visible()
            ->whereHas('brand', fn ($q) => $q->where('slug', 'jovie'))->orderBy('id')->get();

        DB::transaction(function () use ($products) {
            self::remove();
            $n = 0;
            foreach ($products as $product) {
                foreach (self::REVIEWS as [$rating, $status, $recommends, $daysAgo, $helpful, $notHelpful, $text]) {
                    $n++;
                    [$locale, $title, $body] = self::TEXTS[$text];
                    $review = new ProductReview([
                        'author_name' => "Test reviewer {$n}",
                        'rating' => $rating,
                        'title' => "[TEST] {$title}",
                        'body' => $body,
                        'recommends' => $recommends,
                    ]);
                    $created = now()->subDays($daysAgo)->subMinutes($n);
                    $review->forceFill([
                        'product_id' => $product->id,
                        'author_email' => "test-reviewer-{$n}".self::EMAIL_DOMAIN,
                        'status' => ReviewStatus::from($status),
                        'locale' => $locale,
                        'helpful_count' => $helpful,
                        'not_helpful_count' => $notHelpful,
                        'moderated_at' => $status === 'pending' ? null : $created->copy()->addHour(),
                        'created_at' => $created,
                        'updated_at' => $created,
                    ])->save();

                    // Vote rows behind the counters, so the counters stay consistent.
                    foreach ([[true, $helpful], [false, $notHelpful]] as [$isHelpful, $count]) {
                        for ($v = 0; $v < $count; $v++) {
                            ProductReviewVote::query()->create([
                                'product_review_id' => $review->id,
                                'voter_hash' => hash('sha256', "review-seed|{$review->id}|".($isHelpful ? 'yes' : 'no')."|{$v}"),
                                'ip_hash' => hash('sha256', 'review-seed'),
                                'is_helpful' => $isHelpful,
                            ]);
                        }
                    }
                }
            }
        });

        $this->command?->info('TEST reviews ready: '.count(self::REVIEWS).' per active Jovie product ('.$products->count().' products).');
    }

    /** Deletes the test reviews (and their votes); real reviews are not touched. Returns how many. */
    public static function remove(): int
    {
        return ProductReview::withTrashed()->where('author_email', 'like', '%'.self::EMAIL_DOMAIN)->get()
            ->each(fn (ProductReview $review) => $review->forceDelete())
            ->count();
    }
}
