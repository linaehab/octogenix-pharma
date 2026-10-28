import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PageIntro } from '../../components/page-intro/page-intro';
import { HowItsMade } from '../../components/why/how-its-made';
import { WhyBenefits } from '../../components/why/why-benefits';
import { injectWhyContent } from '../../components/why/why-content';
import { WhyDifferent } from '../../components/why/why-different';
import { WhyOrganic } from '../../components/why/why-organic';
import { WhyQuote } from '../../components/why/why-quote';
import { WhySpirit } from '../../components/why/why-spirit';

/** /jovie/why: the official "Why Jovie Goat" page, section by section. */
@Component({
  selector: 'app-jovie-why-page',
  imports: [PageIntro, WhySpirit, WhyQuote, WhyBenefits, WhyOrganic, WhyDifferent, HowItsMade],
  template: `
    <app-page-intro [title]="content().title" [lead]="content().intro" [scrollButton]="false">
      <div actions>
        @for (button of content().buttons; track button.target) {
          <button class="jv-link" type="button" (click)="scrollTo(button.target)">{{ button.label }}</button>
        }
      </div>
    </app-page-intro>
    <app-why-spirit />
    <app-why-quote />
    <app-why-benefits />
    <app-why-organic />
    <app-why-different />
    <app-how-its-made />
  `,
  styles: ':host { display: block; } [actions] { display: contents; }',
})
export class JovieWhyPage {
  private readonly document = inject(DOCUMENT);
  protected readonly content = injectWhyContent();

  protected scrollTo(id: string): void {
    const reduceMotion = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
}
