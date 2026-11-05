import type { Language } from '../../core/i18n/language.service';

/**
 * "Welcome to our Jovie family!" — the parents' testimonials of the official Jovie site
 * (jovieproducts.eu/en, reviews section), in the official English wording and order, with their
 * photos where the official site has one (the others show the official heart placeholder).
 * The Arabic texts are translations of the same testimonials. Used with the brand owner's permission,
 * like the other official Jovie content of this site. Agata's sentence about ordering from the website
 * anywhere in Europe is left out: it does not apply to customers in Egypt.
 */

/**
 * Off for the Egyptian site until approved: these are parents' testimonials about infant formula, and
 * Egypt's rules on marketing breast-milk substitutes (after the WHO International Code) restrict
 * promoting infant formula to the public with testimonials, in particular stories of stopping
 * breastfeeding and health outcomes. Set to true only with written approval from the brand owner and
 * the legal adviser; the section then appears on the shop product page after "Discover all Jovie
 * products by age".
 */
export const SHOW_FAMILY_REVIEWS = false;
export interface FamilyReview {
  id: string;
  /** Photo in /assets/images/jovie/family/, or null for the heart placeholder. */
  image: string | null;
  name: Record<Language, string>;
  text: Record<Language, string>;
}

export const FAMILY_REVIEWS_TITLE: Record<Language, string> = {
  en: 'Welcome to our Jovie family!',
  ar: 'أهلًا بكم في عائلة جوفي!',
};

export const FAMILY_REVIEWS_UI: Record<Language, { readMore: string; previous: string; next: string; carousel: string; slide: string }> = {
  en: {
    readMore: 'Read more',
    previous: 'Previous reviews',
    next: 'Next reviews',
    carousel: 'Reviews from Jovie parents',
    slide: '{index} of {count}',
  },
  ar: {
    readMore: 'اقرأ المزيد',
    previous: 'الآراء السابقة',
    next: 'الآراء التالية',
    carousel: 'آراء أهالي جوفي',
    slide: '{index} من {count}',
  },
};

export const FAMILY_REVIEWS: readonly FamilyReview[] = [
  {
    id: 'agata',
    image: 'agata.webp',
    name: { en: 'Agata, Poland', ar: 'أجاتا، بولندا' },
    text: {
      en: "It is very important to me to provide Lieke with the best products available and I put a lot of effort into reading the labels. Jovie goat milk does not contain soy lecithin, maltodextrin, palm oil or corn syrup. Lieke has been drinking the milk for about two weeks now and we haven't had any stomach aches and she immediately liked the taste. Lieke and her happy tummy highly recommend it!",
      ar: 'من المهم جدًا بالنسبة لي أن أقدّم لـ"ليكه" أفضل المنتجات المتاحة، وأبذل جهدًا كبيرًا في قراءة الملصقات. حليب الماعز من جوفي لا يحتوي على ليسيثين الصويا أو المالتوديكسترين أو زيت النخيل أو شراب الذرة. تشرب ليكه الحليب منذ أسبوعين تقريبًا ولم نواجه أي آلام في البطن، وأحبّت طعمه من أول مرة. ليكه وبطنها السعيد يوصيان به بشدة!',
    },
  },
  {
    id: 'amanda',
    image: null,
    name: { en: 'Amanda, Netherlands', ar: 'أماندا، هولندا' },
    text: {
      en: "After studying the differences in bottle feeding I came to the conclusion that Jovie could be a good alternative for our daughter. Where she drank other brands with difficulty, this was so easy, no fight. It smells pleasant and I have not yet seen any lumps in the preparation. This can also be combined well with breastfeeding, this is really for the moments when I can't or don't want to breastfeed.",
      ar: 'بعد دراسة الفروق بين أنواع الرضاعة الصناعية، وصلت إلى أن جوفي قد يكون بديلًا جيدًا لابنتنا. فبينما كانت تشرب الأنواع الأخرى بصعوبة، كان هذا سهلًا جدًا ودون أي عناء. رائحته لطيفة، ولم أرَ أي كتل عند تحضيره. ويمكن أيضًا الجمع بينه وبين الرضاعة الطبيعية بشكل جيد، فهو حقًا للأوقات التي لا أستطيع فيها أو لا أرغب في الرضاعة الطبيعية.',
    },
  },
  {
    id: 'asia',
    image: null,
    name: { en: 'Asia, Netherlands', ar: 'آسيا، هولندا' },
    text: {
      en: 'I am a satisfied customer of yours and compliments for the good product 😍 I myself breastfeed and every night before going to sleep I give a bottle of Jovie goat milk and that goes perfectly!',
      ar: 'أنا عميلة راضية عنكم، وتحية لكم على هذا المنتج الجيد 😍 أنا أرضع طبيعيًا، وكل ليلة قبل النوم أعطي رضّاعة من حليب الماعز جوفي، والأمر يسير على أكمل وجه!',
    },
  },
  {
    id: 'elizabeth',
    image: 'elizabeth.webp',
    name: { en: 'Elizabeth, Netherlands', ar: 'إليزابيث، هولندا' },
    text: {
      en: 'Before my daughter was born I had bought a can of Jovie infant milk for the main reason that Jovie is a Dutch brand. Our daughter is now 5 months old and she is growing perfectly and she is super satisfied and happy! It was also very nice to combine Jovie with breastfeeding. We are very happy with Jovie! ❤️',
      ar: 'قبل ولادة ابنتي اشتريت علبة من حليب الرضع جوفي، والسبب الرئيسي أن جوفي علامة تجارية هولندية. ابنتنا الآن عمرها 5 أشهر، وتنمو بشكل ممتاز، وهي راضية وسعيدة جدًا! وكان من الجميل أيضًا الجمع بين جوفي والرضاعة الطبيعية. نحن سعداء جدًا بجوفي! ❤️',
    },
  },
  {
    id: 'eveline',
    image: 'eveline.webp',
    name: { en: 'Eveline, Netherlands', ar: 'إيفلين، هولندا' },
    text: {
      en: "Just like with my older sons, I also breastfeed our third son, after which I started to combine this with formula based on goat's milk after a few weeks. Jovie is organic, so the goats can graze outside. That makes me feel good as a mother.",
      ar: 'كما فعلت مع أبنائي الأكبر، أرضع ابننا الثالث رضاعة طبيعية أيضًا، وبعد بضعة أسابيع بدأت أجمع بينها وبين تركيبة أساسها حليب الماعز. جوفي عضوي، لذلك تستطيع الماعز أن ترعى في الهواء الطلق. وهذا يمنحني شعورًا جيدًا كأم.',
    },
  },
  {
    id: 'jet',
    image: 'jet.webp',
    name: { en: 'Jet, Netherlands', ar: 'يت، هولندا' },
    text: {
      en: "I wanted to breastfeed, but it didn't work for me. We have therefore switched to Jovie's organic bottle food. Jovie is a Dutch brand and that attracted us. Our daughter Isabel immediately liked it. It's great to see her growing so well and doing so well!",
      ar: 'كنت أرغب في الرضاعة الطبيعية، لكنها لم تنجح معي. لذلك انتقلنا إلى رضّاعات جوفي العضوية. جوفي علامة تجارية هولندية، وهذا ما جذبنا إليها. ابنتنا إيزابيل أحبّتها من أول مرة. من الرائع أن نراها تنمو جيدًا وبحالة ممتازة!',
    },
  },
  {
    id: 'lois',
    image: null,
    name: { en: 'Lois Crevels, Netherlands', ar: 'لويس كريفلز، هولندا' },
    text: {
      en: "Breastfeeding was not self-evident for us. The first few weeks were difficult. The latch did not work and after a few consultations with a lactation consultant, nipple shields, pumps and different positions we finally seemed to have it under control. And then Yuna and I both got thrush and the feedings became painful sessions that I dreaded. I wanted to breastfeed, but not at all costs. Yet it is easier said than done to make that decision. We went looking for artificial food and ended up with Jovie organic food based on goat's milk. We phased out breastfeeding and without any cramps or problems Yuna is completely over on formula and we have a happy mom again and especially a happy baby 🥰",
      ar: 'لم تكن الرضاعة الطبيعية أمرًا سهلًا بالنسبة لنا. كانت الأسابيع الأولى صعبة؛ لم ينجح الالتقام، وبعد عدة استشارات مع أخصائية رضاعة، واستخدام واقيات الحلمة والمضخات وتجربة أوضاع مختلفة، بدا أخيرًا أننا تمكنّا من السيطرة على الأمر. ثم أُصبت أنا ويونا بالفطريات، وأصبحت الرضعات جلسات مؤلمة كنت أخشاها. كنت أرغب في الرضاعة الطبيعية، ولكن ليس بأي ثمن. ومع ذلك فإن اتخاذ هذا القرار أسهل قولًا من فعله. بحثنا عن تغذية صناعية وانتهى بنا الأمر مع تركيبة جوفي العضوية القائمة على حليب الماعز. أوقفنا الرضاعة الطبيعية تدريجيًا، ودون أي تقلصات أو مشكلات انتقلت يونا بالكامل إلى الحليب الصناعي، وعادت لدينا أم سعيدة، والأهم طفلة سعيدة 🥰',
    },
  },
];

/**
 * The excerpt shown before "Read more": the official site shows the first 150 characters and " ...".
 * Arabic is cut at the last whole word instead, so a word is never split mid-letter.
 */
export function familyExcerpt(text: string, language: Language): string {
  if (text.length <= 150) {
    return text;
  }
  const cut = text.slice(0, 150);
  return (language === 'ar' ? cut.slice(0, cut.lastIndexOf(' ')) : cut) + ' ...';
}
