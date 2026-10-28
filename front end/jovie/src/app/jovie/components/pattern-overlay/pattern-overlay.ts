import { Component, input } from '@angular/core';

export type PatternSet = 'header' | 'faq';
export type PatternLayout = 'about' | 'content';

/**
 * The official page-header pattern of jovieproducts.com: six white, 20 %-opaque SVG shapes that
 * slide and turn into place once when the page opens (1.5 s). `set` picks the official files
 * (header_pattern_* for the home and yellow pages, header_pattern_faq_* for the FAQ and the content
 * pages); `layout` their official positions (about/home or faq/content header).
 */
@Component({
  selector: 'app-pattern-overlay',
  template: `
    @for (n of shapes; track n) {
      <img class="pattern" [class]="'pattern p' + n" [src]="'/assets/images/jovie/official/patterns/' + set() + '-' + n + '.svg'"
        alt="" decoding="async" />
    }
  `,
  styleUrl: './pattern-overlay.css',
  host: { 'aria-hidden': 'true', '[attr.data-layout]': 'layout()' },
})
export class PatternOverlay {
  readonly set = input<PatternSet>('header');
  readonly layout = input<PatternLayout>('about');

  protected readonly shapes = [1, 2, 3, 4, 5, 6];
}
