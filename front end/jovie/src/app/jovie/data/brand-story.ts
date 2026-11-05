import type { Language } from '../../core/i18n/language.service';

/**
 * Two sections of the official "We are Jovie" page (jovieproducts.eu/en/pages/we-are-jovie), shown
 * on /jovie/where-to-find: the "Joie de vivre" band and "A Brand from Dutch origin". Official
 * English wording, used with the brand owner's permission like the other official content of this
 * site, with the Arabic translation.
 *
 * Adapted: the official button goes to the brand's news page ("To bulletin board"), which this site
 * does not have; it leads to "Why Jovie Goat" instead, with a label saying so.
 */
export interface BrandStoryText {
  joy: {
    /** Tablets and wider: the text with its line breaks (one paragraph per entry). */
    lines: string[];
    closing: string;
    /** Phones: the short version of the official page (without the closing sentence). */
    mobile: string;
    button: string;
    logo: string;
  };
  origin: {
    titleLines: [string, string];
    text: string;
    strong: string;
  };
}

export const BRAND_STORY: Record<Language, BrandStoryText> = {
  en: {
    joy: {
      lines: [
        'The French saying "Joie de vivre" (joy of life) is the inspiration for our brand name Jovie and how we approach the world. New life represents joy, color, and the future. We want to cherish this future.',
        'All babies deserve a comfortable and happy start in life.',
      ],
      closing: 'Our commitment to continuous improvement and respect for the planet is the foundation of our organic products.',
      mobile:
        'The French saying "Joie de vivre" (joy of life) is the inspiration for our brand name Jovie and how we approach the world. New life represents joy, color, and the future. We want to cherish this future. All babies deserve a comfortable and happy start in life.',
      button: 'More about Jovie',
      logo: 'Jovie',
    },
    origin: {
      titleLines: ['A Brand from Dutch', 'origin'],
      text:
        "Jovie is a Dutch brand that stands for honest bottle feeding. We are located in the Netherlands, one of the world's largest dairy countries. We know what we're doing, and we have a clear vision in mind. Our European organic certification raises the bar even higher, for the benefit of the animals, the planet, and our children's future. Jovie stands for innovative, well-thought-out, and high-quality infant formulas.",
      strong: 'For happy babies.',
    },
  },
  ar: {
    joy: {
      lines: [
        'المقولة الفرنسية "Joie de vivre" (بهجة الحياة) هي مصدر إلهام اسم علامتنا جوفي وطريقتنا في النظر إلى العالم. الحياة الجديدة تعني البهجة والألوان والمستقبل، ونريد أن نعتز بهذا المستقبل.',
        'كل الأطفال يستحقون بداية مريحة وسعيدة في الحياة.',
      ],
      closing: 'التزامنا بالتحسين المستمر واحترام كوكبنا هو أساس منتجاتنا العضوية.',
      mobile:
        'المقولة الفرنسية "Joie de vivre" (بهجة الحياة) هي مصدر إلهام اسم علامتنا جوفي وطريقتنا في النظر إلى العالم. الحياة الجديدة تعني البهجة والألوان والمستقبل، ونريد أن نعتز بهذا المستقبل. كل الأطفال يستحقون بداية مريحة وسعيدة في الحياة.',
      button: 'المزيد عن جوفي',
      logo: 'جوفي',
    },
    origin: {
      titleLines: ['علامة تجارية', 'من أصل هولندي'],
      text:
        'جوفي علامة تجارية هولندية تمثّل الرضاعة الصناعية بأمانة وشفافية. نحن في هولندا، إحدى أكبر دول إنتاج الألبان في العالم. نعرف ما نقوم به، ولدينا رؤية واضحة. وشهادتنا الأوروبية للمنتجات العضوية ترفع المعايير أكثر، لمصلحة الحيوانات والكوكب ومستقبل أطفالنا. جوفي تعني تركيبات رضع مبتكرة ومدروسة وعالية الجودة.',
      strong: 'من أجل أطفال سعداء.',
    },
  },
};
