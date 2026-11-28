import type { Language } from '../../core/i18n/language.service';

/** A line with some words in bold (`strong`). */
export type RichLine = { text: string; strong?: boolean }[];

/**
 * The brand story sections of the shop product page (/jovieEgypt/shop/:slug), between the product
 * and "Why Jovie Goat": the official "Jovie's Promise" page (jovieproducts.eu/en/pages/jovies-promise)
 * up to "Pure & Natural": the promise, the goats, "Say YES / Say NO", full fat milk, organic and
 * pure & natural. Official English wording, with the Arabic translation. The claims match the
 * Egyptian labels (whole goat milk first, organic, no palm oil, maltodextrin or soy) and the
 * official copy already on the site (data/brand-sections.ts, data/why-content.ts).
 */
export interface ProductStoryText {
  /** The page title of the official "Jovie's Promise" page. */
  title: string;
  promise: RichLine;
  goatsAlt: string;
  sayYes: RichLine;
  sayNo: RichLine;
  benefits: {
    title: string;
    lead: string;
    paragraphs: string[];
    closing?: RichLine;
    /** A list with the red check marks ("Without palm oil", ...). */
    checks?: string[];
    heart: 'pink' | 'green' | 'yellow';
  }[];
}

export const PRODUCT_STORY: Record<Language, ProductStoryText> = {
  en: {
    title: "Jovie's Promise",
    promise: [
      { text: 'Making ' },
      { text: 'the best choices', strong: true },
      { text: ' for your baby, the animals, and our planet, that is ' },
      { text: 'our promise', strong: true },
      { text: '.' },
    ],
    goatsAlt: 'Jovie goats walking along a country path between green trees',
    sayYes: [{ text: 'Say ' }, { text: 'YES', strong: true }, { text: ' to organic whole goat milk.' }],
    sayNo: [{ text: 'Say ' }, { text: 'NO', strong: true }, { text: ' to palm oil, maltodextrin and soy.' }],
    benefits: [
      {
        title: 'Full fat milk goodness',
        lead: 'Organic Whole Goat Milk as the first and most important ingredient',
        paragraphs: [
          "Babies get about half of their energy needs from fat. That's why we use organic whole goat milk as the first and most important ingredient in our formulas. Goat milk fat has a unique natural composition. We use as much as possible what nature has to offer, and omit ingredients that we do not want to use, such as palm oil.",
        ],
        closing: [{ text: 'Pure, organic, and sustainable. ' }, { text: 'It just makes good sense!', strong: true }],
        heart: 'pink',
      },
      {
        title: 'Organic',
        lead: '',
        paragraphs: [
          'Our goat milk infant formulas are certified organic according to European guidelines. We only use goat milk as nature intended. Produced without the use of fertilizers, pesticides, genetically modified crops, and hormones. The goats that produce the milk for Jovie are free to roam and graze outside.',
        ],
        heart: 'green',
      },
      {
        title: 'Pure & Natural',
        lead: '',
        paragraphs: ['We look for the best and healthiest organic ingredients, with the least impact on the environment.'],
        checks: ['Without palm oil', 'Without soy', 'Without maltodextrin'],
        heart: 'yellow',
      },
    ],
  },
  ar: {
    title: 'وعد جوفي',
    promise: [
      { text: 'أن نتخذ ' },
      { text: 'أفضل الخيارات', strong: true },
      { text: ' لطفلك وللحيوانات ولكوكبنا، هذا هو ' },
      { text: 'وعدنا', strong: true },
      { text: '.' },
    ],
    goatsAlt: 'ماعز جوفي تسير على طريق ريفي بين الأشجار الخضراء',
    sayYes: [{ text: 'قل ' }, { text: 'نعم', strong: true }, { text: ' لحليب الماعز الكامل العضوي.' }],
    sayNo: [{ text: 'وقل ' }, { text: 'لا', strong: true }, { text: ' لزيت النخيل والمالتوديكسترين والصويا.' }],
    benefits: [
      {
        title: 'فوائد الحليب كامل الدسم',
        lead: 'حليب الماعز الكامل العضوي هو المكوّن الأول والأهم',
        paragraphs: [
          'يحصل الرضّع على نحو نصف احتياجاتهم من الطاقة من الدهون؛ لذلك نستخدم حليب الماعز الكامل العضوي مكوّنًا أول وأهم في تركيباتنا. تتميّز دهون حليب الماعز بتركيبة طبيعية فريدة. نستخدم أكبر قدر ممكن مما تقدّمه الطبيعة، ونستبعد المكوّنات التي لا نريد استخدامها مثل زيت النخيل.',
        ],
        closing: [{ text: 'نقيّ وعضوي ومستدام. ' }, { text: 'إنه ببساطة خيار منطقي!', strong: true }],
        heart: 'pink',
      },
      {
        title: 'عضوية',
        lead: '',
        paragraphs: [
          'تركيبات حليب الماعز للرضّع لدينا حاصلة على شهادة عضوية وفق المعايير الأوروبية. نستخدم حليب الماعز كما أرادته الطبيعة فقط، ويُنتَج دون استخدام الأسمدة أو المبيدات أو المحاصيل المعدّلة وراثيًا أو الهرمونات. والماعز التي تُنتج حليب جوفي حرّة في التجوّل والرعي في الهواء الطلق.',
        ],
        heart: 'green',
      },
      {
        title: 'نقي وطبيعي',
        lead: '',
        paragraphs: ['نبحث عن أفضل المكوّنات العضوية وأكثرها فائدة للصحة، مع أقل تأثير ممكن على البيئة.'],
        checks: ['بدون زيت النخيل', 'بدون صويا', 'بدون مالتوديكسترين'],
        heart: 'yellow',
      },
    ],
  },
};

/** What each product photo of the shop product page shows (after the product name). */
export const PRODUCT_PHOTO_ALT: Record<Language, Record<'decorative' | 'tin' | 'goat' | 'scoop', string>> = {
  en: {
    decorative: 'the tin with Jovie flowers',
    tin: 'the 400 g tin',
    goat: 'the tin with a young goat',
    scoop: 'the tin with the scoop and formula powder',
  },
  ar: {
    decorative: 'العلبة مع زهور جوفي',
    tin: 'علبة 400 جم',
    goat: 'العلبة مع ماعز صغير',
    scoop: 'العلبة مع المكيال والبودرة',
  },
};
