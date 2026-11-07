import { Language } from '../../core/i18n/language.service';
import { formatPrice } from '../../jovie/data/format-price';
import { REPORT_TIMEZONE } from './admin-reports.models';

/** Display helpers shared by the report tabs. Values are formatted only; every figure comes from the API. */
const locale = (language: Language) => (language === 'ar' ? 'ar-EG' : 'en-GB');

export function egp(piastres: number, language: Language): string {
  return formatPrice({ amount_piastres: piastres, currency: 'EGP' }, language);
}

export function count(value: number, language: Language): string {
  return new Intl.NumberFormat(locale(language)).format(value);
}

export function dateTime(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium', timeStyle: 'short', timeZone: REPORT_TIMEZONE }).format(new Date(iso));
}

/** "2026-11-03" -> "3 Nov 2026", "2026-11" -> "Nov 2026" (calendar values, no time zone shift). */
export function periodLabel(key: string, language: Language, short = false): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d ?? 1));
  const options: Intl.DateTimeFormatOptions =
    d === undefined ? { month: 'short', year: 'numeric', timeZone: 'UTC' } : short ? { day: 'numeric', month: 'short', timeZone: 'UTC' } : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(locale(language), options).format(date);
}
