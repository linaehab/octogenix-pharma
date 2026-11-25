import { Component } from '@angular/core';
import { FeedingGuideBanner } from '../../components/feeding-guide-banner/feeding-guide-banner';
import { FeedingFilm } from '../../components/feeding-film/feeding-film';
import { FeedingGuide } from '../../components/feeding-guide/feeding-guide';
import { PreparationFaq } from '../../components/preparation-faq/preparation-faq';

/** /jovieEgypt/feeding-guide: choose a stage (?stage=1|2|3 preselects one). */
@Component({
  selector: 'app-jovie-feeding-guide-page',
  imports: [FeedingGuideBanner, FeedingGuide, FeedingFilm, PreparationFaq],
  template: `
    <app-feeding-guide-banner />
    <app-feeding-guide />
    <app-feeding-film />
    <app-preparation-faq />
  `,
  styles: ':host { display: block; }',
})
export class JovieFeedingGuidePage {}
