import { Language } from '../../core/i18n/language.service';
import { Money } from './jovie-product.models';

/** Formats API money (integer piastres) for display, e.g. "EGP 1,200" or "‏١٬٢٠٠ ج.م.‏". */
export function formatPrice(money: Money, language: Language): string {
  const amount = money.amount_piastres / 100;
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
