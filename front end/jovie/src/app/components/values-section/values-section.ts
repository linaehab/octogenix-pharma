import { Component, computed, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Which built-in SVG a core value shows. The dashboard stores the matching symbol. */
type CoreValueIcon = 'quality' | 'innovation' | 'integrity' | 'distribution' | 'sustainable';

const ICON_BY_SYMBOL: Record<string, CoreValueIcon> = {
  '◈': 'quality',
  '✳': 'innovation',
  '◇': 'integrity',
  '↗': 'distribution',
  '∞': 'sustainable',
};

/** Bundled values (translation keys), shown until (or unless) the dashboard lists are loaded. */
const DEFAULT_CORE_VALUES: { title: string; description?: string; icon: CoreValueIcon }[] = [
  { title: 'values.quality', description: 'values.qualityDescription', icon: 'quality' },
  { title: 'values.innovation', icon: 'innovation' },
  { title: 'values.integrity', icon: 'integrity' },
  { title: 'values.distributionExcellence', icon: 'distribution' },
  { title: 'values.sustainable', icon: 'sustainable' },
];

const DEFAULT_COMPANY_VALUES: { title: string; description: string }[] = [
  { title: 'values.commitment', description: 'values.commitmentDescription' },
  { title: 'values.companyExcellence', description: 'values.excellenceDescription' },
  { title: 'values.harmony', description: 'values.harmonyDescription' },
  { title: 'values.growth', description: 'values.growthDescription' },
  { title: 'values.credibility', description: 'values.credibilityDescription' },
];

@Component({
  selector: 'app-values-section',
  imports: [TranslatePipe],
  templateUrl: './values-section.html',
  styleUrl: './values-section.css',
})
export class ValuesSection {
  protected readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  protected readonly coreValues = computed(() => {
    const remote = this.content.list('values.core');
    if (remote?.length) {
      return remote.map((item) => ({
        title: this.content.pick(item.title),
        description: this.content.pick(item.description),
        icon: ICON_BY_SYMBOL[item.icon ?? ''] ?? null,
      }));
    }
    return DEFAULT_CORE_VALUES.map((value) => ({
      title: this.language.translate(value.title),
      description: value.description ? this.language.translate(value.description) : '',
      icon: value.icon,
    }));
  });

  protected readonly companyValues = computed(() => {
    const remote = this.content.list('values.company');
    if (remote?.length) {
      return remote.map((item) => ({
        title: this.content.pick(item.title),
        description: this.content.pick(item.description),
      }));
    }
    return DEFAULT_COMPANY_VALUES.map((value) => ({
      title: this.language.translate(value.title),
      description: this.language.translate(value.description),
    }));
  });
}
