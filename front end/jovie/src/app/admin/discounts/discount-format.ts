import { LanguageService } from '../../core/i18n/language.service';
import { formatPrice } from '../../jovie/data/format-price';
import { DiscountType } from './admin-discounts.models';

/** Shared formatting of the Discounts section (Cairo time, EGP, percentages). */

const CAIRO = 'Africa/Cairo';

function locale(language: LanguageService): string {
  return language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
}

export function money(piastres: number | null | undefined, language: LanguageService): string {
  return piastres === null || piastres === undefined
    ? '—'
    : formatPrice({ amount_piastres: piastres, currency: 'EGP' }, language.currentLanguage());
}

/** "10%" or "EGP 50.00", in the admin's language. */
export function discountAmount(type: DiscountType, value: number, language: LanguageService): string {
  return type === 'percent'
    ? new Intl.NumberFormat(locale(language), { style: 'percent', maximumFractionDigits: 0 }).format(value / 100)
    : money(value, language);
}

/** A stored time shown in Cairo time ("—" when empty). */
export function cairoDate(iso: string | null, language: LanguageService): string {
  return iso
    ? new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium', timeStyle: 'short', timeZone: CAIRO }).format(new Date(iso))
    : '—';
}

/**
 * A stored time as the value of a datetime-local input in Cairo time ("2026-11-10T14:30"), or ''.
 * The API reads a value without an offset as Cairo time, so it can be sent back as it is.
 */
export function cairoInput(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: CAIRO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}`;
}

/** A datetime-local value ("2026-11-10T14:30") or null when empty. */
export function inputValue(text: string): string | null {
  return text.trim() === '' ? null : text.trim();
}

/** Whole number typed by an admin (Arabic digits allowed); '' → null; anything else → NaN. */
export function wholeNumber(text: string): number | null {
  const ascii = text.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (ascii === '') {
    return null;
  }
  return /^\d{1,9}$/.test(ascii) ? Number.parseInt(ascii, 10) : Number.NaN;
}
