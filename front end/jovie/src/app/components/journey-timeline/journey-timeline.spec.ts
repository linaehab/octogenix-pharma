import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SiteContentService } from '../../core/content/site-content.service';
import { ContentListItem } from '../../core/content/site-content.models';
import { LanguageService } from '../../core/i18n/language.service';
import { JourneyTimeline, layout } from './journey-timeline';

const years = (from: number, count: number, futureFrom = Infinity) =>
  Array.from({ length: count }, (_, i) => ({ year: String(from + i), title: `T${from + i}`, text: '', future: from + i >= futureFrom }));

/** Rows from the top as "year@column" in page order, and each row's line as from-to(dashed). */
const summary = (count: number, futureFrom = Infinity) =>
  layout(years(2020, count, futureFrom)).map((row) => ({
    stops: row.stops.map((s) => `${s.year}@${s.col}`).join(' '),
    line: row.segments.map((s) => `${s.from}-${s.to}${s.dashed ? 'd' : ''}`).join(' '),
    bend: row.bend ? `${row.bend.side}${row.bend.dashed ? 'd' : ''}` : '',
  }));

describe('Journey path', () => {
  it('draws eight years exactly as the original design: 2 + 4 + 2', () => {
    expect(summary(8, 2027)).toEqual([
      { stops: '2027@3 2026@4', line: '62.5-87.5d 87.5-100', bend: 'end' },
      { stops: '2022@1 2023@2 2024@3 2025@4', line: '0-100', bend: 'start' },
      { stops: '2021@1 2020@2', line: '0-37.5', bend: '' },
    ]);
  });

  it('spreads 6 to 12 years over rows of four, two in the top row, without gaps or overlaps', () => {
    const expected: Record<number, number[]> = { 6: [2, 4], 7: [2, 4, 1], 8: [2, 4, 2], 9: [2, 4, 3], 10: [2, 4, 4], 11: [2, 4, 4, 1], 12: [2, 4, 4, 2] };
    for (let count = 6; count <= 12; count++) {
      const rows = layout(years(2020, count));
      expect(rows.map((r) => r.stops.length)).withContext(`${count} years`).toEqual(expected[count]);
      // Every year once, in path order, and never two years in one column of a row.
      expect(rows.flatMap((r) => r.stops).map((s) => s.order).sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
      for (const row of rows) {
        expect(new Set(row.stops.map((s) => s.col)).size).withContext(`${count} years`).toBe(row.stops.length);
      }
      // The top row keeps columns 1–2 free for the heading.
      expect(rows[0].stops.every((s) => s.col >= 3)).toBeTrue();
      // Each row below the top is joined to the row above by one bend.
      expect(rows.slice(0, -1).every((r) => r.bend !== null)).withContext(`${count} years`).toBeTrue();
      expect(rows.at(-1)!.bend).toBeNull();
    }
  });

  it('turns at alternate ends and starts the path in the bottom row', () => {
    // 11 years: bottom row 2020 (towards the end), 2021–2024 back towards the start, 2025–2028, top 2029–2030.
    expect(summary(11)).toEqual([
      { stops: '2030@3 2029@4', line: '62.5-100', bend: 'end' },
      { stops: '2025@1 2026@2 2027@3 2028@4', line: '0-100', bend: 'start' },
      { stops: '2024@1 2023@2 2022@3 2021@4', line: '0-100', bend: 'end' },
      { stops: '2020@4', line: '87.5-100', bend: '' },
    ]);
  });

  it('dashes the line, and the bend, that lead to years still to come', () => {
    const rows = summary(8, 2026);
    expect(rows[0]).toEqual({ stops: '2027@3 2026@4', line: '62.5-100d', bend: 'endd' });
    expect(rows[1].line).toBe('0-87.5 87.5-100d');
  });

  it('marks the year before a coming year and the last year for the narrow-screen line', () => {
    const stops = layout(years(2020, 8, 2027)).flatMap((r) => r.stops);
    expect(stops.filter((s) => s.leadsFuture).map((s) => s.year)).toEqual(['2026']);
    expect(stops.filter((s) => s.last).map((s) => s.year)).toEqual(['2027']);
  });
});

describe('JourneyTimeline', () => {
  const list = signal<ContentListItem[] | null>(null);

  beforeEach(() => {
    list.set(null);
    TestBed.configureTestingModule({
      imports: [JourneyTimeline],
      providers: [
        {
          provide: SiteContentService,
          useValue: {
            list: (key: string) => (key === 'about.journey' ? list() : null),
            pick: (text: { en: string | null; ar: string | null } | undefined) => text?.en ?? '',
          },
        },
      ],
    });
  });

  const render = () => {
    const fixture = TestBed.createComponent(JourneyTimeline);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the bundled eight years until the dashboard content loads', () => {
    const el = render();
    expect(el.querySelectorAll('.stop').length).toBe(8);
    expect(el.textContent).toContain(TestBed.inject(LanguageService).translate('journey.2020.title'));
  });

  it('shows the years managed in the dashboard, marking years after the current one as coming', () => {
    const next = new Date().getFullYear() + 1;
    list.set(
      Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        year: String(next - 5 + i),
        title: { en: `Title ${i}`, ar: `عنوان ${i}` },
        description: { en: `Text ${i}`, ar: `نص ${i}` },
      })),
    );
    const el = render();
    const stops = [...el.querySelectorAll<HTMLElement>('.stop')];
    expect(stops.length).toBe(6);
    expect(el.textContent).toContain('Title 0');
    expect(el.querySelectorAll('.stop.is-future').length).toBe(1);
    expect(el.querySelector('.stop.is-future .stop-year')!.textContent!.trim()).toBe(String(next));
    expect(el.querySelectorAll('.bend').length).toBe(1);
    expect(el.querySelectorAll('.track.is-dashed').length).toBe(1);
  });
});
