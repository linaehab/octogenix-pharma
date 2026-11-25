import type { Language } from '../../core/i18n/language.service';

/*
 * "How To Prepare Formula" on /jovieEgypt/feeding-guide: the questions and answers supplied by the
 * client, word for word, in the order of the design reference. In the answers, **text** is shown
 * in bold and *text* in italics, as in the supplied copy.
 */
export interface PreparationFaq {
  title: string;
  items: { question: string; answer: string }[];
}

export const PREPARATION_FAQ: Record<Language, PreparationFaq> = {
  en: {
    title: 'How To Prepare Formula',
    items: [
      {
        question: 'How do I mix Jovie baby formula?',
        answer:
          'Using the feeding chart on your tin, measure the water into a sterilised bottle first. Add **one level scoop of Jovie powder for every 30 ml of water**, using the scoop supplied with your tin. Close the bottle and shake gently until the powder dissolves.',
      },
      {
        question: 'What type of water should I use to prepare Jovie formula?',
        answer:
          'You can use **previously boiled water** or **bottled water**. Jovie’s European preparation guide specifies a water temperature of **about 40°C when mixing**. Measure the water into a sterilised bottle *before* adding the powder, following the feeding chart on your tin. Before feeding, place a few drops on the inside of your wrist to check the temperature.',
      },
      {
        question: 'How long does prepared Jovie formula last?',
        answer:
          'Use a freshly prepared bottle **within 1 hour of preparation**. If you prepare a bottle in advance, place it immediately at the back of the fridge at **4°C or below** and use it **within 8 hours of preparation**. Jovie recommends storing each feed in its own bottle. Once your baby has finished feeding, discard any milk left in the bottle.',
      },
      {
        question: 'Can I warm a refrigerated bottle of Jovie formula?',
        answer:
          'Yes. If you refrigerated the bottle immediately after preparation and your baby hasn’t drunk from it, you can warm it just before feeding. Check the temperature on the inside of your wrist before offering it. After the feed, discard any milk left in the bottle.',
      },
      {
        question: 'How much Jovie formula should I feed my baby?',
        answer:
          'Follow the feeding chart on your Jovie tin. For **Stage 1**, use your baby’s current weight to find the right row. For **Stage 2**, use your baby’s age. The chart shows how much water and how many level scoops to use per feed, along with the suggested number of feeds in 24 hours. If your paediatrician has recommended a different feeding plan, follow their advice.',
      },
      {
        question: 'What temperature should Jovie formula be?',
        answer:
          'Jovie recommends using water at **approximately 40°C** when mixing the formula. Before feeding, check the temperature of the prepared milk by placing a few drops on the inside of your wrist. Follow the preparation instructions on your Jovie tin.',
      },
    ],
  },
  ar: {
    title: 'طريقة تحضير الرضعة',
    items: [
      {
        question: 'إزاي أحضّر رضعة جوفي؟',
        answer:
          'قيسي كمية المياه حسب جدول التغذية الموجود على العبوة، وصبّيها الأول في ببرونة معقّمة. أضيفي **مكيال ممسوح من مسحوق جوفي لكل 30 مل مياه** باستخدام المكيال المرفق بالعبوة. اقفلي الببرونة ورجّيها برفق لحد ما المسحوق يذوب تمامًا.',
      },
      {
        question: 'أستخدم إيه من المياه لتحضير رضعة جوفي؟',
        answer:
          'ممكن تستخدمي **مياه سبق غليها** أو **مياه معبّأة**. حسب دليل جوفي الأوروبي، تكون حرارة المياه **حوالي 40°م وقت الخلط**. قيسي كمية المياه حسب جدول التغذية على العبوة، وصبّيها في ببرونة معقّمة قبل ما تضيفي المسحوق. وقبل الرضاعة، حطّي كام نقطة على باطن معصمك للتأكّد إن حرارة الرضعة مناسبة.',
      },
      {
        question: 'ينفع أحتفظ برضعة جوفي قد إيه بعد التحضير؟',
        answer:
          'لو هتقدّمي الرضعة طازة، استخدميها **خلال ساعة من وقت التحضير**. ولو بتحضّريها مسبقًا، حطّي كل رضعة في ببرونة منفصلة في آخر التلاجة فور التحضير، على درجة حرارة **4°م أو أقل**، واستخدميها **خلال 8 ساعات من وقت التحضير**. بعد ما طفلك يخلّص الرضعة، تخلّصي من أي لبن متبقّي في الببرونة.',
      },
      {
        question: 'ينفع أدفّي رضعة جوفي بعد ما أطلعها من التلاجة؟',
        answer:
          'أيوه، لو حطّيتي الببرونة في التلاجة فور التحضير وطفلك لسه ما شربش منها، تقدري تدفّيها قبل الرضاعة مباشرة. حطّي كام نقطة على باطن معصمك عشان تتأكدي إن حرارتها مناسبة. وبعد ما طفلك يخلّص الرضعة، تخلّصي من أي لبن باقي في الببرونة.',
      },
      {
        question: 'أدي طفلي قد إيه من حليب جوفي؟',
        answer:
          'اتبعي جدول التغذية على عبوة جوفي. في **المرحلة الأولى**، اختاري الصف حسب وزن طفلك الحالي، وفي **المرحلة التانية** اختاريه حسب عمره. هتلاقي في نفس الصف كمية المياه وعدد المكاييل الممسوحة لكل رضعة، وعدد الرضعات المقترح خلال 24 ساعة. ولو طبيب الأطفال حدّد لطفلك نظام تغذية مختلف، اتّبعي توصيته.',
      },
      {
        question: 'ما درجة الحرارة المناسبة لحليب جوفي؟',
        answer:
          'توصي جوفي بأن تكون **حرارة الماء عند إضافة المسحوق نحو ٤٠ درجة مئوية**. وقبل تقديم الرضعة لطفلك، ضعي بضع قطرات من الحليب على باطن معصمك للتأكد من أن حرارته مناسبة للرضاعة. اتّبعي تعليمات التحضير المدوّنة على عبوة جوفي.',
      },
    ],
  },
};
