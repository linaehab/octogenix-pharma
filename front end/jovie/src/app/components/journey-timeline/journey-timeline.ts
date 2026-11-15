import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

interface Stop {
  year: number;
  /** Column (1–4) in its row; columns follow the reading direction, so the path mirrors in Arabic. */
  col: number;
  /** Order on narrow screens, where the path becomes one vertical line. */
  order: number;
  future?: boolean;
}

interface Row {
  key: 'top' | 'middle' | 'bottom';
  stops: Stop[];
}

/**
 * About page: the company's path since 2020, drawn as in the reference — a lime line winding
 * upwards through three rows, with a pin over each year. It starts at the bottom (2020), turns up
 * on the start side, runs the full middle row, turns up on the end side and finishes at the top
 * with the coming year (2027, dashed). The heading sits in the free corner of the top row.
 */
@Component({
  selector: 'app-journey-timeline',
  imports: [TranslatePipe],
  templateUrl: './journey-timeline.html',
  styleUrl: './journey-timeline.css',
})
export class JourneyTimeline {
  protected readonly rows: Row[] = [
    {
      key: 'top',
      stops: [
        { year: 2027, col: 3, order: 8, future: true },
        { year: 2026, col: 4, order: 7 },
      ],
    },
    {
      key: 'middle',
      stops: [
        { year: 2022, col: 1, order: 3 },
        { year: 2023, col: 2, order: 4 },
        { year: 2024, col: 3, order: 5 },
        { year: 2025, col: 4, order: 6 },
      ],
    },
    {
      key: 'bottom',
      stops: [
        { year: 2021, col: 1, order: 2 },
        { year: 2020, col: 2, order: 1 },
      ],
    },
  ];
}
