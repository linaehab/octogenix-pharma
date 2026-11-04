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
  type FeedingStage,
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
 * Home (summary): the age choices link to /jovie/feeding-guide?stage=N.
 * Page: the feeding chart of the Egyptian tins: one card per row of the label's feeding table in a
 * horizontal track, chosen with the weight/age tabs (?stage=N opens on that stage's first row).
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

  protected readonly groups = STAGES.map((stage) => ({
    stage,
    rows: FEEDING_ROWS.filter((row) => row.stage === stage),
  }));

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
  protected readonly selectedStage = computed<FeedingStage>(
    () => FEEDING_ROWS.find((row) => row.id === this.selected())!.stage,
  );

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
    const trackBox = track.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === 'rtl';
    const offset = rtl ? cardBox.right - trackBox.right : cardBox.left - trackBox.left;
    track.scrollBy({ left: offset, behavior });
  }

  private followScroll(): void {
    const track = this.track()?.nativeElement;
    const cards = this.cardElements().map((card) => card.nativeElement);
    if (!track || !cards.length) {
      return;
    }
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
    const rtl = getComputedStyle(track).direction === 'rtl';
    const distance = (card: HTMLElement) => {
      const box = card.getBoundingClientRect();
      return Math.abs(rtl ? box.right - trackBox.right : box.left - trackBox.left);
    };
    const nearest = cards.reduce((best, card) => (distance(card) < distance(best) ? card : best));
    const id = nearest.getAttribute('data-row');
    if (id && id !== this.selected()) {
      this.chosenByScroll = id;
      this.selected.set(id);
    }
  }
}
