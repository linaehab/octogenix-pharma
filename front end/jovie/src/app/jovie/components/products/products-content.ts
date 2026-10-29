import { computed, inject } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { PRODUCTS_CONTENT } from '../../data/products-content';

/** The Jovie Goat Products texts in the current language (call from an injection context). */
export const injectProductsContent = () => {
  const language = inject(LanguageService);
  return computed(() => PRODUCTS_CONTENT[language.currentLanguage()]);
};

/** Replaces {name}-style placeholders. */
export const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
