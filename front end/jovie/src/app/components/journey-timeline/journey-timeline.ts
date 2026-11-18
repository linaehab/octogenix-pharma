import { Component, computed, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** A year on the path. */
interface Stop {
  year: string;
  title: string;
  text: string;
  /** A year still to come: outlined pin, dashed line leading to it. */
  future: boolean;
  /** Column (1–4) in its row; columns follow the reading direction, so the path mirrors in Arabic. */
  col: number;
  /** Order on narrow screens, where the path becomes one vertical line from the first year. */
  order: number;
  /** The next year is still to come: on narrow screens the line under this year is dashed. */
  leadsFuture: boolean;
  last: boolean;
}

/** A straight part of the line inside a row, in % of the row from its start side. */
interface Segment {
  from: number;
  to: number;
  dashed: boolean;
}

interface Row {
  key: string;
  top: boolean;
  stops: Stop[];
  segments: Segment[];
  /** The bend that carries the line from the row below up into this row. */
  bend: { side: 'start' | 'end'; dashed: boolean } | null;
}

/** The years shown until the dashboard content loads (and if it cannot be loaded). */
const BUNDLED_YEARS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027'];

/** Centre of a column, in % of the row (four equal columns). */
const centre = (col: number) => (col - 0.5) * 25;

/**
 * About page: the company's path since its first year, drawn as in the reference — a lime line
 * winding upwards through rows of four, with a pin over each year. It starts in the bottom row,
 * turns up at the row ends and finishes in the top row, whose free corner holds the heading.
 * Years still to come get an outlined pin on a dashed line.
 *
 * The years are managed in the dashboard (About: our journey, 6 to 12 years). The top row holds
 * the two latest years, the rows below hold four each and the bottom row the rest; with eight
 * years this is the original drawing: 2 + 4 + 2.
 */
@Component({
  selector: 'app-journey-timeline',
  imports: [TranslatePipe],
  templateUrl: './journey-timeline.html',
  styleUrl: './journey-timeline.css',
})
export class JourneyTimeline {
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  /** The years in order, from the dashboard or the bundled texts. */
  private readonly years = computed(() => {
    const thisYear = new Date().getFullYear();
    const remote = this.content.list('about.journey');
    const years = remote
      ? remote.map((item) => ({
          year: item.year ?? '',
          title: this.content.pick(item.title),
          text: this.content.pick(item.description),
        }))
      : BUNDLED_YEARS.map((year) => ({
          year,
          title: this.language.translate(`journey.${year}.title`),
          text: this.language.translate(`journey.${year}.text`),
        }));
    return years.map((stop) => ({ ...stop, future: Number(stop.year) > thisYear }));
  });

  protected readonly rows = computed<Row[]>(() => layout(this.years()));
}

/** Places the years on the winding path and works out the line, solid or dashed, in each row. */
export function layout(years: { year: string; title: string; text: string; future: boolean }[]): Row[] {
  const count = years.length;
  const topCount = Math.min(2, count);
  const below = count - topCount;
  const rowsBelow = Math.ceil(below / 4);
  const bottomCount = below - 4 * Math.max(0, rowsBelow - 1);

  // Rows from the top (index 0). Even rows run towards the start side, odd rows towards the end.
  const sizes = [topCount, ...Array.from({ length: rowsBelow }, (_, i) => (i === rowsBelow - 1 ? bottomCount : 4))];
  const rows: Row[] = sizes.map((_, index) => ({
    key: index === 0 ? 'top' : index === sizes.length - 1 ? 'bottom' : `middle-${index}`,
    top: index === 0,
    stops: [],
    segments: [],
    bend: null,
  }));
  const towardsStart = (row: number) => row % 2 === 0;

  // Columns in path order: the bottom row ends at the side where the line turns up; the top row
  // comes in from the end side.
  const columns = (row: number, size: number): number[] => {
    if (row === 0) return [4, 3, 2, 1].slice(0, size);
    if (towardsStart(row)) return Array.from({ length: size }, (_, i) => size - i);
    return Array.from({ length: size }, (_, i) => 4 - size + 1 + i);
  };

  // The years fill the rows from the bottom up.
  const placed: { row: number; col: number }[] = [];
  for (let row = sizes.length - 1; row >= 0; row--) {
    for (const col of columns(row, sizes[row])) placed.push({ row, col });
  }

  years.forEach((year, index) => {
    const next = years[index + 1];
    rows[placed[index].row].stops.push({
      ...year,
      col: placed[index].col,
      order: index + 1,
      leadsFuture: !!next?.future,
      last: index === count - 1,
    });
  });

  // The line from each year to the next: within a row, or along a row, up a bend and into the next.
  for (let index = 0; index < count - 1; index++) {
    const from = placed[index];
    const to = placed[index + 1];
    const dashed = years[index + 1].future;
    if (from.row === to.row) {
      rows[from.row].segments.push({ from: centre(from.col), to: centre(to.col), dashed });
    } else {
      const edge = towardsStart(from.row) ? 0 : 100;
      rows[from.row].segments.push({ from: centre(from.col), to: edge, dashed });
      rows[to.row].bend = { side: edge === 0 ? 'start' : 'end', dashed };
      rows[to.row].segments.push({ from: edge, to: centre(to.col), dashed });
    }
  }

  for (const row of rows) {
    row.segments = merge(row.segments);
    // In the page the years of a row follow its columns; the path order is kept by `order` (narrow screens).
    row.stops.sort((a, b) => a.col - b.col);
  }
  return rows;
}

/** Joins touching parts of the same kind, so a solid row is drawn as one line. */
function merge(segments: Segment[]): Segment[] {
  const sorted = segments
    .map((s) => ({ from: Math.min(s.from, s.to), to: Math.max(s.from, s.to), dashed: s.dashed }))
    .sort((a, b) => a.from - b.from);
  const merged: Segment[] = [];
  for (const segment of sorted) {
    const previous = merged.at(-1);
    if (previous && previous.dashed === segment.dashed && segment.from <= previous.to) {
      previous.to = Math.max(previous.to, segment.to);
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}
