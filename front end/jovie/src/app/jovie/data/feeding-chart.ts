import type { Language } from '../../core/i18n/language.service';
import type { ProductSlug } from './products-content';

/*
 * The feeding chart of /jovie/feeding-guide. Every number is the "FEEDING GUIDE" table printed on
 * the Egyptian tins ("260923 JOVIE 1/2/3 400g EG 2304x A LITHO.pdf", copies in
 * public/downloads/jovie/): Stage 1 by the baby's weight, Stages 2 and 3 by age, all 400 g tins.
 * The labels give no combination-feeding amounts, so the chart shows none. "Tins per month" is
 * arithmetic on the label: feeds x level scoops x scoop weight x 30 days / 400 g, rounded up.
 */
export type FeedingStage = 1 | 2 | 3;

export interface FeedingRow {
  id: string;
  stage: FeedingStage;
  /** Feeds per 24 hours: one number, or [min, max] when the label gives a range ("2-3"). */
  feeds: number | readonly [number, number];
  /** Water per feed, ml. */
  water: number;
  /** Level scoops per feed. */
  scoops: number;
}

export const FEEDING_ROWS: readonly FeedingRow[] = [
  { id: 'under-3kg', stage: 1, feeds: 7, water: 60, scoops: 2 },
  { id: '3-3.5kg', stage: 1, feeds: 6, water: 90, scoops: 3 },
  { id: '3.5-4kg', stage: 1, feeds: 5, water: 120, scoops: 4 },
  { id: '4-5kg', stage: 1, feeds: 5, water: 150, scoops: 5 },
  { id: 'over-5kg', stage: 1, feeds: 5, water: 180, scoops: 6 },
  { id: '6-8m', stage: 2, feeds: 4, water: 150, scoops: 5 },
  { id: '8-10m', stage: 2, feeds: 3, water: 180, scoops: 6 },
  { id: '10-12m', stage: 2, feeds: [2, 3], water: 210, scoops: 7 },
  { id: '12m-plus', stage: 3, feeds: 2, water: 150, scoops: 5 },
];

/** Per stage, from the label: scoop weight (g), tin weight (g) and the product it belongs to. */
export const FEEDING_STAGES: Record<FeedingStage, { scoopGrams: number; tinGrams: number; slug: ProductSlug }> = {
  1: { scoopGrams: 4.3, tinGrams: 400, slug: 'infant-goat-milk' },
  2: { scoopGrams: 4.3, tinGrams: 400, slug: 'follow-on-goat-milk' },
  3: { scoopGrams: 4.5, tinGrams: 400, slug: 'toddler-goat-milk' },
};

export const FEEDING_CHART_PDF: Record<Language, string> = {
  en: '/downloads/jovie/jovie-goat-feeding-chart-egypt-en.pdf',
  ar: '/downloads/jovie/jovie-goat-feeding-chart-egypt-ar.pdf',
};

const range = (feeds: FeedingRow['feeds']): readonly [number, number] =>
  typeof feeds === 'number' ? [feeds, feeds] : feeds;

/** Daily water (ml) and scoops, as [min, max]. */
export const dailyAmounts = (row: FeedingRow) => {
  const [min, max] = range(row.feeds);
  return { water: [min * row.water, max * row.water], scoops: [min * row.scoops, max * row.scoops] } as const;
};

/** 400 g tins for 30 days of formula-only feeding, rounded up, as [min, max]. */
export const tinsPerMonth = (row: FeedingRow): readonly [number, number] => {
  const { scoopGrams, tinGrams } = FEEDING_STAGES[row.stage];
  const tins = (feeds: number) => Math.ceil((feeds * row.scoops * scoopGrams * 30) / tinGrams);
  const [min, max] = range(row.feeds);
  return [tins(min), tins(max)];
};

export interface FeedingChartText {
  title: string;
  subtitle: string;
  tabsLabel: string;
  stageGroup: Record<FeedingStage, string>;
  rows: Record<string, string>;
  product: Record<FeedingStage, string>;
  feeds: string;
  water: string;
  scoops: string;
  daily: string;
  tins: string;
  /** "{value}" placeholders, filled by the component. */
  units: { ml: string; scoops: string; dailyValue: string; tins: string; scoopWeight: string };
  shop: string;
  footnote: string;
  stageNote: Record<FeedingStage, string>;
  download: string;
  cardsLabel: string;
}

export const FEEDING_CHART_TEXT: Record<Language, FeedingChartText> = {
  en: {
    title: "Select your baby's weight or age",
    subtitle: 'The feeding guide of the Egyptian Jovie Goat tins (birth to 3 years)',
    tabsLabel: 'Choose a feeding table row',
    stageGroup: { 1: "Stage 1 · baby's weight", 2: 'Stage 2 · age', 3: 'Stage 3 · age' },
    rows: {
      'under-3kg': 'Under 3 kg',
      '3-3.5kg': '3–3.5 kg',
      '3.5-4kg': '3.5–4 kg',
      '4-5kg': '4–5 kg',
      'over-5kg': 'Over 5 kg',
      '6-8m': '6–8 months',
      '8-10m': '8–10 months',
      '10-12m': '10–12 months',
      '12m-plus': '12 months+',
    },
    product: {
      1: 'Jovie Goat 1 · Infant Formula · 0–6 months',
      2: 'Jovie Goat 2 · Follow-on Formula · 6–12 months',
      3: 'Jovie Goat 3 · Follow-on Formula for Toddlers · 1–3 years',
    },
    feeds: 'Feeds per 24 hours',
    water: 'Water per feed',
    scoops: 'Level scoops per feed',
    daily: 'Daily total',
    tins: 'Tins per month (formula feeding only)',
    units: {
      ml: '{value} ml',
      scoops: '{value}',
      dailyValue: '{water} ml water · {scoops} scoops',
      tins: '{value} tins (400 g)*',
      scoopWeight: 'scoop {value} g',
    },
    shop: 'Shop {product}',
    footnote:
      '*Unless prescribed differently by your health professional. Tins per month are calculated from the table on the tin (feeds × scoops × scoop weight × 30 days ÷ 400 g) and rounded up.',
    stageNote: {
      1: 'Consult your health professional about introducing solid foods such as fruit and vegetable purees at approximately 4–6 months of age.',
      2: 'Babies from 6 months onwards need about 500–600 ml of follow-on milk per day, either as a drink or added to cereals. This is only a guide; your baby may need more or less.',
      3: 'Babies from 6 months onwards need about 500–600 ml of follow-on milk per day, either as a drink or added to cereals. This is only a guide; your baby may need more or less.',
    },
    download: 'Download Feeding Chart',
    cardsLabel: 'Feeding table',
  },
  ar: {
    title: 'اختر وزن طفلك أو عمره',
    subtitle: 'دليل التغذية المطبوع على علب جوفي جوت في مصر (من الولادة حتى 3 سنوات)',
    tabsLabel: 'اختر صفًا من جدول التغذية',
    stageGroup: { 1: 'المرحلة 1 · وزن الطفل', 2: 'المرحلة 2 · العمر', 3: 'المرحلة 3 · العمر' },
    rows: {
      'under-3kg': 'أقل من 3 كجم',
      '3-3.5kg': '3–3.5 كجم',
      '3.5-4kg': '3.5–4 كجم',
      '4-5kg': '4–5 كجم',
      'over-5kg': 'أكثر من 5 كجم',
      '6-8m': '6–8 أشهر',
      '8-10m': '8–10 أشهر',
      '10-12m': '10–12 شهرًا',
      '12m-plus': '12 شهرًا فأكثر',
    },
    product: {
      1: 'جوفي جوت 1 · تركيبة غذائية للرضع · من 0 إلى 6 أشهر',
      2: 'جوفي جوت 2 · تركيبة للمتابعة · من 6 إلى 12 شهرًا',
      3: 'جوفي جوت 3 · تركيبة للمتابعة للأطفال · من 1 إلى 3 سنوات',
    },
    feeds: 'عدد الوجبات لكل 24 ساعة',
    water: 'الماء لكل وجبة',
    scoops: 'مكاييل متساوية لكل وجبة',
    daily: 'الإجمالي اليومي',
    tins: 'العلب شهريًا (تغذية بالحليب الصناعي فقط)',
    units: {
      ml: '{value} مل',
      scoops: '{value}',
      dailyValue: '{water} مل ماء · {scoops} مكيالًا',
      tins: '{value} علب (400 جم)*',
      scoopWeight: 'المكيال {value} جم',
    },
    shop: 'تسوّق {product}',
    footnote:
      '*ما لم يوصِ ممارسك الصحي بغير ذلك. عدد العلب شهريًا محسوب من الجدول المطبوع على العلبة (الوجبات × المكاييل × وزن المكيال × 30 يومًا ÷ 400 جم) ومقرّب لأعلى.',
    stageNote: {
      1: 'يرجى استشارة الممارس الصحي بشأن تقديم الأطعمة الصلبة مثل هريس الفاكهة والخضروات عند عمر 4 إلى 6 أشهر تقريبًا.',
      2: 'بداية من 6 أشهر فصاعدًا، يحتاج الطفل حوالي 500–600 مل من حليب المتابعة كل يوم، سواء كمشروب أو مضافًا إلى الحبوب. هذا دليل فقط، وقد يحتاج طفلك إلى أكثر أو أقل من ذلك.',
      3: 'بداية من 6 أشهر فصاعدًا، يحتاج الطفل حوالي 500–600 مل من حليب المتابعة كل يوم، سواء كمشروب أو مضافًا إلى الحبوب. هذا دليل فقط، وقد يحتاج طفلك إلى أكثر أو أقل من ذلك.',
    },
    download: 'تحميل جدول التغذية',
    cardsLabel: 'جدول التغذية',
  },
};
