import { ApiProduct, Money } from './jovie-product.models';

/**
 * PREVIEW ONLY: shown while the API has no active Jovie products, so the storefront can be
 * reviewed before the client supplies the real catalogue data.
 *
 * - Names, stages, ages and descriptions are the seeded client data
 *   (backend/database/seeders/data/jovie-products.php).
 * - PRICES ARE PLACEHOLDERS approved for the visual preview only; they are not client prices.
 *   The UI labels them as preview prices, and nothing here can be added to a cart.
 * - RATINGS ARE PLACEHOLDERS too, for the card design only: they are not customer reviews,
 *   and the UI labels them as preview ratings. Real ratings must come from real reviews.
 * - Set PREVIEW_CATALOG_ENABLED to false (or delete this file) before launch.
 */
export const PREVIEW_CATALOG_ENABLED = true;

const previewPrice = (pounds: number): Money => ({ amount_piastres: pounds * 100, currency: 'EGP' });

const brand = { slug: 'jovie', name: { en: 'Jovie', ar: 'جوفي' } };

const product = (
  stage: number,
  slug: string,
  name: ApiProduct['name'],
  subtitle: ApiProduct['subtitle'],
  shortDescription: ApiProduct['short_description'],
  ages: [number, number],
  pounds: number,
  rating: [number, number],
): ApiProduct => ({
  slug,
  brand,
  name,
  subtitle,
  short_description: shortDescription,
  stage,
  age_from_months: ages[0],
  age_to_months: ages[1],
  is_featured: false,
  image: {
    id: -stage,
    url: `/assets/images/jovie/products/eg-stage-${stage}-front.webp`,
    alt: { en: `${name.en} tin`, ar: `علبة ${name.ar}` },
    is_primary: true,
    sort_order: 0,
  },
  rating: { average: rating[0], count: rating[1] },
  price_from: previewPrice(pounds),
  is_available: false,
  variants: [
    {
      id: -stage,
      sku: `JOVIE-S${stage}-400G-TBC`,
      name: { en: '400 g', ar: '400 جم' },
      net_weight_grams: 400,
      price: previewPrice(pounds),
      compare_at_price: null,
      is_default: true,
      is_available: false,
      max_per_order: null,
    },
  ],
});

export const PREVIEW_PRODUCTS: ApiProduct[] = [
  product(
    1,
    'jovie-organic-infant-milk-stage-1',
    { en: 'Jovie Organic Infant Milk - Stage 1', ar: 'تركيبة حليب جوفي العضوي للرضع' },
    { en: 'Stage 1 · 0–6 months', ar: 'المرحلة 1 · من الولادة حتى 6 أشهر' },
    {
      en: 'Formula based on whole organic goat milk. Made in Denmark.',
      ar: 'تركيبة أساسها حليب ماعز عضوي كامل، صنع في الدنمارك.',
    },
    [0, 6],
    1200,
    [4.5, 172],
  ),
  product(
    2,
    'jovie-organic-follow-on-milk-stage-2',
    { en: 'Jovie Organic Follow-on Milk - Stage 2', ar: 'تركيبة حليب جوفي العضوي للمتابعة' },
    { en: 'Stage 2 · 6–12 months', ar: 'المرحلة 2 · من 6 إلى 12 شهراً' },
    {
      en: 'Follow-on formula made from organic goat milk. Made in Denmark.',
      ar: 'تركيبة متابعة من حليب الماعز العضوي، صنع في الدنمارك.',
    },
    [6, 12],
    1150,
    [4.5, 206],
  ),
  product(
    3,
    'jovie-organic-follow-on-formula-toddlers-stage-3',
    {
      en: 'Jovie Organic Follow-on Formula for Toddlers - Stage 3',
      ar: 'تركيبة للمتابعة من حليب الماعز العضوي للأطفال الصغار',
    },
    { en: 'Stage 3 · 1–3 years', ar: 'المرحلة 3 · من 1 إلى 3 سنوات' },
    {
      en: 'Advanced follow-on formula for toddlers, made from organic goat milk. Made in Denmark.',
      ar: 'تركيبة متابعة متقدمة للأطفال الصغار من حليب الماعز العضوي، صنع في الدنمارك.',
    },
    [12, 36],
    1050,
    [4.5, 192],
  ),
];
