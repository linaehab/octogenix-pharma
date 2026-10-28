import { computed, inject } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { WHY_CONTENT } from '../../data/why-content';

/** The Why Jovie Goat content in the current language (call from an injection context). */
export const injectWhyContent = () => {
  const language = inject(LanguageService);
  return computed(() => WHY_CONTENT[language.currentLanguage()]);
};
