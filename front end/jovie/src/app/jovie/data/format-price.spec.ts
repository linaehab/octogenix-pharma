import { formatPrice } from './format-price';

describe('formatPrice', () => {
  it('formats piastres as Egyptian pounds in English and Arabic', () => {
    const money = { amount_piastres: 120000, currency: 'EGP' };

    expect(formatPrice(money, 'en')).toContain('1,200');
    expect(formatPrice(money, 'en')).toContain('EGP');
    expect(formatPrice(money, 'ar')).toContain('١٬٢٠٠');
  });

  it('keeps piastres when the amount is not whole', () => {
    expect(formatPrice({ amount_piastres: 99950, currency: 'EGP' }, 'en')).toContain('999.50');
  });
});
