import { Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PageIntro } from '../../components/page-intro/page-intro';
import { FeedingGuide } from '../../components/feeding-guide/feeding-guide';

/** /jovie/feeding-guide: choose a stage (?stage=1|2|3 preselects one). */
@Component({
  selector: 'app-jovie-feeding-guide-page',
  imports: [TranslatePipe, PageIntro, FeedingGuide],
  template: `
    <app-page-intro [title]="'jovie.page.feedingGuide.title' | translate" [lead]="'jovie.page.feedingGuide.lead' | translate" />
    <app-feeding-guide />
  `,
  styles: ':host { display: block; }',
})
export class JovieFeedingGuidePage {}
