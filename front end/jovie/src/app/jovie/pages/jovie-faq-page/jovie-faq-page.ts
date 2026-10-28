import { Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PageIntro } from '../../components/page-intro/page-intro';
import { FaqSection } from '../../components/faq-section/faq-section';

/** /jovie/faq: the official Jovie FAQ under the official red page header. */
@Component({
  selector: 'app-jovie-faq-page',
  imports: [TranslatePipe, PageIntro, FaqSection],
  template: `
    <app-page-intro tone="red" layout="content" [title]="'jovie.page.faq.title' | translate" [lead]="'jovie.page.faq.lead' | translate" />
    <app-faq-section />
  `,
  styles: ':host { display: block; }',
})
export class JovieFaqPage {}
