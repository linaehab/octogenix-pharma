import type { Language } from '../../core/i18n/language.service';

/*
 * Official Jovie FAQ from jovieproducts.com/ae-en/faq/ (English) and jovieproducts.com/ae/faq/
 * (Arabic), used with the brand owner's permission, in its version for Egypt:
 * - the parent company's e-mail addresses are replaced by {email} and {phone}, filled in with the
 *   Octogenix Pharma contact details from the site settings;
 * - Egypt is added to "Where can I buy Jovie products?" (also added to the Arabic page, which
 *   did not have this question);
 * - spelling and grammar mistakes of the original are corrected.
 * Otherwise the order and wording are as published.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const FAQ_CONTENT: Record<Language, FaqGroup[]> = {
  en: [
    {
      title: "About the Use",
      items: [
        {
          question: "Can I use Jovie goat milk products if my child has a cow milk protein allergy?",
          answer: "Jovie goat milk products are not suitable for children with a confirmed cow milk protein allergy. Differences exist between the protein composition of goat milk and cow milk, however, an allergic reaction may still occur. Luckily, a confirmed cow milk protein allergy only occurs to 3% of the infant population. A much larger group experiences a sensitive response when drinking cow milk. Since every child is different, we advise you to consult your healthcare provider about your child's symptoms and to discuss your goat milk feeding options.",
        },
        {
          question: "Can I use Jovie goat milk products if my child has lactose intolerance?",
          answer: "Jovie goat milk products are not suitable for children with a diagnosed lactose intolerance. Lactose is the naturally occurring carbohydrate in human breastmilk, which is why we choose to use lactose in our Jovie goat milk products too. If your child has a cow milk sensitivity, we advise you to consult your health care provider about your child's symptoms and to discuss your goat milk feeding options.",
        },
        {
          question: "How do I start with Jovie Infant Milk after breastfeeding?",
          answer: "Breastfeeding is the ideal source of nutrition for your baby. Jovie Infant Milk is completely safe to use for your baby and can be introduced at any time desired. To make sure your baby will get used to infant milk it is best to gradually introduce the new form of nutrition to your baby. For instance, change 1 time breastfeeding by 1 bottle of Jovie Infant Milk every 4 days. You can always consult your health care professional for further advice.",
        },
        {
          question: "Is Jovie infant milk suitable from birth onwards?",
          answer: "Breastfeeding is the ideal source of nutrition for your baby. If you do not wish or cannot breastfeed, Jovie Infant Milk is completely safe and nutritionally suitable for your baby from birth onwards.",
        },
        {
          question: "When my baby turns 6 months old, should I immediately switch to Jovie Goat Follow-on Milk?",
          answer: "If you have an opened can of Jovie stage 1 infant milk, you can safely use it when your baby turns 6 months old. Do you still have a question about this? Send an email to {email}, call us on {phone} or contact your healthcare professional or nutritionist.",
        },
        {
          question: "Where can I buy Jovie products?",
          answer: "Of course we want Jovie to be available for every baby and parent in the world. Our products are currently available in Europe, parts of the Middle East, Vietnam and Egypt, where Jovie is distributed by Octogenix Pharma. For more information, go to their local website.",
        },
      ],
    },
    {
      title: "About the Product",
      items: [
        {
          question: "Does Jovie Formula contain allergens?",
          answer: "The composition of the Jovie Organic Goat Milk formulas may vary per country. You can check out the specific allergen information on the tin you purchased or find information on the Jovie website of your country. However, all our Jovie products contain goat milk; milk is specified as an allergen.",
        },
        {
          question: "Does Jovie Goat Infant Formula contain all the nutrients my baby needs?",
          answer: "Yes. Jovie organic infant formula is formulated according to European guidelines established by the EFSA (European Food Safety Authority). From about 4 to 6 months, solid foods (snacks) can be given to supplement your baby's diet. Please also discuss this with your children's healthcare centre or doctor.",
        },
        {
          question: "Why should I choose a goat milk formula?",
          answer: "Most importantly, you as a parent should feel comfortable with this choice for your baby! Goat milk is known for its naturally easy to digest properties. The soft and loose curd formed in the stomach results in smooth passage into the intestines for further digestion. This is very comforting for babies sensitive to cow milk too. The use of whole goat milk also comes with high levels of easily digestible short- and medium-chain fatty acids. On top of that, goat milk is rich in highly bioavailable and critical micronutrients. The result: a comfortable goat milk choice!",
        },
        {
          question: "What about Jovie Goat's taste and smell?",
          answer: "Do not worry! Jovie goat milk formula is just as delicious as a cow's milk formula. By using fresh, high quality goat milk, we ensure that our Jovie products are tasty and do not have a 'goaty' taste or smell.",
        },
        {
          question: "Is Jovie Goat certified organic?",
          answer: "Jovie Goat is European Certified Organic according to European organic guidelines. This means that we only use the best (organic certified) goat milk, derived from goats that can graze and are fed with non-genetically modified (non-GMO) feed that is certified organic and grown without synthetic pesticides and fertilizers.",
        },
        {
          question: "Do Jovie's organic formulas contain hormones, antibiotics or pesticides?",
          answer: "Like all infant formulas in Europe, Jovie must comply with very strict regulations regarding the absence of hormones, antibiotics, pesticides and other contaminants. Jovie takes it one step further; we use organic goat milk and our goats only get non-GMO feed.",
        },
        {
          question: "What are DHA and AA?",
          answer: "Unlike other organic formulas, Jovie Goat organic formulas are enriched with AA and DHA. These are polyunsaturated fats, which occur naturally in breast milk. Both fatty acids can be formed in the body from other dietary fatty acids, but the addition of DHA has been shown to be beneficial for the normal growth and development of babies' brains, nerves and eyes.",
        },
      ],
    },
    {
      title: "About the Company",
      items: [
        {
          question: "Where is Jovie located?",
          answer: "Jovie is a brand owned by Unica Global B.V., located in the Netherlands.",
        },
        {
          question: "Where is Jovie produced?",
          answer: "We work closely with specialized and certified factories in Denmark to produce our Jovie Organic baby formulas.",
        },
        {
          question: "How can I reach Jovie?",
          answer: "If you have a question about our products or about the use of our products, please go to the contact page, send an email to {email} or call us on {phone} and we will get back to you as soon as possible!",
        },
        {
          question: "What's in a name?",
          answer: "Jovie is derived from ‘Joie de vivre’, which means ‘Joy of living’. Something we would wish for all parents and babies around the world! It’s not just expressed by our sunny Jovie logo. We use whole goat milk as no. 1 ingredient in all our products. Hello happy babies, happy goats, and happy planet!",
        },
      ],
    },
  ],
  ar: [
    {
      title: "كيفية الاستخدام؟",
      items: [
        {
          question: "هل يمكنني استخدام منتجات حليب الماعز من «جوفي» إذا كان طفلي يعاني من حساسية تجاه بروتين حليب البقر؟",
          answer: "منتجات حليب الماعز من «جوفي» غير مناسبة للأطفال الذين يعانون من حساسية مؤكدة تجاه بروتين حليب البقر. ورغم وجود اختلافات في التركيب البروتيني بين حليب الماعز وحليب البقر، إلا أنه لا يزال من الممكن حدوث رد فعل تحسسي. لحسن الحظ، لا تحدث حساسية مؤكدة تجاه بروتين حليب البقر إلا لدى 3% من الرضع. وهناك مجموعة أكبر بكثير تعاني من استجابة حساسية عند شرب حليب البقر. ونظرًا لاختلاف كل طفل عن الآخر، ننصحك باستشارة مقدم الرعاية الصحية الخاص بك بشأن أعراض طفلك ومناقشة خيارات تغذيته بحليب الماعز.",
        },
        {
          question: "كيف أبدأ بإعطاء حليب الأطفال «جوفي» بعد الرضاعة الطبيعية؟",
          answer: "الرضاعة الطبيعية هي المصدر المثالي لتغذية طفلك. حليب الأطفال «جوفي» آمن تمامًا لاستخدامه مع طفلك ويمكن البدء بإعطائه في أي وقت تريدينه. وللتأكد من أن طفلك سيتعود على حليب الأطفال، من الأفضل إدخال هذا النوع الجديد من التغذية إلى نظام تغذية طفلك تدريجيًّا. على سبيل المثال، استبدلي جلسة رضاعة طبيعية واحدة بزجاجة واحدة من حليب الأطفال «جوفي» كل 4 أيام. يمكنك دائمًا استشارة أخصائي الرعاية الصحية للحصول على مزيد من النصائح.",
        },
        {
          question: "هل حليب الأطفال «جوفي» مناسب منذ الولادة فصاعدًا؟",
          answer: "الرضاعة الطبيعية هي المصدر المثالي لتغذية طفلك. إذا كنتِ لا ترغبين في الرضاعة الطبيعية أو لم تتمكني منها، فإن حليب الأطفال «جوفي» آمن تمامًا ومناسب من الناحية الغذائية لطفلك منذ الولادة فصاعدًا.",
        },
        {
          question: "هل يمكنني استخدام منتجات حليب الماعز من «جوفي» إذا كان طفلي يعاني من عدم تحمل اللاكتوز؟",
          answer: "منتجات حليب الماعز من «جوفي» غير مناسبة للأطفال الذين تم تشخيص إصابتهم بعدم تحمل اللاكتوز. واللاكتوز هو الكربوهيدرات الموجود بشكل طبيعي في حليب الأم، ولهذا السبب نختار استخدام اللاكتوز في منتجات حليب الماعز من «جوفي» أيضًا. إذا كان طفلك يعاني من حساسية تجاه حليب البقر، فننصحك باستشارة مقدم الرعاية الصحية الخاص بك بشأن أعراض طفلك ومناقشة خيارات تغذيته بحليب الماعز.",
        },
        {
          question: "عندما يبلغ طفلي 6 أشهر من العمر، هل يجب أن أبدل حليبه على الفور إلى حليب «جوفي» التكميلي المصنوع من حليب الماعز؟",
          answer: "إذا كان لديك علبة مفتوحة من حليب الرضع «جوفي» (Jovie) المرحلة الأولى، فيمكنك استخدامها بأمان عندما يبلغ طفلك 6 أشهر من العمر. هل لا يزال لديك سؤال حول هذا الموضوع؟ أرسل بريدًا إلكترونيًّا إلى {email}، أو اتصل بنا على {phone}، أو استشر أخصائي الرعاية الصحية أو أخصائي التغذية الخاص بك.",
        },
        {
          question: "أين يمكنني شراء منتجات «جوفي»؟",
          answer: "بالطبع نريد أن تكون «جوفي» متاحة لكل طفل ولكل أب وأم في العالم. منتجاتنا متوفرة حاليًا في أوروبا وأجزاء من الشرق الأوسط وفيتنام ومصر، حيث توزعها أوكتوجينيكس فارما. لمزيد من المعلومات، تفضل بزيارة الموقع الإلكتروني الخاص ببلدك.",
        },
      ],
    },
    {
      title: "أسئلة حول المنتج",
      items: [
        {
          question: "هل تحتوي تركيبة «جوفي» على مسببات الحساسية؟",
          answer: "قد يختلف تكوين تركيبة حليب الماعز العضوي من «جوفي» باختلاف البلد. يمكنك الاطلاع على المعلومات المحددة المتعلقة بمسببات الحساسية على العبوة التي اشتريتها أو العثور على هذه المعلومات على الموقع الإلكتروني لـ«جوفي» الخاص ببلدك. ومع ذلك، فإن جميع منتجات «جوفي» تحتوي على حليب الماعز؛ ويُذكر الحليب كمسبب للحساسية.",
        },
        {
          question: "هل يحتوي حليب الأطفال «جوفي» على جميع العناصر الغذائية التي يحتاجها طفلي؟",
          answer: "نعم. تمت صياغة تركيبة حليب الأطفال العضوي «جوفي» وفقًا للمبادئ التوجيهية الأوروبية التي وضعتها «EFSA» (الهيئة الأوروبية لسلامة الأغذية). ابتداءً من عمر 4 إلى 6 أشهر تقريبًا، يمكن إعطاء الأطعمة الصلبة (الوجبات الخفيفة) لتكملة النظام الغذائي لطفلك. يرجى أيضًا مناقشة هذا الأمر مع مركز الرعاية الصحية للأطفال أو الطبيب.",
        },
        {
          question: "لماذا يجب أن أختار حليبًا صناعيًّا من حليب الماعز؟",
          answer: "والأهم من ذلك، يجب أن تشعر أنت كوالد بالراحة تجاه هذا الاختيار لطفلك! يُعرف حليب الماعز بخصائصه الطبيعية التي تسهل هضمه. فالخثارة الناعمة والرخوة التي تتشكل في المعدة تتيح مرورها بسلاسة إلى الأمعاء لمواصلة عملية الهضم. وهذا أمر مريح جدًّا للأطفال الذين يعانون من حساسية تجاه حليب البقر أيضًا. كما أن حليب الماعز كامل الدسم يحتوي على مستويات عالية من الأحماض الدهنية قصيرة ومتوسطة السلسلة التي يسهل هضمها. علاوة على ذلك، فإن حليب الماعز غني بالمغذيات الدقيقة الحيوية ذات التوافر البيولوجي العالي. والنتيجة: خيار مريح من حليب الماعز!",
        },
        {
          question: "ماذا عن طعم ورائحة «جوفي»؟",
          answer: "لا تقلق! حليب الأطفال «جوفي» المصنوع من حليب الماعز لذيذ تمامًا مثل حليب الأطفال المصنوع من حليب البقر. من خلال استخدام حليب الماعز الطازج عالي الجودة، نضمن أن منتجات «جوفي» لدينا لذيذة ولا تحتوي على طعم أو رائحة «الماعز».",
        },
        {
          question: "هل منتجات «جوفي» حاصلة على شهادة الزراعة العضوية؟",
          answer: "يحمل منتج «جوفي جوت» شهادة المنتجات العضوية الأوروبية وفقًا للمعايير الأوروبية للمنتجات العضوية. وهذا يعني أننا لا نستخدم سوى أفضل أنواع حليب الماعز (المعتمد كمنتج عضوي)، المستخرج من ماعز تتغذى على العشب وتُغذى بأعلاف غير معدلة وراثيًا ومعتمدة كمنتجات عضوية ومزروعة دون استخدام مبيدات حشرية وأسمدة صناعية.",
        },
        {
          question: "هل يحتوي حليب الأطفال العضوي من «جوفي» على هرمونات أو مضادات حيوية أو مبيدات حشرية؟",
          answer: "مثل جميع أنواع حليب الأطفال الصناعي في أوروبا، يجب أن تلتزم «جوفي» بلوائح صارمة للغاية فيما يتعلق بخلوها من الهرمونات والمضادات الحيوية والمبيدات الحشرية والملوثات الأخرى. وتذهب «جوفي» إلى أبعد من ذلك؛ فنحن نستخدم حليب الماعز العضوي، ولا تتغذى ماعزنا إلا على أعلاف خالية من الكائنات المعدلة وراثيًا.",
        },
        {
          question: "ما هما DHA وAA؟",
          answer: "على عكس أنواع الحليب الصناعي العضوي الأخرى، فإن حليب «جوفي جوت» العضوي مُغنًّى بحمض الأراكيدونيك (AA) وحمض الدوكوساهيكسانويك (DHA). وهما من الدهون المتعددة غير المشبعة التي توجد بشكل طبيعي في حليب الأم. ويمكن للجسم تكوين هذين الحمضين الدهنيين من الأحماض الدهنية الأخرى الموجودة في الغذاء، لكن ثبت أن إضافة حمض الدوكوساهيكسانويك (DHA) مفيدة للنمو والتطور الطبيعي لأدمغة الرضع وأعصابهم وأعينهم.",
        },
      ],
    },
    {
      title: "أسئلة حول الشركة",
      items: [
        {
          question: "أين تقع «جوفي»؟",
          answer: "«جوفي» هي علامة تجارية مملوكة لشركة «يونيكا جلوبال بي.في.»، التي يقع مقرها في هولندا.",
        },
        {
          question: "أين يتم إنتاج «جوفي»؟",
          answer: "نحن نعمل عن كثب مع مصانع متخصصة ومعتمدة في الدنمارك لإنتاج حليب الأطفال العضوي «جوفي»",
        },
        {
          question: "كيف يمكنني التواصل مع «جوفي»؟",
          answer: "إذا كان لديك أي سؤال بشأن منتجاتنا أو حول كيفية استخدامها، يرجى الانتقال إلى صفحة «الاتصال» أو إرسال بريد إلكتروني إلى {email} أو الاتصال بنا على {phone}، وسنرد عليك في أقرب وقت ممكن!",
        },
        {
          question: "ما معنى هذا الاسم؟",
          answer: "اسم «جوفي» مشتق من عبارة «Joie de vivre»، التي تعني «متعة الحياة». وهو ما نتمنى أن ينعم به جميع الآباء والأمهات والأطفال في جميع أنحاء العالم! ولا يقتصر التعبير عن ذلك على شعار «جوفي» المشرق فحسب، بل إننا نستخدم حليب الماعز الكامل الدسم كمكون رئيسي في جميع منتجاتنا. مرحبًا بالأطفال السعداء، والماعز السعيدة، وكوكبنا السعيد!",
        },
      ],
    },
  ],
};
