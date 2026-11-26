import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  FEEDING_CHART_PDF,
  FEEDING_CHART_TEXT,
  FEEDING_ROWS,
  FEEDING_STAGES,
  type FeedingRow,
  dailyAmounts,
  tinsPerMonth,
} from '../../data/feeding-chart';
import { productImage, productLink } from '../../data/products-content';
import { DecorShape } from '../decor-shape/decor-shape';

/** Stage by age, as confirmed by the client. */
const STAGES = [1, 2, 3] as const;
type Stage = (typeof STAGES)[number];

const isStage = (value: number): value is Stage => (STAGES as readonly number[]).includes(value);

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

const span = ([min, max]: readonly [number, number]): string => (min === max ? `${min}` : `${min}–${max}`);

/**
 * Home (summary): the age choices link to /jovieEgypt/feeding-guide?stage=N.
 * Page: the feeding chart of the Egyptian tins: one card per row of the labels' feeding tables in a
 * horizontal track, chosen in one strip of tabs that runs on from Stage 1 (by the baby's weight) to
 * Stage 2 and Stage 3 (by age), as the client asked; ?stage=N opens on that stage's first row.
 */
@Component({
  selector: 'app-feeding-guide',
  imports: [RouterLink, TranslatePipe, DecorShape],
  templateUrl: './feeding-guide.html',
  styleUrl: './feeding-guide.css',
})
export class FeedingGuide {
  private readonly language = inject(LanguageService);

  readonly summary = input(false);

  protected readonly stages = STAGES;
  protected readonly text = computed(() => FEEDING_CHART_TEXT[this.language.currentLanguage()]);
  protected readonly pdf = computed(() => FEEDING_CHART_PDF[this.language.currentLanguage()]);

  /** The tabs in one strip, grouped by stage (a fine divider between the stages). */
  protected readonly groups = STAGES.map((stage) => ({ stage, rows: FEEDING_ROWS.filter((row) => row.stage === stage) }));

  /** Every card, with its values written out in the current language. */
  protected readonly cards = computed(() => {
    const text = this.text();
    return FEEDING_ROWS.map((row) => {
      const daily = dailyAmounts(row);
      const { scoopGrams, slug } = FEEDING_STAGES[row.stage];
      return {
        row,
        title: text.rows[row.id],
        product: text.product[row.stage],
        image: productImage(row.stage, 'front'),
        link: productLink(slug),
        feeds: span(typeof row.feeds === 'number' ? [row.feeds, row.feeds] : row.feeds),
        water: fill(text.units.ml, { value: row.water }),
        scoops: fill(text.units.scoops, { value: row.scoops }),
        scoopWeight: fill(text.units.scoopWeight, { value: scoopGrams }),
        daily: fill(text.units.dailyValue, { water: span(daily.water), scoops: span(daily.scoops) }),
        tins: fill(text.units.tins, { value: span(tinsPerMonth(row)) }),
        shop: fill(text.shop, { product: text.product[row.stage].split(' · ')[0] }),
        note: text.stageNote[row.stage],
      };
    });
  });

  private readonly stageInUrl = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => Number(params.get('stage'))),
      map((stage): Stage => (isStage(stage) ? stage : 1)),
    ),
    { initialValue: 1 as Stage },
  );

  /** The chosen row: the first row of the stage in the URL until a tab is chosen or the cards are swiped. */
  protected readonly selected = linkedSignal<string>(
    () => FEEDING_ROWS.find((row) => row.stage === this.stageInUrl())!.id,
  );

  private readonly tabStrip = viewChild<ElementRef<HTMLElement>>('tabStrip');

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly cardElements = viewChildren<ElementRef<HTMLElement>>('card');
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private firstScroll = true;
  /** A row chosen by swiping is already in place: the track must not be scrolled to it again. */
  private chosenByScroll: string | null = null;

  constructor() {
    // Bring the chosen card to the start of the track (instantly the first time, for ?stage=N).
    effect(() => {
      const id = this.selected();
      if (this.chosenByScroll === id) {
        this.chosenByScroll = null;
        return;
      }
      const card = this.cardElements().find((card) => card.nativeElement.getAttribute('data-row') === id)?.nativeElement;
      if (!card || typeof card.scrollIntoView !== 'function') {
        return;
      }
      untracked(() => this.scrollTo(card));
    });
    // Keep the chosen tab in view in the strip (it scrolls sideways on narrow screens).
    effect(() => {
      const id = this.selected();
      untracked(() => this.revealTab(id));
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.settleTimer));
  }

  protected select(row: FeedingRow): void {
    this.selected.set(row.id);
  }

  /** After a swipe or a scroll settles, the tab follows the card at the start of the track. */
  protected onScroll(): void {
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.followScroll(), 120);
  }

  private scrollTo(card: HTMLElement): void {
    const track = this.track()?.nativeElement;
    if (!track) {
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = this.firstScroll || reduce ? 'instant' : 'smooth';
    this.firstScroll = false;
    const view = this.contentBox(track);
    const cardBox = card.getBoundingClientRect();
    const offset = view.rtl ? cardBox.right - view.right : cardBox.left - view.left;
    track.scrollBy({ left: offset, behavior });
  }

  /** Scrolls the tab strip sideways (never the page) so the chosen tab is fully visible. */
  private revealTab(id: string): void {
    const strip = this.tabStrip()?.nativeElement;
    const tab = strip?.querySelector<HTMLElement>(`[data-row="${id}"]`);
    if (!strip || !tab || typeof strip.scrollBy !== 'function') {
      return;
    }
    const box = strip.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    const margin = 8;
    if (tabBox.left < box.left + margin) {
      strip.scrollBy({ left: tabBox.left - box.left - margin });
    } else if (tabBox.right > box.right - margin) {
      strip.scrollBy({ left: tabBox.right - box.right + margin });
    }
  }

  /** The track's visible area inside its side padding (the gutter before the first card). */
  private contentBox(track: HTMLElement): { left: number; right: number; rtl: boolean } {
    const box = track.getBoundingClientRect();
    const style = getComputedStyle(track);
    return {
      left: box.left + parseFloat(style.paddingLeft || '0'),
      right: box.right - parseFloat(style.paddingRight || '0'),
      rtl: style.direction === 'rtl',
    };
  }

  private followScroll(): void {
    const track = this.track()?.nativeElement;
    const cards = this.cardElements().map((card) => card.nativeElement);
    if (!track || !cards.length) {
      return;
    }
    const view = this.contentBox(track);
    const trackBox = track.getBoundingClientRect();
    const visible = (card: HTMLElement) => {
      const box = card.getBoundingClientRect();
      return box.left >= trackBox.left - 2 && box.right <= trackBox.right + 2;
    };
    const current = cards.find((card) => card.getAttribute('data-row') === this.selected());
    // At the end of the track the last cards can never reach the start: keep a chosen card in full view.
    const atEnd = Math.abs(track.scrollLeft) + track.clientWidth >= track.scrollWidth - 2;
    if (atEnd && current && visible(current)) {
      return;
    }
    const distance = (card: HTMLElement) => {
      const box = card.getBoundingClientRect();
      return Math.abs(view.rtl ? box.right - view.right : box.left - view.left);
    };
    const nearest = cards.reduce((best, card) => (distance(card) < distance(best) ? card : best));
    const id = nearest.getAttribute('data-row');
    if (id && id !== this.selected()) {
      this.chosenByScroll = id;
      this.selected.set(id);
    }
  }
}
