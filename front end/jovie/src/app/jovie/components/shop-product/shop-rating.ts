import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/** Five stars (partly filled) and the review count; "preview" says the rating is a placeholder. */
@Component({
  selector: 'app-shop-rating',
  imports: [TranslatePipe],
  template: `
    <span class="stars" role="img" [attr.aria-label]="'jovie.shop.ratingLabel' | translate: { rating: average() }">
      @for (fill of stars(); track $index) {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path class="empty" [attr.d]="path" />
          <path [attr.d]="path" [style.clip-path]="'inset(0 ' + (100 - fill * 100) + '% 0 0)'" />
        </svg>
      }
    </span>
    <span>{{ 'jovie.shop.reviews' | translate: { count: count() } }}</span>
    @if (preview()) {
      <small>{{ 'jovie.shop.previewRating' | translate }}</small>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.3rem 0.5rem;
    }

    small {
      color: var(--jv-sweetypie);
      font-weight: 700;
    }

    .stars {
      display: inline-flex;
      gap: 0.1rem;
    }

    svg {
      width: 1.2rem;
      height: 1.2rem;
    }

    path {
      fill: #f6bc25;
    }

    .empty {
      fill: #dfe2ea;
    }

    :host-context([dir='rtl']) .stars {
      transform: scaleX(-1);
    }
  `,
})
export class ShopRating {
  readonly average = input.required<number>();
  readonly count = input.required<number>();
  readonly preview = input(false);

  protected readonly path = 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z';
  protected readonly stars = computed(() =>
    [0, 1, 2, 3, 4].map((index) => Math.min(1, Math.max(0, this.average() - index))),
  );
}
