import type { Language } from '../../core/i18n/language.service';

/**
 * Two sections of the official Jovie home page (jovieproducts.eu/en), shown on /jovie/products:
 * "Jovie Goat Organic baby formula — Naturally good, enriched with love" (section-jovie-pros) and
 * "We are Jovie" (section-jovie-about). Official English wording, used with the brand owner's
 * permission like the other official content of this site, with the Arabic translation.
 *
 * Adapted for Egypt: the official "from Dutch origin" product point reads "Dutch brand, made in
 * Denmark", because the Egyptian tins are made in Denmark (DK-ØKO-100 on the labels). The other
 * points were checked against the Egyptian labels: whole goat milk is the first ingredient, the
 * product is organic, and none of the three tins contains palm oil, soy or maltodextrin.
 */
export interface BrandSectionsText {
  pros: {
    title: string;
    titleStrong: string;
    hearts: string[];
    checks: string[];
    button: string;
    logo: string;
  };
  about: {
    title: string;
    text: string;
    /** Phones show this short line instead of the paragraph and the three points (as the original). */
    mobileText: string;
    usps: { title: string; image: string; width: number; height: number }[];
    button: string;
  };
}

export const BRAND_SECTIONS: Record<Language, BrandSectionsText> = {
  en: {
    pros: {
      title: 'Jovie Goat Organic baby formula',
      titleStrong: 'Naturally good, enriched with love',
      hearts: ['whole goat milk as the main ingredient', 'naturally organic', 'Dutch brand, made in Denmark'],
      checks: ['without palm oil', 'without soy', 'without maltodextrin'],
      button: "Jovie's Promise",
      logo: 'Jovie',
    },
    about: {
      title: 'We are Jovie',
      text:
        'We are parents and at the same time we are a team of experts with years of experience in infant formula. We know how important good nutrition is for babies and children. We all have our own unique parenting story - from pregnancy complications or the challenges that come with breastfeeding, to picky eaters. We believe that goat milk just makes good sense when it comes to infant formula.',
      mobileText: 'We believe that goat milk just makes good sense when it comes to infant formula.',
      usps: [
        { title: 'Experts in infant formula', image: 'usp-infant-formula.svg', width: 156, height: 294 },
        { title: 'Dutch origin', image: 'usp-netherlands.svg', width: 292, height: 346 },
        { title: 'Goat milk lovers', image: 'usp-goat.svg', width: 281, height: 235 },
      ],
      button: 'More about us',
    },
  },
  ar: {
    pros: {
      title: 'تركيبة جوفي جوت العضوية للأطفال',
      titleStrong: 'جيدة بطبيعتها، مُعدّة بكل حب',
      hearts: ['حليب الماعز الكامل هو المكوّن الرئيسي', 'عضوية بطبيعتها', 'علامة هولندية، مصنوعة في الدنمارك'],
      checks: ['بدون زيت النخيل', 'بدون صويا', 'بدون مالتوديكسترين'],
      button: 'وعد جوفي',
      logo: 'جوفي',
    },
    about: {
      title: 'نحن جوفي',
      text:
        'نحن آباء وأمهات، وفي الوقت نفسه فريق من الخبراء لدينا سنوات من الخبرة في تركيبات حليب الرضع. نعرف مدى أهمية التغذية الجيدة للرضع والأطفال. لكلٍّ منا قصته الخاصة مع الأبوة والأمومة؛ من مضاعفات الحمل أو تحديات الرضاعة الطبيعية، إلى الأطفال الانتقائيين في الأكل. ونؤمن بأن حليب الماعز خيار منطقي عندما يتعلق الأمر بتركيبات حليب الرضع.',
      mobileText: 'نؤمن بأن حليب الماعز خيار منطقي عندما يتعلق الأمر بتركيبات حليب الرضع.',
      usps: [
        { title: 'خبراء في تركيبات حليب الرضع', image: 'usp-infant-formula.svg', width: 156, height: 294 },
        { title: 'أصل هولندي', image: 'usp-netherlands.svg', width: 292, height: 346 },
        { title: 'عشّاق حليب الماعز', image: 'usp-goat.svg', width: 281, height: 235 },
      ],
      button: 'المزيد عنّا',
    },
  },
};
