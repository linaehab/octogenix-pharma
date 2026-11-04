import { Component, computed, input } from '@angular/core';

/** Five stars filled to `value` (0–5), for review summaries and review cards. Decorative: pair it with text. */
@Component({
  selector: 'app-review-stars',
  host: { 'aria-hidden': 'true' },
  template: `
    @for (fill of stars(); track $index) {
      <svg viewBox="0 0 24 24" focusable="false">
        <path class="empty" [attr.d]="path" />
        <path [attr.d]="path" [style.clip-path]="'inset(0 ' + (100 - fill * 100) + '% 0 0)'" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.1rem;
      --size: 1.15rem;
    }

    svg {
      width: var(--size);
      height: var(--size);
    }

    path {
      fill: #f6bc25;
    }

    .empty {
      fill: #dfe2ea;
    }

    :host-context([dir='rtl']) {
      transform: scaleX(-1);
    }
  `,
})
export class ReviewStars {
  readonly value = input.required<number>();

  protected readonly path = 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z';
  protected readonly stars = computed(() => [0, 1, 2, 3, 4].map((i) => Math.min(1, Math.max(0, this.value() - i))));
}
