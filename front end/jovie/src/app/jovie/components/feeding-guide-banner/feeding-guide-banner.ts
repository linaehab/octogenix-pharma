import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/**
 * Page header of /jovieEgypt/feeding-guide, after the client's reference: a full-width photograph
 * (mother and baby with a Jovie tin against the sky), the question and a button over the sky
 * on the left, and the official Jovie curved bottom edge (clip #jv-pageHeader, as page-intro).
 * Below 900px the text sits on the sky above the photograph. The button scrolls to the chart.
 */
@Component({
  selector: 'app-feeding-guide-banner',
  imports: [TranslatePipe],
  template: `
    <section class="banner" aria-labelledby="jovie-page-title">
      <img class="photo" src="/assets/images/jovie/feeding-guide-banner.webp" alt="" width="1696" height="624"
        fetchpriority="high" />
      <div class="jv-container content">
        <div class="copy">
          <h1 id="jovie-page-title">{{ 'jovie.page.feedingGuide.title' | translate }}</h1>
          <button class="cta" type="button" (click)="scrollToContent()">
            {{ 'jovie.page.feedingGuide.cta' | translate }}
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </button>
        </div>
      </div>
    </section>
  `,
  styleUrl: './feeding-guide-banner.css',
})
export class FeedingGuideBanner {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  protected scrollToContent(): void {
    const next = this.host.nativeElement.nextElementSibling as HTMLElement | null;
    const reduceMotion = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    next?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
}
