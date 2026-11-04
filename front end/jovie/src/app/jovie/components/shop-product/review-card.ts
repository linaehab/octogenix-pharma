import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Review, ReviewsService } from '../../store/reviews.service';
import { ReviewStars } from './review-stars';

const SHORT = 280;

/** One approved review: stars, title, comment (Read more), name, date, badges and "Was this helpful?". */
@Component({
  selector: 'app-review-card',
  imports: [TranslatePipe, ReviewStars],
  template: `
    @let r = review();
    <article [attr.aria-labelledby]="'review-' + r.id">
      <header>
        <app-review-stars [value]="r.rating" />
        <span class="visually-hidden">{{ 'jovie.shop.ratingLabel' | translate: { rating: r.rating } }}</span>
        <time [attr.datetime]="r.created_at">{{ date() }}</time>
      </header>
      <h3 [id]="'review-' + r.id" dir="auto">{{ r.title }}</h3>
      <p class="body" dir="auto">{{ expanded() || !isLong() ? r.body : r.body.slice(0, short) + '…' }}</p>
      @if (isLong()) {
        <button type="button" class="link" [attr.aria-expanded]="expanded()" (click)="expanded.set(!expanded())">
          {{ (expanded() ? 'jovie.reviews.readLess' : 'jovie.reviews.readMore') | translate }}
        </button>
      }
      <p class="author">
        <strong dir="auto">{{ r.author_name }}</strong>
        @if (r.is_verified_purchase) {
          <span class="badge verified">✓ {{ 'jovie.reviews.verified' | translate }}</span>
        }
        @if (r.recommends === true) {
          <span class="badge">{{ 'jovie.reviews.recommends' | translate }}</span>
        }
      </p>
      <footer>
        <span>{{ 'jovie.reviews.helpful' | translate }}</span>
        <button type="button" [disabled]="!!voted() || voting()" [attr.aria-pressed]="voted() === 'yes'" (click)="vote(true)">
          {{ 'jovie.reviews.yes' | translate }} ({{ counts().yes }})
        </button>
        <button type="button" [disabled]="!!voted() || voting()" [attr.aria-pressed]="voted() === 'no'" (click)="vote(false)">
          {{ 'jovie.reviews.no' | translate }} ({{ counts().no }})
        </button>
        <span class="vote-status" role="status" [class.warn]="message() === 'jovie.reviews.voteError'">
          @if (message(); as m) {
            {{ m | translate }}
          }
        </span>
      </footer>
    </article>
  `,
  styles: `
    :host {
      display: block;
      padding-block: 1.5rem;
      border-bottom: 1px solid rgba(32, 53, 100, 0.15);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    time {
      font-size: 0.9rem;
      opacity: 0.8;
    }

    h3 {
      margin: 0.6rem 0 0.4rem;
      font-size: 1.1rem;
    }

    h3,
    .body {
      text-align: start;
    }

    .body {
      margin: 0;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    .link {
      margin-top: 0.3rem;
      padding: 0;
      border: 0;
      background: none;
      color: var(--jv-night);
      font: inherit;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
    }

    .author {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.75rem;
      margin: 0.8rem 0;
    }

    .badge {
      padding: 0.15rem 0.6rem;
      border-radius: 999px;
      background: var(--jv-panel);
      font-size: 0.82rem;
    }

    .verified {
      background: #e2f4ee;
      color: #11795f;
      font-weight: 700;
    }

    footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.92rem;
    }

    footer button {
      min-height: 2.25rem;
      padding: 0.2rem 0.85rem;
      border: 1px solid rgba(32, 53, 100, 0.35);
      border-radius: 999px;
      background: var(--jv-white);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    footer button[aria-pressed='true'] {
      border-color: var(--jv-night);
      background: var(--jv-night);
      color: var(--jv-white);
    }

    footer button:disabled:not([aria-pressed='true']) {
      opacity: 0.55;
      cursor: default;
    }

    .vote-status {
      color: #11795f;
      font-weight: 700;
    }

    .vote-status.warn {
      color: var(--jv-sweetypie);
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  `,
})
export class ReviewCard {
  private readonly reviews = inject(ReviewsService);
  private readonly language = inject(LanguageService);

  readonly review = input.required<Review>();

  protected readonly short = SHORT;
  protected readonly expanded = signal(false);
  protected readonly voting = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly isLong = computed(() => this.review().body.length > SHORT + 40);
  protected readonly voted = linkedSignal(() => this.reviews.votedOn(this.review().id));
  protected readonly counts = linkedSignal(() => ({ yes: this.review().helpful_count, no: this.review().not_helpful_count }));
  protected readonly date = computed(() =>
    new Intl.DateTimeFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'long' }).format(
      new Date(this.review().created_at),
    ),
  );

  protected vote(helpful: boolean): void {
    this.voting.set(true);
    this.message.set(null);
    this.reviews.vote(this.review(), helpful).subscribe({
      next: (updated) => {
        this.counts.set({ yes: updated.helpful_count, no: updated.not_helpful_count });
        this.voted.set(helpful ? 'yes' : 'no');
        this.voting.set(false);
        this.message.set('jovie.reviews.thanksVote');
      },
      error: (error: unknown) => {
        this.voting.set(false);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.voted.set(helpful ? 'yes' : 'no');
          this.message.set('jovie.reviews.alreadyVoted');
        } else {
          this.message.set('jovie.reviews.voteError');
        }
      },
    });
  }
}
