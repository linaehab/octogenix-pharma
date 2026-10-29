import { computed, inject } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { HOME_CONTENT } from '../../data/home-content';

/** The home page texts in the current language (call from an injection context). */
export const injectHomeContent = () => {
  const language = inject(LanguageService);
  return computed(() => HOME_CONTENT[language.currentLanguage()]);
};
