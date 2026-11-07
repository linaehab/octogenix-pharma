import { LanguageService } from '../../core/i18n/language.service';
import { formatPrice } from '../../jovie/data/format-price';
import { AdminNotificationItem } from './admin-notifications.service';

/**
 * The text of a notification in the admin's language, built from its type and data (the API stores
 * no text). Unknown types fall back to a generic line rather than showing raw data.
 */
export function notificationText(item: AdminNotificationItem, language: LanguageService): string {
  const lang = language.currentLanguage();
  const d = item.data;
  const name = String((lang === 'ar' ? d['name_ar'] || d['name_en'] : d['name_en'] || d['name_ar']) ?? '');
  const params: Record<string, string | number> = {
    number: String(d['order_number'] ?? ''),
    total: typeof d['total_piastres'] === 'number' ? formatPrice({ amount_piastres: d['total_piastres'], currency: 'EGP' }, lang) : '',
    method: language.translate(`admin.notifications.method.${d['payment_method']}`),
    name,
    sku: String(d['sku'] ?? ''),
    stock: Number(d['stock'] ?? 0),
    threshold: Number(d['threshold'] ?? 0),
    subject: language.translate(`admin.notifications.subject.${d['subject'] ?? 'other'}`),
    rating: Number(d['rating'] ?? 0),
  };
  const key = `admin.notifications.type.${item.type}`;
  const text = language.translate(key, params);
  return text === key ? language.translate('admin.notifications.type.unknown') : text;
}

/** "5 minutes ago" style time, with the full date for older notifications. */
export function notificationTime(iso: string, language: LanguageService, now: Date = new Date()): string {
  const locale = language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  const date = new Date(iso);
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  if (Math.abs(minutes) < 60 * 24) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return Math.abs(minutes) < 60 ? rtf.format(minutes, 'minute') : rtf.format(Math.round(minutes / 60), 'hour');
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(date);
}

/** Only dashboard paths are ever followed. */
export function safeAdminLink(link: string | null): string | null {
  return link && /^\/admin\/[A-Za-z0-9/_\-.?=&]*$/.test(link) && !link.includes('//') ? link : null;
}
