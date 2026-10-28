import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PatternLayout, PatternOverlay, PatternSet } from '../pattern-overlay/pattern-overlay';

export type IntroTone = 'yellow' | 'red' | 'green';

/**
 * Page header of the Jovie inner pages, after the official jovieproducts.com page headers: the
 * official curved shape (clip #jv-pageHeader), the official animated pattern, a centred title and
 * text, optional actions (projected as [actions]) and, on content pages, a round button that
 * scrolls to the content. The transparent site header floats over it.
 */
@Component({
  selector: 'app-page-intro',
  imports: [PatternOverlay, TranslatePipe],
  template: `
    <section class="intro" [attr.data-tone]="tone()" [attr.data-layout]="layout()" [attr.aria-labelledby]="headingId()">
      <app-pattern-overlay [set]="patternSet()" [layout]="layout()" />
      <div class="jv-container content">
        <h1 [id]="headingId()">{{ title() }}</h1>
        @if (lead()) {
          <p>{{ lead() }}</p>
        }
        <div class="actions"><ng-content select="[actions]" /></div>
      </div>
    </section>
    @if (scrollButton()) {
      <button class="scroll" type="button" (click)="scrollToContent()" [attr.aria-label]="'jovie.skipToContent' | translate">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    }
  `,
  styleUrl: './page-intro.css',
})
export class PageIntro {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  readonly title = input.required<string>();
  readonly lead = input('');
  readonly headingId = input('jovie-page-title');
  readonly tone = input<IntroTone>('yellow');
  /** 'about': the tall home/Why header; 'content': the shorter FAQ and content-page header. */
  readonly layout = input<PatternLayout>('about');
  readonly scrollButton = input(true);

  protected readonly patternSet = computed<PatternSet>(() => (this.tone() === 'yellow' ? 'header' : 'faq'));

  protected scrollToContent(): void {
    const next = this.host.nativeElement.nextElementSibling as HTMLElement | null;
    const reduceMotion = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    next?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
}
