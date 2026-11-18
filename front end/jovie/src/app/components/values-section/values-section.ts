import { Component, computed, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CxIcon } from '../cx-icon/cx-icon';
import { OUR_VALUES } from '../our-values';

/** Steps of the company's approach, shown in the charcoal band. */
const APPROACH_STEPS = ['market', 'portfolio', 'regulatory', 'distribution', 'commercial'] as const;

@Component({
  selector: 'app-values-section',
  imports: [TranslatePipe, CxIcon],
  templateUrl: './values-section.html',
  styleUrl: './values-section.css',
})
export class ValuesSection {
  protected readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  /** Photograph beside our values (the team, hands joined); editable in the dashboard. */
  protected readonly valuesImage = computed(() =>
    this.content.image('values.teamImage', '/assets/images/corporate-v3/values-team.webp'),
  );

  protected readonly coreValues = computed(() =>
    OUR_VALUES.map((value) => ({
      title: this.language.translate(`ourValues.${value.key}`),
      description: this.language.translate(`ourValues.${value.key}Text`),
      icon: value.icon,
    })),
  );

  protected readonly approachSteps = computed(() =>
    APPROACH_STEPS.map((step) => ({
      title: this.language.translate(`approach.${step}`),
      description: this.language.translate(`approach.${step}Text`),
    })),
  );
}
