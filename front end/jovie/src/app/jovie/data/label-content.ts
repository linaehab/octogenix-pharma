import type { Language } from '../../core/i18n/language.service';
import type { FeedingStage } from './feeding-chart';

/*
 * Texts printed on the Egyptian Jovie Goat tins ("260923 JOVIE 1/2/3 400g EG 2304x A LITHO.pdf",
 * copies in public/downloads/jovie/): English read from the PDFs' text layer ("(fish)" restored
 * where the PDF lost the "fi" ligature), Arabic from the label artwork (spelling corrected). Used
 * by the shop product page; nothing here is our own claim. The ingredient list exists on the tins
 * in Arabic only as artwork, so the Arabic page shows the label image next to the English list.
 */
export interface LabelStage {
  importantNotice: string;
  /** English only (see above). */
  ingredients: string;
  allergens: string;
  friendlyAdvice: string;
  storage: string;
  scoopGrams: number;
}

export interface LabelText {
  preparationIntro: string;
  steps: string[];
  afterPreparation: string;
  stages: Record<FeedingStage, LabelStage>;
}

const INGREDIENTS: Record<FeedingStage, string> = {
  1: 'ORGANIC whole goat milk; ORGANIC lactose (milk); ORGANIC vegetable oils (ORGANIC sunflower oil, ORGANIC rapeseed oil); ORGANIC galacto-oligosaccharides (GOS) (milk); docosahexaenoic acid rich oil (DHA) (fish); arachidonic acid rich oil (AA) (milk); MINERALS (calcium carbonate, sodium citrate, magnesium chloride, sodium chloride, ferrous lactate, zinc sulphate, copper sulphate, manganese sulphate, potassium iodide, sodium selenite); VITAMINS (ascorbic acid, cholecalciferol, dl-alpha-tocopheryl acetate, niacinamide, pantothenic acid, retinyl acetate, thiamine hydrochloride, pyridoxine hydrochloride, folic acid, phytomenadione, biotin, cyanocobalamine); l-choline bitartrate; l-cystine; l-tryptophan; l-tyrosine; inositol; l-carnitine l-tartrate.',
  2: 'ORGANIC whole goat milk; ORGANIC lactose (milk); ORGANIC vegetable oils (ORGANIC sunflower oil, ORGANIC rapeseed oil); ORGANIC galacto-oligosaccharides (GOS) (milk); docosahexaenoic acid rich oil (DHA) (fish); arachidonic acid rich oil (AA) (milk); MINERALS (calcium carbonate, sodium citrate, magnesium chloride, ferrous lactate, zinc sulphate, copper sulphate, manganese sulphate, potassium iodide, sodium selenite); VITAMINS (ascorbic acid, cholecalciferol, dl-alpha-tocopheryl acetate, niacinamide, pantothenic acid, retinyl acetate, thiamine hydrochloride, pyridoxine hydrochloride, folic acid, phytomenadione, biotin, cyanocobalamine); l-cystine; l-tryptophan; l-tyrosine.',
  3: 'ORGANIC whole goat milk; ORGANIC lactose (milk); ORGANIC vegetable oils (ORGANIC sunflower oil, ORGANIC rapeseed oil); ORGANIC galacto-oligosaccharides (GOS) (milk); docosahexaenoic acid rich oil (DHA) (fish); MINERALS (calcium carbonate, trisodium citrate, magnesium chloride, ferrous lactate, zinc sulphate, copper sulphate, manganese sulphate, potassium iodide, sodium selenite); VITAMINS (ascorbic acid, cholecalciferol, dl-alpha-tocopheryl acetate, niacinamide, pantothenic acid, retinyl acetate, thiamine hydrochloride, pyridoxine hydrochloride, folic acid, phytomenadione, biotin, cyanocobalamine); l-cystine; l-tryptophan; l-tyrosine.',
};

const EN_NOTICE = 'The product should be used only after consulting a specialist doctor, when needed and in the appropriate manner for use. Always follow the preparation and storage instructions on the tin. Incorrect preparation and feeding can cause risks to your baby’s health.';
const AR_NOTICE = 'يجب أن يستخدم المنتج فقط بعد استشارة الطبيب المختص وعند الحاجة وبالطريقة المناسبة للاستعمال. اتبعي دائمًا تعليمات التحضير والتخزين الموضحة على العلبة. قد يسبب التحضير والتغذية غير الصحيحة مخاطر صحية لطفلك.';

const EN_FOLLOW_ON_NOTICE = `${EN_NOTICE} The product should not be given to infants under 6 months of age. Infants at this age should be given other complementary foods.`;
const AR_FOLLOW_ON_NOTICE = `${AR_NOTICE} يجب ألا يُعطى للرضع ممن هم أقل من 6 أشهر، ويجب أن يُعطى الرضع في هذا العمر أغذية تكميلية أخرى.`;

const EN_FOLLOW_ON_ADVICE = 'When preparing GOAT follow-on formula, first measure the correct amount of water before adding the required number of scoops to the bottle. Make sure your baby’s teeth are cleaned after the last feeding.';
const AR_FOLLOW_ON_ADVICE = 'عند تحضير تركيبة المتابعة من حليب الماعز، قيسي أولًا الكمية الصحيحة من الماء قبل إضافة العدد المطلوب من المكاييل إلى الزجاجة. تأكدي من تنظيف أسنان طفلك بعد آخر رضعة.';

const EN_FOLLOW_ON_STORAGE = 'Store Goat follow-on milk formula in a cool and dry place (not in the refrigerator). Store in the closed container, away from direct sunlight. Use within 3 weeks after opening.';
const AR_FOLLOW_ON_STORAGE = 'يُخزَّن حليب الماعز للمتابعة في مكان بارد وجاف (ليس في الثلاجة)، في العلبة مغلقة وبعيدًا عن أشعة الشمس المباشرة. يُستخدم في غضون ثلاثة أسابيع بعد الفتح.';

export const LABEL_CONTENT: Record<Language, LabelText> = {
  en: {
    preparationIntro: 'Prepare the milk immediately before feeding. Use only previously boiled or bottled water. Use only the scoop ({grams} g) provided.',
    steps: [
      'Wash your hands thoroughly and make sure the bottle and nipple are clean and sterilised.',
      'First fill the bottle with the correct amount of water at approximately 40°C.',
      'Add the indicated number of level scoops to the water.',
      'Close the bottle and shake carefully until the powder is dissolved.',
      'Test the temperature of the prepared feeding on the inside of your wrist before giving it to your baby.',
      'Make sure the scoop is clean and dry before placing it back inside the tin. Close the tin using its plastic cap.',
    ],
    afterPreparation: 'Always follow the preparation instructions. Discard unfinished milk after feeding and wash the bottle and nipple thoroughly. Use the milk within 1 hour after preparation.',
    stages: {
      1: {
        importantNotice: `${EN_NOTICE} Goat Infant milk can be used from birth till 6 months. Infants should receive complementary foods from 6 months of age onwards.`,
        ingredients: INGREDIENTS[1],
        allergens: 'milk, fish',
        friendlyAdvice: 'When preparing GOAT Infant formula, first measure the correct amount of water before adding the required number of scoops to the bottle.',
        storage: 'Store Goat Infant milk formula in a cool and dry place (not in the refrigerator). Store in the closed container, away from direct sunlight. Use within 3 weeks after opening.',
        scoopGrams: 4.3,
      },
      2: { importantNotice: EN_FOLLOW_ON_NOTICE, ingredients: INGREDIENTS[2], allergens: 'milk, fish', friendlyAdvice: EN_FOLLOW_ON_ADVICE, storage: EN_FOLLOW_ON_STORAGE, scoopGrams: 4.3 },
      3: { importantNotice: EN_FOLLOW_ON_NOTICE, ingredients: INGREDIENTS[3], allergens: 'milk, fish', friendlyAdvice: EN_FOLLOW_ON_ADVICE, storage: EN_FOLLOW_ON_STORAGE, scoopGrams: 4.5 },
    },
  },
  ar: {
    preparationIntro: 'حضّري الرضعة مباشرة قبل التغذية. استخدمي فقط الماء المغلي أو المعبأ مسبقًا. استخدمي المكيال ({grams} جم) المرفق مع المنتج فقط.',
    steps: [
      'اغسلي يديك جيدًا وتأكدي من نظافة وتعقيم الزجاجة والحلمة.',
      'أولًا، املئي الزجاجة بالمقدار الصحيح من الماء عند درجة حرارة 40 درجة تقريبًا.',
      'أضيفي العدد الموضح من المكاييل المتساوية إلى الماء.',
      'أغلقي الزجاجة ورجّيها بعناية حتى يذوب المسحوق.',
      'اختبري درجة حرارة الرضعة على الجزء الداخلي من رسغك قبل تقديمها لطفلك.',
      'تأكدي من نظافة المكيال وجفافه قبل إعادته داخل العلبة. أغلقي العلبة بغطائها البلاستيكي.',
    ],
    afterPreparation: 'اتبعي دائمًا تعليمات التحضير. تخلصي من الحليب غير المستخدم بعد التغذية واغسلي الزجاجة والحلمة جيدًا. استخدمي الحليب في غضون ساعة من التحضير.',
    stages: {
      1: {
        importantNotice: `${AR_NOTICE} يمكن استخدام حليب الماعز للرضع من الولادة حتى 6 أشهر، وبداية من عمر 6 أشهر فما فوق ينبغي أن يتناول الرضع أغذية تكميلية.`,
        ingredients: INGREDIENTS[1],
        allergens: 'الحليب، السمك',
        friendlyAdvice: 'عند تحضير تركيبة الرضع من حليب الماعز، قيسي أولًا الكمية الصحيحة من الماء قبل إضافة العدد المطلوب من المكاييل إلى الزجاجة.',
        storage: 'يُخزَّن حليب الماعز للرضع في مكان بارد وجاف (ليس في الثلاجة)، في العلبة مغلقة وبعيدًا عن أشعة الشمس المباشرة. يُستخدم في غضون ثلاثة أسابيع بعد الفتح.',
        scoopGrams: 4.3,
      },
      2: { importantNotice: AR_FOLLOW_ON_NOTICE, ingredients: INGREDIENTS[2], allergens: 'الحليب، السمك', friendlyAdvice: AR_FOLLOW_ON_ADVICE, storage: AR_FOLLOW_ON_STORAGE, scoopGrams: 4.3 },
      3: { importantNotice: AR_FOLLOW_ON_NOTICE, ingredients: INGREDIENTS[3], allergens: 'الحليب، السمك', friendlyAdvice: AR_FOLLOW_ON_ADVICE, storage: AR_FOLLOW_ON_STORAGE, scoopGrams: 4.5 },
    },
  },
};
