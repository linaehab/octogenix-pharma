import { Component, PLATFORM_ID, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Review, ReviewSort, ReviewSummary, ReviewsService } from '../../store/reviews.service';
import { ReviewCard } from './review-card';
import { ReviewForm } from './review-form';
import { ReviewStars } from './review-stars';

/**
 * Customer reviews of the shop product page (kabrita.com order): the average, count, star
 * distribution and recommendation rate of approved reviews, Write a review, sorting, star
 * filters and Load more. Everything comes from GET /api/v1/products/{slug}/reviews.
 */
@Component({
  selector: 'app-shop-reviews',
  imports: [TranslatePipe, ReviewCard, ReviewForm, ReviewStars],
  templateUrl: './shop-reviews.html',
  styleUrl: './shop-reviews.css',
})
export class ShopReviews {
  private readonly service = inject(ReviewsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly slug = input.required<string>();
  readonly productName = input('');

  private readonly form = viewChild.required(ReviewForm);

  protected readonly sorts: ReviewSort[] = ['newest', 'highest', 'lowest', 'helpful'];
  protected readonly levels = [5, 4, 3, 2, 1] as const;

  protected readonly sort = signal<ReviewSort>('newest');
  protected readonly rating = signal<number | null>(null);
  protected readonly reviews = signal<Review[]>([]);
  protected readonly summary = signal<ReviewSummary | null>(null);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly lastPage = signal(1);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadingMore = signal(false);

  protected readonly bars = computed(() => {
    const summary = this.summary();
    return this.levels.map((level) => {
      const count = summary?.distribution[`${level}`] ?? 0;
      return { level, count, percent: summary?.count ? Math.round((count * 100) / summary.count) : 0 };
    });
  });

  constructor() {
    // A new product, sort or star filter starts again from page 1.
    effect(() => {
      const slug = this.slug();
      const sort = this.sort();
      const rating = this.rating();
      if (this.isBrowser) {
        untracked(() => this.load(slug, sort, rating, 1));
      }
    });
  }

  protected write(): void {
    this.form().open();
  }

  protected filter(level: number | null): void {
    this.rating.set(this.rating() === level ? null : level);
  }

  protected changeSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as ReviewSort);
  }

  protected retry(): void {
    this.load(this.slug(), this.sort(), this.rating(), 1);
  }

  protected more(): void {
    this.load(this.slug(), this.sort(), this.rating(), this.page() + 1);
  }

  private load(slug: string, sort: ReviewSort, rating: number | null, page: number): void {
    if (page === 1) {
      this.state.set('loading');
    } else {
      this.loadingMore.set(true);
    }
    this.service.list(slug, sort, rating, page).subscribe({
      next: (result) => {
        this.reviews.set(page === 1 ? result.reviews : [...this.reviews(), ...result.reviews]);
        this.summary.set(result.summary);
        this.total.set(result.total);
        this.page.set(result.page);
        this.lastPage.set(result.lastPage);
        this.state.set('ready');
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
        if (page === 1) {
          this.state.set('error');
        }
      },
    });
  }
}
