import type { Language } from '../../core/i18n/language.service';

/*
 * The sections of the official jovieproducts.com home page, in its order: English from
 * jovieproducts.com, Arabic from jovieproducts.com/ae (spelling corrected), used with the brand
 * owner's permission. Text about other markets is replaced by the Egyptian wording: the "Where to
 * find" block keeps our Egypt text, and "First 1000 days" names the Egyptian range (birth to 3
 * years) instead of the pregnancy products sold elsewhere.
 */
export interface HomeContent {
  solution: { title: string; intro: string; cards: { title: string; text: string }[] };
  parents: { title: string; paragraphs: string[]; button: string; more: string };
  organic: { title: string; text: string; button: string; moreDetails: string };
  where: { kicker: string; title: string };
}

const IMG = '/assets/images/jovie/official/home/';

export const HOME_IMAGES = {
  solution: [IMG + 'solution-1.svg', IMG + 'solution-2.svg', IMG + 'solution-3.svg'],
  parents: IMG + 'parents-mother-with-young-child.jpg',
  where: IMG + 'where-young-boy.jpg',
};

export const HOME_CONTENT: Record<Language, HomeContent> = {
  en: {
    solution: {
      title: 'The Jovie Goat Solution',
      intro:
        'Our Jovie Goat products combine the most gentle ingredients, organic where possible, and are nutritionally complete supporting the growth of babies and children keeping them comfortably and happy.',
      cards: [
        { title: 'Organic Goat Milk', text: "Jovie's goat milk products are sustainably produced and as close to nature as possible." },
        { title: "Goat Milk's Unique Composition", text: 'Combining Organic full fat goat milk goodness with carefully selected ingredients.' },
        { title: 'First 1000 days and beyond', text: 'Jovie Goat products support your baby from birth up to 3 years.' },
      ],
    },
    parents: {
      title: 'Just Like You We Are Parents Too',
      paragraphs: [
        'We are caring parents and at the same time we are a team of experts in infant nutrition, knowing the importance of better nutrition that is gentle on tummies.',
        'We believe there are better solutions when it comes to protein sources commonly used in infant nutrition. Nature has more goodness to offer, so why settle for second best?',
      ],
      button: 'Why we started Jovie',
      more: 'Find Out More',
    },
    organic: {
      title: 'Jovie Goat Organic',
      text: 'Jovie Goat is sustainably produced and as close to nature as possible. Our goat milk products are certified according European organic farming standards - produced without synthetic pesticides, genetically modified organisms and hormones.',
      button: 'Jovie products!',
      moreDetails: 'More Details',
    },
    where: { kicker: 'Always Near You', title: 'Where to Find Jovie Goat' },
  },
  ar: {
    solution: {
      title: 'حلول جوفي',
      intro:
        'تجمع منتجات جوفي جوت بين المكونات اللطيفة على الجهاز الهضمي والمكونات العضوية قدر الإمكان، وذلك لتضمن راحة طفلك وسعادته، مع تقديم الدعم الغذائي الكامل له لضمان النمو السليم للأطفال.',
      cards: [
        { title: 'حليب الماعز العضوي', text: 'منتجات جوفي من حليب الماعز منتجة بشكل مستدام وأقرب ما يمكن إلى الطبيعة.' },
        { title: 'تركيبة حليب الماعز الفريدة', text: 'تجمع بين خيرات حليب الماعز العضوي كامل الدسم ومكونات مختارة بعناية.' },
        { title: 'أول 1000 يوم وما بعدها', text: 'منتجات جوفي جوت تدعم طفلك من الولادة حتى عمر 3 سنوات.' },
      ],
    },
    parents: {
      title: 'نحن مثلك تمامًا، نحن آباء وأمهات',
      paragraphs: [
        'نحن آباء وأمهات نرعى أطفالنا، وفي نفس الوقت خبراء في تغذية الأطفال، ولذلك نعلم تمامًا أهمية التغذية السليمة واللطيفة على معدة أطفالنا.',
        'نحن نؤمن بتوافر حلول أفضل عندما يأتي الأمر لمصدر البروتين المستخدم في معظم تركيبات حليب الأطفال والرضع. وحيث يوجد في الطبيعة ما هو «الأفضل»، فلماذا نرضى بغيره؟',
      ],
      button: 'لماذا بدأنا جوفي',
      more: 'اعرف المزيد',
    },
    organic: {
      title: 'جوفي جوت العضوي',
      text: 'يتم إنتاج منتجات جوفي بشكل مستدام وأقرب ما يمكن إلى الطبيعة. منتجاتنا من حليب الماعز معتمدة وفقًا للمعايير الأوروبية للزراعة العضوية، ومنتجة بدون مبيدات حشرية صناعية أو كائنات معدلة وراثيًا أو هرمونات.',
      button: 'منتجات جوفي!',
      moreDetails: 'تفاصيل أكثر',
    },
    where: { kicker: 'دائمًا بالقرب منك', title: 'أين تجدنا' },
  },
};
