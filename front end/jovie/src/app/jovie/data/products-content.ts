import type { Language } from '../../core/i18n/language.service';

/*
 * The official "Jovie Goat Products" pages: English from jovieproducts.com/jovie-goat-products/,
 * Arabic from jovieproducts.com/ae/products/ (spelling corrected), used with the brand owner's
 * permission. Every tin picture is the EGYPTIAN packaging: the flat labels of
 * "260923 JOVIE 1/2/3 400g EG 2304x A LITHO.pdf" wrapped around the tin of the official packshot.
 * The name, age and weight shown with each product are read from those labels.
 */
export type ProductSlug = 'infant-goat-milk' | 'follow-on-goat-milk' | 'toddler-goat-milk';
export type ProductTone = 'yellow' | 'pink' | 'blue';
export type ProductView = 'front' | 'table' | 'ingredients' | 'prepare';

/** Gallery order of the official product header: Front, View right, View left, View back. */
export const PRODUCT_VIEWS: readonly ProductView[] = ['front', 'table', 'ingredients', 'prepare'];

export interface ProductInfo {
  slug: ProductSlug;
  stage: 1 | 2 | 3;
  tone: ProductTone;
  /** Egyptian label PDF (an unchanged copy of the print file), offered as "Download product details". */
  download: string;
  ctaImage: string;
}

const IMG = '/assets/images/jovie/products/';
const PDF = '/downloads/jovie/';

export const PRODUCTS: readonly ProductInfo[] = [
  {
    slug: 'infant-goat-milk',
    stage: 1,
    tone: 'yellow',
    download: PDF + 'jovie-goat-1-infant-formula-egypt-label.pdf',
    ctaImage: IMG + 'cta-infant.jpg',
  },
  {
    slug: 'follow-on-goat-milk',
    stage: 2,
    tone: 'pink',
    download: PDF + 'jovie-goat-2-follow-on-formula-egypt-label.pdf',
    ctaImage: IMG + 'cta-follow-on.jpg',
  },
  {
    slug: 'toddler-goat-milk',
    stage: 3,
    tone: 'blue',
    download: PDF + 'jovie-goat-3-toddler-formula-egypt-label.pdf',
    ctaImage: IMG + 'cta-toddler.jpg',
  },
];

export const productImage = (stage: number, view: ProductView, zoom = false): string =>
  `${IMG}eg-stage-${stage}-${view}${zoom ? '-zoom' : ''}.webp`;

export const productLink = (slug: ProductSlug): string => `/jovie/products/${slug}`;

/** The "More information" links of the official benefits point to the matching part of our Why page. */
export const USP_LINKS = ['/jovie/why/makes-good-sense', '/jovie/why/makes-good-sense', '/jovie/why/makes-good-sense'];
export const USP_FRAGMENTS = ['digest', 'fat', 'fat'];

export interface ProductText {
  name: string;
  /** Name and age printed on the Egyptian tin. */
  labelName: string;
  labelAge: string;
  allAboutTitle: string;
  intro: [string, string];
  cta: { kicker: string; title: string; text: string };
}

export interface ProductsContent {
  brand: string;
  listing: {
    title: string;
    stage: string;
    netWeight: string;
    moreDetails: string;
    findTitle: string;
    findText: string;
    findButton: string;
  };
  detail: {
    whereToFind: string;
    previousProduct: string;
    nextProduct: string;
    previousView: string;
    nextView: string;
    zoom: string;
    closeZoom: string;
    views: Record<ProductView, string>;
    cloudFront: string;
    cloudOther: string;
    imageAlt: string;
    usps: { title: string; text: string }[];
    moreInformation: string;
    download: string;
    downloadNote: string;
    clickHere: string;
    quotesTitle: string;
    quotesText: string;
    shareStory: string;
    quotes: { text: string; name: string; role: string; image: string }[];
  };
  products: Record<ProductSlug, ProductText>;
}

const QUOTE_IMAGES = { henrike: IMG + 'quote-henrike.jpg', frederieke: IMG + 'quote-frederieke.jpg', richard: IMG + 'quote-richard.jpg' };

export const PRODUCTS_CONTENT: Record<Language, ProductsContent> = {
  en: {
    brand: 'Jovie Goat',
    listing: {
      title: 'Discover All Our Products',
      stage: 'Stage {stage}',
      netWeight: 'Net weight 400 g',
      moreDetails: 'More Details',
      findTitle: 'Find Jovie Goat Near You',
      findText: 'Jovie Goat is currently available in several countries. Discover where to find it at a store near you.',
      findButton: 'Find Jovie',
    },
    detail: {
      whereToFind: 'Where to find',
      previousProduct: 'Previous product: {name}',
      nextProduct: 'Next product: {name}',
      previousView: 'Previous view',
      nextView: 'Next view',
      zoom: 'Zoom in on the tin',
      closeZoom: 'Close',
      views: { front: 'Front', table: 'View right', ingredients: 'View left', prepare: 'View back' },
      cloudFront: 'This product is certified organic!',
      cloudOther: 'The ingredients and composition may vary per country',
      imageAlt: '{name} tin, Egyptian packaging: {view}',
      usps: [
        {
          title: 'Goat Protein Power!',
          text: 'Goat milk contains unique proteins that promotes easy digestion. Goat milk is soft and gentle on the tummy. It easily passes from the stomach into the intestines for further digestion.',
        },
        {
          title: 'Full Fat Milk Goodness',
          text: "Infants receive about half of their caloric intake from fat. Jovie formulas include goat milk fat because of its inherent benefits; natural beta-palmitate and MCT's for comfort and energy.",
        },
        {
          title: 'DHA & AA – Brain and Eye Nutrients',
          text: 'Both DHA and AA are fatty acids supporting infant brain and eye development encouraging cognitive function and visual acuity.',
        },
      ],
      moreInformation: 'More information',
      download: 'Download product details',
      downloadNote: 'The Egyptian label of this tin (PDF)',
      clickHere: 'Just click here.',
      quotesTitle: 'What People Say',
      quotesText: 'Stay tuned and follow us and other families. Send us your pictures of your adventures and be a part of the Jovie Family.',
      shareStory: 'Share your story',
      quotes: [
        {
          text: 'It’s a privilege to work with goat milk as a protein and fat source; we start with the best possible base to get to a great end product!',
          name: 'Henrike',
          role: 'R&D and Quality Assurance for Jovie',
          image: QUOTE_IMAGES.henrike,
        },
        {
          text: 'So happy that there is the option to choose for goat milk! In the case of our daughter, it was the perfect transition after breastfeeding.',
          name: 'Frederieke',
          role: 'Nursepractitioner',
          image: QUOTE_IMAGES.frederieke,
        },
        {
          text: 'Our baby son was experiencing discomfort when drinking a cow milk formula. We switched to goat milk formula, and he was happier and relaxed',
          name: 'Richard',
          role: '',
          image: QUOTE_IMAGES.richard,
        },
      ],
    },
    products: {
      'infant-goat-milk': {
        name: 'Organic Infant Goat Milk',
        labelName: 'Infant Formula',
        labelAge: 'From 0-6 months',
        allAboutTitle: 'All About Jovie Goat Organic Infant Milk',
        intro: [
          'Breastmilk is the gold standard when it comes to infant nutrition. Some women however, cannot or choose not to breastfeed. Jovie Goat Organic Infant Milk provides the perfect amount of nutrients so you can confidently nourish your baby from birth onwards.',
          'Jovie provides goat milk goodness. Each ingredient that goes into our formula is carefully selected so growing babies get exactly what they need. Nothing more, nothing less.',
        ],
        cta: {
          kicker: 'When Breastfeeding is not an Option',
          title: 'Goat Milk Formula Should be the Preferred Choice',
          text: 'All Jovie products are made with high quality goat milk ensuring a rich, mild flavour in combination with easy to digest proteins. A unique combination of organic goat milk with advanced ingredients.',
        },
      },
      'follow-on-goat-milk': {
        name: 'Organic Follow-on Goat Milk',
        labelName: 'Follow-on Formula',
        labelAge: 'From 6-12 months',
        allAboutTitle: 'All About Jovie Goat Follow-on Milk',
        intro: [
          "Babies are amazing! By now you can start to introduce fruit or veggies into your baby's diet. Jovie Goat Organic Follow-on Milk is suitable from 6 months onwards and provides the perfect amount of nutrients so you can confidently nourish your baby.",
          'Breastmilk is still the gold standard. Jovie Goat Follow-on Milk provides goat milk goodness. Each ingredient that goes into our formula is carefully selected so growing babies get exactly what they need. Nothing more, nothing less.',
        ],
        cta: {
          kicker: 'When Breastfeeding is Not an Option',
          title: 'Goat Milk Formula Should be the Preferred Choice',
          text: 'All Jovie products are made with high quality goat milk ensuring a rich, mild flavour in combination with easy to digest proteins. A unique combination of organic goat milk with advanced ingredients.',
        },
      },
      'toddler-goat-milk': {
        name: 'Organic Toddler Goat Milk',
        labelName: 'Follow-on Formula for Toddlers',
        labelAge: 'From 1-3 years',
        allAboutTitle: 'All About Jovie Goat Toddler Milk',
        intro: [
          "The toddler years are busy, busy, busy! Growing up requires a lot of energy. Your toddler's nutritional needs are different from those of a baby. Sometimes, it can be difficult to make sure they are getting the proper nutrition they need.",
          'Jovie Goat Organic Toddler Milk provides goat milk goodness. Each ingredient that goes into our formula is carefully selected so growing toddlers get an extra of exactly what they need. No more worries!',
        ],
        cta: {
          kicker: 'A dietary insurance',
          title: 'Organic Toddler Goat Milk',
          text: 'Your little one is growing up so fast. Jovie Goat Organic Toddler Milk supports the healthy development and growth of your child. Jovie Goat combines naturally easy to digest organic goat milk with the most advanced ingredients.',
        },
      },
    },
  },
  ar: {
    brand: 'جوفي جوت العضوي',
    listing: {
      title: 'اكتشف جميع المنتجات',
      stage: 'المرحلة {stage}',
      netWeight: 'الوزن الصافي 400 جم',
      moreDetails: 'تفاصيل أكثر',
      findTitle: 'أين تجد جوفي',
      findText: 'تتوفر جوفي حاليًا في عدة دول، اكتشفي أين تجدينها بالقرب منك.',
      findButton: 'أين تجد جوفي',
    },
    detail: {
      whereToFind: 'أين تجدنا',
      previousProduct: 'المنتج السابق: {name}',
      nextProduct: 'المنتج التالي: {name}',
      previousView: 'العرض السابق',
      nextView: 'العرض التالي',
      zoom: 'تكبير صورة العلبة',
      closeZoom: 'إغلاق',
      views: { front: 'الواجهة', table: 'عرض اليمين', ingredients: 'عرض اليسار', prepare: 'عرض الخلف' },
      cloudFront: 'هذا منتج عضوي معتمد!',
      cloudOther: 'قد تختلف المكونات والتركيبة حسب الدولة',
      imageAlt: 'علبة {name}، العبوة المصرية: {view}',
      usps: [
        {
          title: 'قوة بروتين الماعز!',
          text: 'يحتوي حليب الماعز على بروتينات فريدة تحفز سهولة الهضم. حليب الماعز لطيف وخفيف على المعدة، فيمر بسهولة من المعدة إلى الأمعاء لتكتمل عملية الهضم بطريقة سلسة.',
        },
        {
          title: 'خيرات الحليب كامل الدسم',
          text: 'يستهلك جسم الطفل نصف احتياجاته من الطاقة من الدهون (السعرات الحرارية). لذلك حافظت جوفي على الدسم (الدهون الطبيعية) في حليب الماعز العضوي للمحافظة على مزاياه في التركيبة، كدهون البيتا بالميتات (OPO) سهلة الهضم، والدهون متوسطة السلسلة (MCT) التي تمد الجسم بطاقة أفضل بالإضافة إلى كونها مريحة في الهضم.',
        },
        {
          title: 'دهون دي إتش إيه وإيه إيه (DHA & AA) - مغذيات المخ والعين',
          text: 'كلاهما أحماض دهنية تدعم تطور المخ والعينين، وتحفز مراكز الإدراك وحدة البصر.',
        },
      ],
      moreInformation: 'معلومات أخرى',
      download: 'تحميل تفاصيل المنتج',
      downloadNote: 'ملصق العبوة المصرية لهذا المنتج (PDF)',
      clickHere: 'فقط انقر هنا',
      quotesTitle: 'ماذا يقول الناس',
      quotesText: 'انضم إلينا وإلى عائلات أخرى اختارت راحة أطفالها. أرسل لنا صورتك مع مراحل نمو طفلك، وانضم إلى عائلة جوفي.',
      shareStory: 'شاركي قصتك',
      quotes: [
        {
          text: 'إنه لمن المميز جدًا أن نستخدم حليب الماعز كمصدر للبروتينات والدهون في المنتجات. بدأنا باختيار أفضل أساس لتركيبة الحليب، وذلك لنصل إلى أفضل منتج نهائي.',
          name: 'هنريك',
          role: 'قسم البحوث والجودة في شركة جوفي',
          image: QUOTE_IMAGES.henrike,
        },
        {
          text: 'أنا سعيد جدًا لوجود خيار حليب الماعز للأطفال! في حالة ابنتي كان حليب الماعز هو الاختيار الأمثل بعد الرضاعة الطبيعية.',
          name: 'فريدريك',
          role: 'ممرض',
          image: QUOTE_IMAGES.frederieke,
        },
        {
          text: 'كنا نعاني مع طفلنا الصغير بسبب عسر الهضم الذي يعانيه بعد تناوله حليب الأبقار، ولكنه تحسن بعد ما حولناه إلى حليب الماعز، فأصبح أهدأ وأسعد.',
          name: 'ريتشارد',
          role: 'أب',
          image: QUOTE_IMAGES.richard,
        },
      ],
    },
    products: {
      'infant-goat-milk': {
        name: 'حليب الرضع',
        labelName: 'تركيبة غذائية للرضع',
        labelAge: 'من (0 - 6) أشهر',
        allAboutTitle: 'كل ما يتعلق بجوفي جوت تركيبة حليب الرضع العضوية',
        intro: [
          'عندما يتعلق الأمر بتغذية الرضع فإن حليب الأم هو الاختيار الأمثل. ولكن في بعض الأحيان تكون الرضاعة الطبيعية غير متاحة، إما لمشاكل صحية تمنعها أو لظروف خارجة عن إرادة الأم. تقدم تركيبة حليب الرضع جوفي جوت الكمية المثالية من العناصر الغذائية للطفل الرضيع، بحيث تثقين بأن طفلك يحصل على التغذية السليمة بداية من الولادة وحتى يكبر.',
          'جوفي تقدم خيرات حليب الماعز ومزاياه. فكل المكونات في تركيبتنا منتقاة بعناية شديدة لتواكب متطلبات نمو الطفل الرضيع، بلا زيادة أو نقصان.',
        ],
        cta: {
          kicker: 'عندما تكون الرضاعة الطبيعية غير متاحة',
          title: 'اختيارك لحليب الماعز يجب أن يكون الخيار الأول',
          text: 'صُنعت جميع منتجات جوفي من حليب ماعز عالي الجودة لنضمن طعمًا غنيًا وخفيفًا مع سهولة هضم البروتينات. وتحتوي على مجموعة فريدة من المكونات المتطورة، بالإضافة إلى أنها مؤسسة على حليب الماعز العضوي سهل الهضم.',
        },
      },
      'follow-on-goat-milk': {
        name: 'حليب المتابعة',
        labelName: 'تركيبة للمتابعة من حليب الماعز العضوي',
        labelAge: 'من (6 - 12) أشهر',
        allAboutTitle: 'كل ما يتعلق بجوفي جوت تركيبة حليب المتابعة العضوية',
        intro: [
          'الأطفال مذهلون! من الآن تستطيعين تقديم الفواكه والخضروات في وجبات طفلك. جوفي جوت تركيبة حليب الماعز العضوي للمتابعة مناسبة للأطفال من عمر ستة أشهر، وتقدم لهم الكمية المثالية من العناصر الغذائية لتطمئني على تغذية طفلك بصورة سليمة.',
          'يبقى حليب الأم هو الاختيار الأمثل للطفل. جوفي جوت تركيبة حليب الماعز العضوي للمتابعة تقدم خيرات حليب الماعز للطفل، فكل المكونات في تركيبتنا منتقاة بعناية شديدة لتواكب متطلبات نمو الطفل، بلا زيادة أو نقصان.',
        ],
        cta: {
          kicker: 'عندما تكون الرضاعة الطبيعية غير متاحة',
          title: 'اختيارك لحليب الماعز يجب أن يكون الخيار الأول',
          text: 'صُنعت جميع منتجات جوفي من حليب ماعز عضوي عالي الجودة لنضمن طعمًا غنيًا وخفيفًا بالإضافة إلى سهولة هضم البروتينات. وتحتوي أيضًا على مجموعة حديثة من العناصر الغذائية الفريدة، مع كونها مؤسسة على حليب الماعز العضوي المميز سهل الهضم.',
        },
      },
      'toddler-goat-milk': {
        name: 'حليب النمو',
        labelName: 'تركيبة للمتابعة من حليب الماعز العضوي للأطفال',
        labelAge: 'من (1 - 3) سنوات',
        allAboutTitle: 'كل ما يتعلق بجوفي جوت تركيبة حليب النمو العضوية',
        intro: [
          'مرحلة نمو الطفل مليئة بالأحداث، فالنمو يتطلب الكثير من الطاقة. واحتياجات طفلك بعد عمر السنة تختلف عن احتياجات الرضع، وفي بعض الأحيان يكون من الصعب التأكد من حصوله على العناصر الغذائية المهمة لنموه.',
          'جوفي تقدم خيرات حليب الماعز، فكل المكونات في تركيبتنا منتقاة بعناية شديدة لتواكب متطلبات نمو الطفل في هذه المرحلة، لا أقل ولا أكثر.',
        ],
        cta: {
          kicker: 'تأكيد على الوجبة الغذائية',
          title: 'جوفي جوت تركيبة حليب النمو العضوية',
          text: 'طفلك الصغير ينمو بسرعة. تدعم تركيبة حليب النمو العضوية جوفي جوت التطور الصحي والنمو السليم لطفلك، وتجمع التركيبة بين أحدث المكونات وحليب الماعز العضوي سهل الهضم.',
        },
      },
    },
  },
};
