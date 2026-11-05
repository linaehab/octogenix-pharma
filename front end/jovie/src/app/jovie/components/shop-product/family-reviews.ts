import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { FAMILY_REVIEWS, FAMILY_REVIEWS_TITLE, FAMILY_REVIEWS_UI, FamilyReview, familyExcerpt } from '../../data/family-reviews';

/** Card colours of the official section, in order: yellow, sky blue, green. */
const TONES = ['yellow', 'sky', 'green'] as const;

/**
 * Yellow, sky blue, green in turn. The carousel is endless, so the last card sits next to the first:
 * with 7 cards both would be yellow, so the last card takes the colour neither neighbour has.
 */
function toneOf(index: number, count: number): (typeof TONES)[number] {
  const tone = TONES[index % TONES.length];
  if (index !== count - 1 || tone !== TONES[0]) {
    return tone;
  }
  const previous = TONES[(index - 1) % TONES.length];
  return TONES.find((t) => t !== previous && t !== TONES[0])!;
}

interface Slide {
  review: FamilyReview;
  index: number;
  tone: (typeof TONES)[number];
  /** Copies before and after the real cards make the carousel endless, like the official one. */
  clone: boolean;
  key: string;
}

/**
 * "Welcome to our Jovie family!" — the parents' testimonials carousel of the official Jovie home
 * page, rebuilt for the shop product page: 3 cards with arrows on desktop, 2¼ on tablets and 1½
 * (centred) on phones with a progress bar, endless in both directions, and "Read more" opening
 * the whole testimonial. A native scroll track (touch, trackpad and keyboard scrolling, right to
 * left in Arabic) with one copy of the cards on each side: when a copy settles in view, the track
 * jumps to the same card of the real set without animation.
 */
@Component({
  selector: 'app-family-reviews',
  templateUrl: './family-reviews.html',
  styleUrl: './family-reviews.css',
})
export class FamilyReviews {
  private readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly count = FAMILY_REVIEWS.length;
  protected readonly lang = this.language.currentLanguage;
  protected readonly title = computed(() => FAMILY_REVIEWS_TITLE[this.lang()]);
  protected readonly ui = computed(() => FAMILY_REVIEWS_UI[this.lang()]);
  protected readonly slides: Slide[] = [0, 1, 2].flatMap((set) =>
    FAMILY_REVIEWS.map((review, index) => ({
      review,
      index,
      tone: toneOf(index, FAMILY_REVIEWS.length),
      clone: set !== 1,
      key: `${set}-${review.id}`,
    })),
  );

  /** Testimonials opened with "Read more" (a card and its copies open together). */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  /** Position of the progress bar's thumb, 0–1, and its width (share of the set in view). */
  protected readonly progress = signal(0);
  protected readonly thumb = signal(1 / 3);
  protected readonly thumbStart = computed(() => this.progress() * (1 - this.thumb()) * 100);
  /** The official arrow (pointing right; the "previous" one is turned round in CSS). */
  protected readonly arrow =
    'M33.02.96c-.43-.42-.91-.87-1.36-.95-.33-.05-.54.11-.74.27-2.81 2.32-5.63 4.63-8.44 6.95-5.02 4.13-10.04 8.27-15.06 12.4-1.26 1.03-2.48 2.11-3.77 3.1-.84.64-2.04.86-2.85 1.52-2.17 1.77.47 5.65 2.99 8.6 15.18 17.76 32.39 39.29 47.74 56.93 3.16 3.63 6.37 7.22 9.61 10.78-21.86 19.63-47.97 43.41-59.01 54.63-.42.42-.87.91-.95 1.36-.06.33.11.54.27.74 2.32 2.81 4.63 5.63 6.95 8.44 4.13 5.02 8.27 10.04 12.4 15.06 1.03 1.26 2.11 2.48 3.1 3.77.64.84.86 2.04 1.52 2.85 1.77 2.17 5.65-.47 8.6-2.99 17.76-15.18 34.85-27.77 52.48-43.11 13.85-12.06 27.12-24.78 40.37-37.49-1.21-1.5-29.92-34.4-30.26-34.37';

  private settleTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.toRealSet();
      this.measure();
      const track = this.track().nativeElement;
      const onScroll = () => this.onScroll();
      const onResize = () => {
        this.toRealSet();
        this.measure();
      };
      track.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      destroyRef.onDestroy(() => {
        track.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        clearTimeout(this.settleTimer);
      });
    });
  }

  protected text(review: FamilyReview): string {
    return review.text[this.lang()];
  }

  protected excerpt(review: FamilyReview): string {
    return familyExcerpt(review.text[this.lang()], this.lang());
  }

  protected slideLabel(index: number): string {
    return this.ui().slide.replace('{index}', String(index + 1)).replace('{count}', String(this.count));
  }

  /** Opens the whole testimonial; focus moves to it, as the button goes away. */
  protected readMore(review: FamilyReview, event: Event): void {
    const card = (event.target as HTMLElement).closest('.card');
    this.expanded.update((ids) => new Set(ids).add(review.id));
    afterNextRender(() => card?.querySelector<HTMLElement>('.long')?.focus({ preventScroll: true }), {
      injector: this.injector,
    });
  }

  /** One card further (+1) or back (-1); past the last card the first one follows. */
  protected step(direction: 1 | -1): void {
    const track = this.track().nativeElement;
    const slides = this.slideElements();
    const current = this.nearest(slides);
    const target = slides[current + direction];
    if (!target) {
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: this.delta(slides[current], target), behavior: reduce ? 'instant' : 'smooth' });
  }

  private onScroll(): void {
    this.measure();
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.wrap(), 140);
  }

  /** A copy settled in view: show the same card of the real set instead (no visible change). */
  private wrap(): void {
    const slides = this.slideElements();
    const current = this.nearest(slides);
    const shift = current < this.count ? this.count : current >= 2 * this.count ? -this.count : 0;
    if (shift) {
      this.track().nativeElement.scrollBy({ left: this.delta(slides[current], slides[current + shift]), behavior: 'instant' });
    }
  }

  /** Starts on the first real card (and keeps the same card in view after a resize). */
  private toRealSet(): void {
    const slides = this.slideElements();
    const current = this.nearest(slides);
    const real = current % this.count;
    const target = slides[this.count + real];
    this.track().nativeElement.scrollBy({ left: this.delta(slides[current], target), behavior: 'instant' });
  }

  /** Progress bar: where the view is within one set of cards, and how much of the set it shows. */
  private measure(): void {
    const track = this.track().nativeElement;
    const slides = this.slideElements();
    const first = slides[this.count].getBoundingClientRect();
    const copy = slides[2 * this.count].getBoundingClientRect();
    const setWidth = Math.abs(copy.left - first.left);
    if (!setWidth) {
      return;
    }
    const box = track.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === 'rtl';
    // Measured at the snap position, so the first card in its place reads 0 (centred on phones).
    const centred = getComputedStyle(slides[0]).scrollSnapAlign.includes('center');
    const distance = centred
      ? (rtl ? -1 : 1) * (box.left + box.width / 2 - (first.left + first.width / 2))
      : rtl
        ? first.right - box.right
        : box.left - first.left;
    this.thumb.set(Math.min(1, box.width / setWidth));
    this.progress.set((((distance % setWidth) + setWidth) % setWidth) / setWidth);
  }

  private slideElements(): HTMLElement[] {
    return [...this.track().nativeElement.querySelectorAll<HTMLElement>(':scope > .slide')];
  }

  /** The card at the snap position: the start edge on wide screens, the centre on phones. */
  private nearest(slides: HTMLElement[]): number {
    const track = this.track().nativeElement;
    const box = track.getBoundingClientRect();
    const style = getComputedStyle(track);
    const rtl = style.direction === 'rtl';
    const centred = getComputedStyle(slides[0]).scrollSnapAlign.includes('center');
    const anchor = centred ? box.left + box.width / 2 : rtl ? box.right : box.left;
    let best = 0;
    let bestDistance = Infinity;
    slides.forEach((slide, i) => {
      const r = slide.getBoundingClientRect();
      const point = centred ? r.left + r.width / 2 : rtl ? r.right : r.left;
      const distance = Math.abs(point - anchor);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  /** How far to scroll so `to` takes the place of `from` (works left to right and right to left). */
  private delta(from: HTMLElement, to: HTMLElement): number {
    return to.getBoundingClientRect().left - from.getBoundingClientRect().left;
  }
}
