import type { Language } from '../../core/i18n/language.service';

/*
 * The official "More information" pages of jovieproducts.com/why-jovie-goat/, used with the brand
 * owner's permission, as ordered text blocks. The official Arabic site has no such pages, so the
 * Arabic is our translation of the English, using the official Arabic site's terms. The headings
 * of "makes good sense" carry the anchors the benefit cards link to, in both languages.
 */
export type WhySubpageKey = 'makes-good-sense' | 'organic' | 'without-promise';

export interface WhyBlock {
  kind: 'h3' | 'h4' | 'p' | 'strong' | 'em' | 'li' | 'img';
  text: string;
  id?: string;
  src?: string;
}

export interface WhySubpage {
  title: string;
  blocks: WhyBlock[];
}

const WHY_SUBPAGES_EN: Record<WhySubpageKey, WhySubpage> = {
  "makes-good-sense": {
    "title": "Why Jovie Goat makes good sense",
    "blocks": [
      {
        "kind": "h3",
        "text": "Goat Milk is the Right Base"
      },
      {
        "kind": "p",
        "text": "Developing an infant formula that closely matches the digestibility and nutrient absorbability of breastmilk starts with choosing the right base. Globally, cow milk has become the predominant base used for infant formula due to its widespread availability. However, it is now well recognized amongst health professionals that cow milk formulations can pose discomfort to infants."
      },
      {
        "kind": "p",
        "text": "Jovie chooses goat milk to serve as the ideal base for Infant Formula, offering numerous benefits:"
      },
      {
        "kind": "h4",
        "text": "Full fat milk goodness - Includes all the healthy benefits of full fat goat milk",
        "id": "fat"
      },
      {
        "kind": "p",
        "text": "Breast-fed infants receive 50% of their caloric intake from fat. Consequently, infant formulas have added vegetable fat blends so that they match human breastmilk composition closely. In addition, Jovie includes as much goat milk fat as possible because of the benefits of the whole goat milk. This is an important distinction over other formulas that include de-fatted or skimmed milk ingredients that have the milk fats removed."
      },
      {
        "kind": "p",
        "text": "Goat milk has a high degree of short and medium chain triglycerides (MCTs) which increases the overall digestibility and the absorbability of the fat. As such, Jovie Goat products contain higher levels of MCTs than regular formulas."
      },
      {
        "kind": "p",
        "text": "Jovie Goat infant formula has the natural goat fat, with additional elevated levels of LCPUFAs including DHA & AA. To be clear; for Jovie Goat formulas we do not use any palm oil."
      },
      {
        "kind": "em",
        "text": "Some short and medium chain fatty acids are named after its presence in goat milk fat. There is Caproic, Caprylic and Capric acid!"
      },
      {
        "kind": "h4",
        "text": "Easy to digest protein - smooth passage from the stomach into the intestines for further digestion.",
        "id": "digest"
      },
      {
        "kind": "p",
        "text": "Goat milk contains unique proteins that promotes easy digestion."
      },
      {
        "kind": "p",
        "text": "Anecdotally, we’ve always known that goat milk formula has a superior digestibility profile because of our own experiences, but also the collective experiences of many other parents choosing goat milk formulas. Scientifically, when infant formulas made from goat milk and cow milk are put to a digestibility test, the results show clear differences; after about 30 minutes the goat milk formula digestion rate is about twice the rate of cow milk formula."
      },
      {
        "kind": "p",
        "text": "The different digestibility rates may be due to the clotting behavior of the various milk proteins in the infant stomach. Goat milk formulas' “milk clumps” are softer and gentler so they easily pass from the stomach into the intestines for further digestion."
      },
      {
        "kind": "h4",
        "text": "For sensitive tummies - comforting for babies sensitive to cow milk",
        "id": "tummies"
      },
      {
        "kind": "p",
        "text": "We think goat milk should be the first choice when choosing a breastmilk alternative!"
      },
      {
        "kind": "p",
        "text": "Practise however is that many children after being breastfed, start with a cow milk formula. This often results in problems, ranging from mild (gastrointestinal) symptoms to severe allergies. Jovie Goat formulas are suitable for healthy children and children with mild symptoms, but it isn’t advised for babies with established cow milk allergy because there is a risk for a cross-over reaction."
      },
      {
        "kind": "p",
        "text": "Lactose is the naturally occurring carbohydrate in human breastmilk and provides about 40% of the energy content. Also in Jovie Goat infant formula the major carbohydrate is lactose. Hence, Jovie Goat is not suitable for babies with an intolerance for lactose."
      },
      {
        "kind": "em",
        "text": "Jovie Goat is suitable for babies with a sensitivity for cow milk, but we do not advise it for children with a cow milk allergy"
      },
      {
        "kind": "em",
        "text": "Dispelling Some Common Myths:"
      },
      {
        "kind": "img",
        "text": "Common myths: lactose intolerance (0.002%), cow milk allergy (2-3%) and cow milk intolerance (30-50%)",
        "src": "/assets/images/jovie/official/why/goat-cow-digestion-chart.png"
      },
      {
        "kind": "strong",
        "text": "Jovie’s Solution to Cow Milk Intolerance (CMI)"
      },
      {
        "kind": "strong",
        "text": "CMI manifests in a multitude of ways, including:"
      },
      {
        "kind": "li",
        "text": "Triggering the immune system, causing symptoms such as eczema (atopic dermatitis), congestion in the airways (mucus build-up causing nose stuffiness)"
      },
      {
        "kind": "li",
        "text": "Contributing to symptoms in the gastrointestinal system due to poor digestion and assimilation of nutrients, intestinal upset, spit up (regurgitation), constipation, colic, gas and bloating"
      },
      {
        "kind": "p",
        "text": "Making the switch to Jovie Goat formula can be such a positive experience for many babies and parents as it often reduces or eliminates common CMI symptoms listed above, leading to happier, healthier babies (and parents!)."
      },
      {
        "kind": "h4",
        "text": "Rich In vitamins and minerals - highly bioavailable micronutrients",
        "id": "vitamins"
      },
      {
        "kind": "p",
        "text": "Micronutrients are critical to your body's well-being. The amount of ingested nutrients that is absorbed and available to the body for systems such as growth and repair is known as 'bioavailability'. The good thing is, goat milk contains highly bioavailable nutrients such as calcium, phosphorus and copper. Yet another reason for Jovie to make goat milk based formulas available to you and your baby!"
      },
      {
        "kind": "h4",
        "text": "Naturally A2 milk - Goat milk's beta casein protein Is naturally A2",
        "id": "a2"
      },
      {
        "kind": "p",
        "text": "Goat milk is naturally A2. Put differently, goat milk is A1 -casein-free. This is important because when A1 milk from cows is digested it releases an inflammatory peptide called BCM-7. The intestines can absorb this peptide which then passes into the blood and circulates throughout the entire body. New scientific evidence has linked bovine BCM-7 to several health conditions. It is thought by many healthcare providers that it is best to consume only A2 milk for optimal health. Therefore, it is good news that goat milk is naturally A2 and therefore the entire Jovie product range is!"
      },
      {
        "kind": "h4",
        "text": "Full of fancy micronutrients - naturally containing oligosaccharides and nucleotides",
        "id": "fancy"
      },
      {
        "kind": "p",
        "text": "Goat milk is not only beneficial in its macronutrient composition. Its fancy micronutrient composition is at least as important! This includes micronutrients such as oligosaccharides and nucleotides. In the scientific world, more and more attention is being paid to so-called 'human milk oligosaccharides' (HMOs), very special types of prebiotics found in human milk. Goat milk formulas naturally contain a few types of HMOs too! Considering nucleotides, the building blocks of DNA, there is no need to add them to Jovie Goat formulas because of its naturally available levels. Jovie Goat formulas include as many natural goat milk benefits as possible!"
      }
    ]
  },
  "organic": {
    "title": "Organic Goat Milk",
    "blocks": [
      {
        "kind": "h3",
        "text": "Organic Goat Milk"
      },
      {
        "kind": "p",
        "text": "For Jovie, we can use goat milk which is certified organic according to EU farming standards. In this way we ensure that Jovie’s products are sustainably produced and as close to nature as possible - free of synthetic pesticides, genetically modified organisms (GMOs), and hormones."
      },
      {
        "kind": "p",
        "text": "In our modern world, it is common to be exposed to daily, chronic low-level toxic exposure from a variety of sources - with our food supply being one of the most important. Studies have shown that choosing an organic diet for our family may actually lead to a decrease in pesticide burden."
      },
      {
        "kind": "strong",
        "text": "Organic is Better for Our Families"
      },
      {
        "kind": "p",
        "text": "We are all sensitive to the harmful effects of pesticides and herbicides. Choosing Jovie Goat means that your family is getting natural, wholesome nutrition produced without synthetic pesticides and herbicides."
      },
      {
        "kind": "strong",
        "text": "Organic is Better for Our Goats"
      },
      {
        "kind": "p",
        "text": "We care about our goats as much as we care about our families. Goats are incredibly intelligent and loving animals who can form strong bonds with humans and, like our families, they thrive in a nurturing environment. The goats which provide our delicious full cream milk grow up in an organic environment, meaning they receive organic and regional feed, they have access to open air and grazing areas, and no pesticides, GMOs or hormones are being used. The goats’ welfare is also improved by having more space per animal in the barn."
      },
      {
        "kind": "strong",
        "text": "Organic is Better for Our Planet"
      },
      {
        "kind": "p",
        "text": "Our earth is our most valuable resource. When we take care of it, it takes care of us. Organic farming promotes the use of local resources for animal feed, enriches our soil, supports biodiversity, and aims to reduce the carbon footprint and water pollution. Protecting our planet means protecting our health and our family’s health for many generations to come."
      }
    ]
  },
  "without-promise": {
    "title": "Jovie's without promise",
    "blocks": [
      {
        "kind": "h4",
        "text": "Say Yes to Goat Milk, No to Palm Oil and Maltodextrin"
      },
      {
        "kind": "p",
        "text": "The major ingredient of Jovie Goat formulas is full cream goat milk, locking as many natural goat milk benefits as possible. Do we need to say more, knowing that full fat goat milk offers healthy fat benefits, easy to digest protein, fancy micronutrients ánd a suitable option in case of cow milk intolerance and sensitive tummies?"
      },
      {
        "kind": "p",
        "text": "Jovie loves to support happy babies and happy families. This also includes the choice for Organic. A choice that is better for our families, better for our goats, and better for our planet. This automatically means that Jovie also chooses to avoid the use of ingredients such as Palm Oil and Maltodextrin. Jovie’s Without Promise: better for you ánd better for our planet."
      },
      {
        "kind": "strong",
        "text": "Less is Not (Necessarily) More"
      },
      {
        "kind": "p",
        "text": "Choosing foods with a short list of ingredients is sometimes part of a strategy for cultivating a healthy diet – and it can be – for adults. Many nutritionists will give the advice that you should only buy food products where you can pronounce the ingredients listed on the label. While this may be sound advice for adults, this doesn’t necessarily apply to infants. It may be tempting to want baby formula with few ingredients, that appears ‘simple’, or one that contains familiar ingredients (i.e. that you might find in your kitchen). However, “less” may not be “more” when it comes to meeting infants’ nutritional needs. Baby formula is modeled after breast milk; a dynamic, complex fluid. An optimal Infant formula composition thus contains Ingredient which are complex and sometimes difficult to pronounce."
      }
    ]
  }
};

const WHY_SUBPAGES_AR: Record<WhySubpageKey, WhySubpage> = {
  "makes-good-sense": {
    "title": "لماذا جوفي جوت اختيار منطقي",
    "blocks": [
      { "kind": "h3", "text": "حليب الماعز هو الأساس الصحيح" },
      { "kind": "p", "text": "يبدأ تطوير حليب رضع يقترب قدر الإمكان من حليب الأم في سهولة الهضم وامتصاص العناصر الغذائية باختيار الأساس الصحيح. على مستوى العالم، أصبح حليب الأبقار هو الأساس الأكثر استخدامًا في حليب الرضع بسبب توفره الواسع. لكن من المعروف الآن بين المتخصصين في الرعاية الصحية أن التركيبات المصنوعة من حليب الأبقار قد تسبب انزعاجًا للرضع." },
      { "kind": "p", "text": "اختارت جوفي حليب الماعز ليكون الأساس المثالي لحليب الرضع، لما يقدمه من مزايا عديدة:" },
      { "kind": "h4", "text": "خيرات الحليب كامل الدسم - يحتوي على كل المزايا الصحية لحليب الماعز كامل الدسم", "id": "fat" },
      { "kind": "p", "text": "يحصل الرضع الذين يعتمدون على الرضاعة الطبيعية على 50% من السعرات الحرارية من الدهون. لذلك تُضاف إلى تركيبات حليب الرضع خلطات من الدهون النباتية حتى تقترب في تركيبها من حليب الأم. وإلى جانب ذلك، تحتوي جوفي على أكبر قدر ممكن من دهون حليب الماعز، للاستفادة من مزايا حليب الماعز الكامل. وهذا فرق مهم عن التركيبات الأخرى التي تستخدم مكونات من حليب منزوع الدسم أُزيلت منه دهون الحليب." },
      { "kind": "p", "text": "يحتوي حليب الماعز على نسبة عالية من الدهون الثلاثية قصيرة ومتوسطة السلسلة (MCTs)، وهو ما يزيد من سهولة هضم الدهون وامتصاصها بشكل عام. ولهذا تحتوي منتجات جوفي جوت على مستويات من الـ MCTs أعلى من التركيبات العادية." },
      { "kind": "p", "text": "يحتوي حليب الرضع جوفي جوت على دهون الماعز الطبيعية، مع مستويات إضافية مرتفعة من الأحماض الدهنية طويلة السلسلة متعددة عدم التشبع (LCPUFAs)، ومنها DHA وAA. وللتوضيح: لا نستخدم زيت النخيل على الإطلاق في تركيبات جوفي جوت." },
      { "kind": "em", "text": "بعض الأحماض الدهنية قصيرة ومتوسطة السلسلة سُمّيت باسم الماعز لوجودها في دهون حليبه، وهي حمض الكابرويك والكابريليك والكابريك!" },
      { "kind": "h4", "text": "البروتين سهل الهضم - ينتقل بسلاسة من المعدة إلى الأمعاء لاستكمال الهضم.", "id": "digest" },
      { "kind": "p", "text": "يحتوي حليب الماعز على بروتينات فريدة تساعد على سهولة الهضم." },
      { "kind": "p", "text": "من واقع التجربة، كنا نعرف دائمًا أن حليب الرضع المصنوع من حليب الماعز أسهل في الهضم، سواء من تجاربنا الشخصية أو من تجارب كثير من الآباء والأمهات الذين اختاروا تركيبات حليب الماعز. وعلميًا، عند اختبار سرعة هضم تركيبات حليب الرضع المصنوعة من حليب الماعز وحليب الأبقار، تظهر النتائج فروقًا واضحة؛ فبعد حوالي 30 دقيقة يكون معدل هضم تركيبة حليب الماعز ضعف معدل هضم تركيبة حليب الأبقار تقريبًا." },
      { "kind": "p", "text": "قد يرجع اختلاف معدلات الهضم إلى طريقة تخثّر بروتينات الحليب المختلفة في معدة الرضيع. فـ«تكتلات الحليب» في تركيبات حليب الماعز أنعم وألطف، فتنتقل بسهولة من المعدة إلى الأمعاء لاستكمال الهضم." },
      { "kind": "h4", "text": "للمعدة الحساسة - مريح للأطفال الحساسين لحليب الأبقار", "id": "tummies" },
      { "kind": "p", "text": "نرى أن حليب الماعز يجب أن يكون الخيار الأول عند اختيار بديل لحليب الأم!" },
      { "kind": "p", "text": "لكن ما يحدث في الواقع أن كثيرًا من الأطفال يبدؤون بعد الرضاعة الطبيعية بتركيبة من حليب الأبقار، وكثيرًا ما يؤدي ذلك إلى مشاكل تتراوح بين أعراض بسيطة (في الجهاز الهضمي) وحساسية شديدة. تركيبات جوفي جوت مناسبة للأطفال الأصحاء والأطفال الذين لديهم أعراض بسيطة، لكن لا يُنصح بها للرضع المصابين بحساسية مؤكدة من حليب الأبقار، لوجود خطر حدوث تفاعل متبادل." },
      { "kind": "p", "text": "اللاكتوز هو الكربوهيدرات الموجود بشكل طبيعي في حليب الأم، ويوفر حوالي 40% من الطاقة. واللاكتوز أيضًا هو الكربوهيدرات الأساسي في حليب الرضع جوفي جوت، ولذلك فإن جوفي جوت غير مناسب للرضع الذين يعانون من عدم تحمل اللاكتوز." },
      { "kind": "em", "text": "جوفي جوت مناسب للرضع الحساسين لحليب الأبقار، لكننا لا ننصح به للأطفال المصابين بحساسية من حليب الأبقار" },
      { "kind": "em", "text": "تصحيح بعض المفاهيم الشائعة:" },
      { "kind": "img", "text": "مفاهيم شائعة: عدم تحمل اللاكتوز (0.002%)، وحساسية حليب الأبقار (2-3%)، وعدم تحمل حليب الأبقار (30-50%)", "src": "/assets/images/jovie/official/why/goat-cow-digestion-chart.png" },
      { "kind": "strong", "text": "حل جوفي لعدم تحمل حليب الأبقار (CMI)" },
      { "kind": "strong", "text": "يظهر عدم تحمل حليب الأبقار بأشكال متعددة، منها:" },
      { "kind": "li", "text": "تحفيز الجهاز المناعي، مما يسبب أعراضًا مثل الإكزيما (التهاب الجلد التأتبي) واحتقان المجاري التنفسية (تراكم المخاط الذي يسبب انسداد الأنف)" },
      { "kind": "li", "text": "المساهمة في ظهور أعراض في الجهاز الهضمي بسبب ضعف هضم العناصر الغذائية وامتصاصها، مثل اضطراب الأمعاء، والترجيع (القلس)، والإمساك، والمغص، والغازات، والانتفاخ" },
      { "kind": "p", "text": "التحول إلى تركيبة جوفي جوت يمكن أن يكون تجربة إيجابية جدًا لكثير من الأطفال والآباء والأمهات، لأنه كثيرًا ما يقلل أعراض عدم تحمل حليب الأبقار الشائعة المذكورة أعلاه أو يخلّص منها، فيصبح الأطفال أسعد وأكثر صحة (وكذلك الآباء والأمهات!)." },
      { "kind": "h4", "text": "غني بالفيتامينات والمعادن - عناصر غذائية دقيقة عالية الامتصاص", "id": "vitamins" },
      { "kind": "p", "text": "العناصر الغذائية الدقيقة ضرورية لصحة الجسم. وتُسمى كمية العناصر الغذائية التي يمتصها الجسم وتصبح متاحة له في وظائف مثل النمو والإصلاح «التوافر الحيوي». والخبر الجيد أن حليب الماعز يحتوي على عناصر غذائية عالية التوافر الحيوي مثل الكالسيوم والفوسفور والنحاس. وهذا سبب آخر يجعل جوفي تقدم لك ولطفلك تركيبات مصنوعة من حليب الماعز!" },
      { "kind": "h4", "text": "بطبيعته إيه 2 (A2) - البيتا كازين في حليب الماعز من النوع A2 بشكل طبيعي", "id": "a2" },
      { "kind": "p", "text": "حليب الماعز من النوع A2 بشكل طبيعي، أي أنه خالٍ من بروتين البيتا كازين A1. وهذا مهم لأن هضم حليب الأبقار من النوع A1 يُطلق ببتيدًا محفزًا للالتهاب يُسمى BCM-7. ويمكن للأمعاء أن تمتص هذا الببتيد فينتقل إلى الدم ويدور في الجسم كله. وقد ربطت أدلة علمية حديثة بين الـ BCM-7 الناتج عن حليب الأبقار وعدد من الحالات الصحية، ويرى كثير من مقدمي الرعاية الصحية أن الأفضل للصحة هو تناول حليب A2 فقط. لذلك من الجيد أن حليب الماعز من النوع A2 بطبيعته، وبالتالي كل منتجات جوفي كذلك!" },
      { "kind": "h4", "text": "مدعم بعناصر غذائية دقيقة مميزة - يحتوي بشكل طبيعي على الأوليجوساكاريدات والنيوكليوتيدات", "id": "fancy" },
      { "kind": "p", "text": "لا تقتصر فائدة حليب الماعز على تركيبه من العناصر الغذائية الكبرى، فتركيبه المميز من العناصر الغذائية الدقيقة لا يقل أهمية! ومن هذه العناصر الأوليجوساكاريدات والنيوكليوتيدات. ففي الأوساط العلمية يزداد الاهتمام بما يُعرف بـ«أوليجوساكاريدات حليب الأم» (HMOs)، وهي أنواع خاصة جدًا من البريبيوتيك موجودة في حليب الأم، وتحتوي تركيبات حليب الماعز بشكل طبيعي على بعض أنواعها أيضًا! أما النيوكليوتيدات، وهي وحدات بناء الحمض النووي (DNA)، فلا حاجة لإضافتها إلى تركيبات جوفي جوت لأنها موجودة فيها بشكل طبيعي. تركيبات جوفي جوت تحتفظ بأكبر قدر ممكن من مزايا حليب الماعز الطبيعية!" }
    ]
  },
  "organic": {
    "title": "حليب الماعز العضوي",
    "blocks": [
      { "kind": "h3", "text": "حليب الماعز العضوي" },
      { "kind": "p", "text": "تستخدم جوفي حليب ماعز عضويًا معتمدًا وفقًا لمعايير الزراعة في الاتحاد الأوروبي. وبهذا نضمن أن منتجات جوفي تُنتج بشكل مستدام وأقرب ما يمكن إلى الطبيعة، وخالية من المبيدات الصناعية والكائنات المعدلة وراثيًا (GMOs) والهرمونات." },
      { "kind": "p", "text": "في عالمنا الحديث، من الشائع أن نتعرض يوميًا وبشكل مزمن لمستويات منخفضة من المواد السامة من مصادر متعددة، ومن أهمها طعامنا. وقد أظهرت الدراسات أن اختيار نظام غذائي عضوي لعائلتنا قد يؤدي فعلًا إلى تقليل ما نتعرض له من المبيدات." },
      { "kind": "strong", "text": "العضوي أفضل لعائلاتنا" },
      { "kind": "p", "text": "كلنا معرضون للآثار الضارة للمبيدات الحشرية ومبيدات الأعشاب. واختيارك لجوفي جوت يعني أن عائلتك تحصل على تغذية طبيعية ومتكاملة، منتجة بدون مبيدات حشرية أو مبيدات أعشاب صناعية." },
      { "kind": "strong", "text": "العضوي أفضل لماعزنا" },
      { "kind": "p", "text": "نهتم بماعزنا بقدر اهتمامنا بعائلاتنا. فالماعز حيوانات ذكية وحنونة جدًا، تستطيع أن تكوّن روابط قوية مع البشر، ومثل عائلاتنا تمامًا، تنمو بشكل أفضل في بيئة ترعاها. والماعز التي تمنحنا حليبها كامل الدسم اللذيذ تنشأ في بيئة عضوية، أي أنها تحصل على أعلاف عضوية ومحلية، وتخرج إلى الهواء الطلق والمراعي، ولا تُستخدم معها مبيدات أو كائنات معدلة وراثيًا أو هرمونات. كما تتحسن رفاهية الماعز بتوفير مساحة أكبر لكل حيوان داخل الحظيرة." },
      { "kind": "strong", "text": "العضوي أفضل لكوكبنا" },
      { "kind": "p", "text": "الأرض هي أثمن ما نملك، وعندما نعتني بها، تعتني بنا. فالزراعة العضوية تشجع استخدام الموارد المحلية في تغذية الحيوانات، وتثري التربة، وتدعم التنوع البيولوجي، وتهدف إلى تقليل البصمة الكربونية وتلوث المياه. وحماية كوكبنا تعني حماية صحتنا وصحة عائلاتنا لأجيال كثيرة قادمة." }
    ]
  },
  "without-promise": {
    "title": "وعد جوفي",
    "blocks": [
      { "kind": "h4", "text": "نعم لحليب الماعز، ولا لزيت النخيل والمالتودكسترين" },
      { "kind": "p", "text": "المكون الأساسي في تركيبات جوفي جوت هو حليب الماعز كامل الدسم، للاحتفاظ بأكبر قدر ممكن من مزايا حليب الماعز الطبيعية. هل نحتاج أن نقول أكثر من ذلك، ونحن نعرف أن حليب الماعز كامل الدسم يقدم مزايا الدهون الصحية، وبروتينًا سهل الهضم، وعناصر غذائية دقيقة مميزة، وخيارًا مناسبًا في حالات عدم تحمل حليب الأبقار والمعدة الحساسة؟" },
      { "kind": "p", "text": "تحب جوفي أن تدعم الأطفال السعداء والعائلات السعيدة، ويشمل ذلك أيضًا اختيار العضوي؛ وهو اختيار أفضل لعائلاتنا، وأفضل لماعزنا، وأفضل لكوكبنا. وهذا يعني تلقائيًا أن جوفي تختار أيضًا تجنب استخدام مكونات مثل زيت النخيل والمالتودكسترين. وعد جوفي: أفضل لك، وأفضل لكوكبنا." },
      { "kind": "strong", "text": "الأقل ليس (بالضرورة) أفضل" },
      { "kind": "p", "text": "اختيار أطعمة بقائمة مكونات قصيرة يكون أحيانًا جزءًا من خطة لاتباع نظام غذائي صحي، وقد يكون كذلك بالفعل للكبار. وينصح كثير من خبراء التغذية بألا تشتري إلا المنتجات الغذائية التي تستطيع نطق أسماء مكوناتها المكتوبة على العبوة. ورغم أن هذه نصيحة قد تكون سليمة للكبار، فإنها لا تنطبق بالضرورة على الرضع. فقد يكون من المغري أن تختار حليب رضع بمكونات قليلة، يبدو «بسيطًا»، أو يحتوي على مكونات مألوفة (مثل التي قد تجدها في مطبخك). لكن «الأقل» قد لا يكون «الأفضل» عندما يتعلق الأمر بتلبية الاحتياجات الغذائية للرضع. فحليب الرضع مصمم على غرار حليب الأم، وهو سائل حيوي ومعقد، ولذلك فإن التركيبة المثالية لحليب الرضع تحتوي على مكونات معقدة، قد يكون نطق أسمائها صعبًا أحيانًا." }
    ]
  }
};

export const WHY_SUBPAGES: Record<Language, Record<WhySubpageKey, WhySubpage>> = {
  en: WHY_SUBPAGES_EN,
  ar: WHY_SUBPAGES_AR,
};
