import { Component, computed, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CxIcon } from '../cx-icon/cx-icon';
import { designImage } from '../design-image';
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

  /** Team photograph (hands joined) beside the core values, replacing the previous office photo;
   *  any other image chosen in the dashboard is shown as it is. */
  private static readonly TEAM_IMAGE = '/assets/images/corporate-v3/values-team.webp';

  protected readonly valuesImage = computed(() =>
    designImage(this.content, 'values.missionImage', '/assets/images/working-office.jpg', ValuesSection.TEAM_IMAGE),
  );

  protected readonly valuesImageAlt = computed(() =>
    this.valuesImage() === ValuesSection.TEAM_IMAGE
      ? this.language.translate('values.teamImageAlt')
      : this.language.translate('values.missionImageAlt'),
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
