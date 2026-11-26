import type { Language } from '../../core/i18n/language.service';

/*
 * Official "Why Jovie Goat" page: English from jovieproducts.com/why-jovie-goat/, Arabic from
 * jovieproducts.com/ae/why-jovie/ (spelling corrected, steps in ascending order), used with the
 * brand owner's permission. Photos: the official English page's (the Arabic page repeats one
 * placeholder photo for every step).
 */
export interface WhyContent {
  title: string;
  intro: string;
  buttons: { label: string; target: string }[];
  spirit: { title: string; lead: string; paragraphs: string[] };
  quote: { text: string; author: string; role: string };
  benefits: { title: string; intro: string; cards: { title: string; text: string; anchor: string }[]; more: string };
  organic: { title: string; paragraphs: string[] };
  different: { title: string; items: { key: 'organic' | 'non-gmo' | 'without'; title: string; text: string; more: string }[] };
  howItsMade: { title: string; slides: { step: string; title: string; text: string }[]; previous: string; next: string };
}

const IMG = '/assets/images/jovie/official/why/';

export const WHY_IMAGES = {
  spirit: IMG + 'spirit-mother-with-children.jpg',
  organic: IMG + 'organic-goat-outside.jpg',
  different: {"organic": IMG + "different-goats-in-field.jpg", "non-gmo": IMG + "different-goat-in-stable.jpg", "without": IMG + "different-child-upside-down.jpg"} as Record<string, string>,
  steps: [IMG + "step-1-farming.jpg", IMG + "step-2-milk-collection.jpg", IMG + "step-3-infant-formula.jpg", IMG + "step-4-quality-check.jpg", IMG + "step-5-packed.jpg", IMG + "step-6-store.jpg"],
};

/** Pages behind the "More information" links. */
export const WHY_LINKS = {
  benefits: '/jovieEgypt/why/makes-good-sense',
  different: {
  "organic": "/jovieEgypt/why/organic",
  "non-gmo": "/jovieEgypt/why/organic",
  "without": "/jovieEgypt/why/without-promise"
} as Record<string, string>,
};

export const WHY_CONTENT: Record<Language, WhyContent> = {
  "en": {
    "title": "Why Jovie Goat",
    "intro": "We believe that feeding your baby should be a joyful experience. Your baby deserves the best. With Jovie Goat, bye-bye upset tummies! Hello happy baby!",
    "buttons": [
      {
        "label": "Jovie Is Different",
        "target": "organic"
      },
      {
        "label": "Goat Milk Benefits",
        "target": "jovieFacts"
      }
    ],
    "spirit": {
      "title": "The Jovie Spirit",
      "lead": "We love the unique properties of Jovie Goat! Goat milk is the ideal base for our Jovie Goat products and provides pure and healthy nutrition for your baby.",
      "paragraphs": [
        "We not only have many years of experience in developing infant nutrition based on goat milk, we all have our own unique parenting story - from pregnancy complications and breastfeeding challenges to picky eating habits that some of our older children have developed. We believe there are better solutions when it comes to protein sources used in infant nutrition than cow milk. Nature has more goodness to offer, so why settle for second best? Therefore, we have set out to develop the purest, healthiest and nutritionally complete alternative to breastfeeding."
      ]
    },
    "quote": {
      "text": "We are caring parents, but at the same time we are a team of experts in infant nutrition, knowing the importance of better nutrition that is gentle on baby’s tummies.",
      "author": "Ben Busser",
      "role": "CEO - Unica Global B.V."
    },
    "benefits": {
      "title": "The Benefits of Jovie Goat",
      "intro": "Choosing products based on goat milk makes good sense given the benefits that goat milk can offer. Goat milk serves as the ideal base for any formula – Jovie Infant, Jovie Junior and Jovie Mama – offering a healthy choice for the whole family!",
      "cards": [
        {
          "title": "Full Fat Milk Goodness",
          "text": "Includes all the healthy benefits of full fat goat milk",
          "anchor": "fat"
        },
        {
          "title": "Easy to Digest Protein",
          "text": "Smooth passage from the stomach into the intestines for further digestion",
          "anchor": "digest"
        },
        {
          "title": "For Sensitive Tummies",
          "text": "Comforting for babies sensitive to cow milk",
          "anchor": "tummies"
        },
        {
          "title": "Rich in Vitamins and Minerals",
          "text": "Highly bioavailable micronutrients",
          "anchor": "vitamins"
        },
        {
          "title": "Naturally A2 Milk",
          "text": "Goat milk’s beta casein protein is naturally A2",
          "anchor": "a2"
        },
        {
          "title": "Full of Fancy Micronutrients",
          "text": "Naturally containing oligosaccharides and nucleotides",
          "anchor": "fancy"
        }
      ],
      "more": "More information"
    },
    "organic": {
      "title": "Jovie Goat Chooses Organic",
      "paragraphs": [
        "Our earth is our most valuable resource. When we take care of it, it takes care of us. Protecting our planet means protecting our health and our family’s health for many generations to come.",
        "Jovie Goat is sustainably produced and as close to nature as possible. Choosing Organic means happy goats in a clean and healthy environment.",
        "Good for Goats, Good for the Planet, Good for you and your baby!"
      ]
    },
    "different": {
      "title": "Jovie Goat is Different",
      "items": [
        {
          "key": "organic",
          "title": "Organic Goat Milk",
          "text": "The main ingredient in Jovie products is organic goat milk. Jovie Goat is certified organic according to EU organic standards. Choosing organic farming promotes animal welfare. It also reduces water pollution, promotes the use of local resources for animal feed, enriches our soil, supports biodiversity, and aims to reduce the carbon footprint.",
          "more": "More information"
        },
        {
          "key": "non-gmo",
          "title": "Non-GMO",
          "text": "Jovie is committed to producing organic products made with non-GMO ingredients. As part of our organic certification, strict standards apply to the feed and farming practices used in the production of our ingredients, including restrictions on the use of synthetic pesticides such as glyphosate. By following these organic farming practices, we ensure that Jovie’s products are produced with care for quality and sustainability.",
          "more": "More information"
        },
        {
          "key": "without",
          "title": "Jovie's without Promise",
          "text": "Any modern formula will always include a long list of necessary ingredients. What we can promise, is that none of our products include any palm oil or maltodextrin. As a matter of fact, Jovie’s products are least processed as possible, this way locking in as many natural goat milk nutrients as possible.",
          "more": "More Information"
        }
      ]
    },
    "howItsMade": {
      "title": "How it’s Made",
      "slides": [
        {
          "step": "Step 1",
          "title": "Farming",
          "text": "We set high quality standards for the goat milk used for our products. This all starts at the farm. Without the goats we are nothing. The well-being of the goats is very important. Not only because a farmer cares for his animals, but healthy goats will give us the rich and creamy milk we use for our products."
        },
        {
          "step": "Step 2",
          "title": "Milk Collection",
          "text": "Fresh milk is collected at least twice a week. For this, a special milk truck is being used. Before collecting the milk, it is tested for the absence of antibiotics, hormones and other undesired trace elements."
        },
        {
          "step": "Step 3",
          "title": "Infant formula",
          "text": "Our experienced manufacturer excels in the processing of infant nutrition. The fresh milk is processed into milk powder and enriched with all the ingredients carefully selected by Jovie. Throughout the entire production process – from milk collection to end product - the product is constantly analyzed and tested on a number of quality aspects to make sure we maintain the quality standards set by us and authorities."
        },
        {
          "step": "Step 4",
          "title": "Final Quality Check",
          "text": "Before any Jovie Goat products leave the factory, as a final step in the production process, each batch of product produced is tested on quality, and of course compliance to the specifications to which it was made. Only after passing this detailed analysis can Jovie Goat products be shipped to consumers around the world."
        },
        {
          "step": "Step 5",
          "title": "Jovie is packed",
          "text": "Once our end product is finished, it is immediately packed. Jovie chooses sustainable tin packaging. During the packing process strict regulations are followed to make sure our quality is maintained."
        },
        {
          "step": "Step 6",
          "title": "At a Store Near You!",
          "text": "Finally, Jovie Goat products are delivered to a store near you."
        }
      ],
      "previous": "Previous",
      "next": "Next"
    }
  },
  "ar": {
    "title": "لماذا جوفي",
    "intro": "نؤمن بأن تغذية طفلك يجب أن تكون تجربة ممتعة. فطفلك يستحق الأفضل. باختيارك جوفي جوت، قولي مع السلامة لمشاكل الهضم، وأهلًا بطفل سعيد.",
    "buttons": [
      {
        "label": "عن جوفي",
        "target": "organic"
      },
      {
        "label": "كيف تم صنعها",
        "target": "jovieFacts"
      }
    ],
    "spirit": {
      "title": "روح جوفي",
      "lead": "نحن نحب الخصائص الفريدة لحليب الماعز! فهو الأساس المثالي لتغذية صحية ونقية لطفلك.",
      "paragraphs": [
        "نحن لا نمتلك فقط خبرة سنوات في تطوير تركيبات الرضع والأطفال المبنية على أساس حليب الماعز، ولكننا أيضًا آباء وأمهات ولدينا تجاربنا الخاصة - بداية من مضاعفات الحمل، إلى تحديات الرضاعة الطبيعية، وصولًا إلى انتقائية بعض أطفالنا الأكبر سنًّا في الأكل. نحن نؤمن بوجود اختيار أفضل من حليب الأبقار كمصدر للبروتين في تركيبات تغذية الرضع. للطبيعة مميزات أخرى تقدمها لنا، فلماذا نرضى بالاختيار الثاني؟ لذلك، فقد حرصنا على تطوير بديل لحليب الأم أنقى وأصح، يحتوي على عناصر التغذية السليمة والمتكاملة الضرورية لطفلك."
      ]
    },
    "quote": {
      "text": "نحن آباء وأمهات نعتني بأطفالنا، كما أننا فريق من خبراء تغذية الرضع والأطفال، ندرك أهمية التغذية الأفضل اللطيفة على معدة الطفل.",
      "author": "بن بوسر",
      "role": "المدير التنفيذي"
    },
    "benefits": {
      "title": "فوائد حليب الماعز",
      "intro": "اختيارك لمنتج قائم على حليب الماعز هو اختيار منطقي بالنظر إلى المزايا التي يقدمها حليب الماعز. حليب الماعز هو الأساس المثالي لأي تركيبة - جوفي للرضع، جوفي للأطفال، جوفي للأمهات - ويمثل الخيار الأفضل لجميع أفراد العائلة.",
      "cards": [
        {
          "title": "خيرات الحليب كامل الدسم",
          "text": "يحتوي على كل المزايا الصحية لحليب الماعز كامل الدسم.",
          "anchor": "fat"
        },
        {
          "title": "البروتين سهل الهضم",
          "text": "لطيف وخفيف على المعدة.",
          "anchor": "digest"
        },
        {
          "title": "للمعدة الحساسة",
          "text": "يحتوي على نسبة أقل من بروتين ألفا إس 1 كازين، ولذلك يريح الأطفال الذين لا يتحملون حليب الأبقار.",
          "anchor": "tummies"
        },
        {
          "title": "غني بالفيتامينات والمعادن",
          "text": "امتصاص عالٍ للفيتامينات والمعادن بحيث يستفيد منها الجسم بصورة أفضل.",
          "anchor": "vitamins"
        },
        {
          "title": "حليب A2 بطبيعته",
          "text": "بروتين البيتا كازين في حليب الماعز من النوع A2 بشكل طبيعي، دون أي تعديل أو إضافة.",
          "anchor": "a2"
        },
        {
          "title": "غني بعناصر غذائية دقيقة مميزة",
          "text": "يحتوي بشكل طبيعي على الأوليجوساكاريدات والنيوكليوتيدات.",
          "anchor": "fancy"
        }
      ],
      "more": "معلومات أخرى"
    },
    "organic": {
      "title": "جوفي تختار العضوي",
      "paragraphs": [
        "كوكبنا هو أثمن ما نملك، وعندما نعتني به يعتني بنا. فحماية كوكبنا هي حماية لصحتنا وصحة عائلاتنا وصحة أحفادنا والأجيال القادمة.",
        "تُنتَج منتجات جوفي بطريقة مستدامة وأقرب ما يمكن إلى الطبيعة."
      ]
    },
    "different": {
      "title": "جوفي مختلفة",
      "items": [
        {
          "key": "organic",
          "title": "حليب الماعز العضوي",
          "text": "حليب الماعز هو المكون الأساسي لمنتجات جوفي. جوفي جوت منتج عضوي معتمد وفق المعايير العضوية للاتحاد الأوروبي. واختيار الزراعة العضوية يدعم رفاهية الحيوان، ويقلل تلوث المياه، ويشجع استخدام الموارد المحلية في تغذية الحيوانات، ويثري التربة، ويدعم التنوع البيولوجي، ويهدف إلى تقليل البصمة الكربونية.",
          "more": "معلومات أخرى"
        },
        {
          "key": "without",
          "title": "جوفي تقول",
          "text": "تحتوي أي تركيبة حليب حديثة دائمًا على قائمة طويلة من المكونات الضرورية، وما نستطيع أن نعد به هو ألا يحتوي أيٌّ من منتجاتنا على زيت النخيل أو المالتودكسترين. والحقيقة أن منتجات جوفي تخضع لأقل قدر ممكن من المعالجة، لنحافظ على أكبر قدر من العناصر الغذائية الطبيعية في حليب الماعز.",
          "more": "معلومات أخرى"
        },
        {
          "key": "non-gmo",
          "title": "غير معدل وراثيًا",
          "text": "تلتزم جوفي بإنتاج منتجات عضوية من مكونات غير معدلة وراثيًا، وخالية من الجلايفوسات (وهو أحد مكونات مبيدات الأعشاب). ونضمن ذلك بالتزامنا بمعايير صارمة للأعلاف وأساليب الزراعة المستخدمة في إنتاج مكوناتنا.",
          "more": "معلومات أخرى"
        }
      ]
    },
    "howItsMade": {
      "title": "كيف تم إنتاجه",
      "slides": [
        {
          "step": "خطوة 1",
          "title": "الزراعة",
          "text": "نلتزم بمعايير جودة عالية لحليب الماعز المستخدم في منتجاتنا، ويبدأ ذلك من المزرعة؛ فبدون الماعز لا وجود لمنتجاتنا. وصحة الماعز وراحتها مهمة جدًا لنا، ليس فقط لأن المزارع يهتم بحيواناته، بل لأن الماعز السليمة تعطينا الحليب الغني الدسم الذي نستخدمه في منتجاتنا."
        },
        {
          "step": "خطوة 2",
          "title": "تجميع الحليب",
          "text": "يُجمع الحليب الطازج مرتين في الأسبوع على الأقل، وتنقله شاحنة مخصصة للحليب. وقبل جمعه يُختبر للتأكد من خلوه من المضادات الحيوية والهرمونات وأي مواد غير مرغوب فيها."
        },
        {
          "step": "خطوة 3",
          "title": "تركيبة الرضع",
          "text": "يتميز مصنعنا صاحب الخبرة في تصنيع أغذية الرضع. يُحوَّل الحليب الطازج إلى مسحوق، ثم يُدعَّم بالمكونات التي اختارتها جوفي بعناية. ويُحلَّل المنتج ويُختبر باستمرار في كل مراحل التصنيع، لنضمن مطابقته لمعايير الجودة التي تحددها جهات الاعتماد."
        },
        {
          "step": "خطوة 4",
          "title": "تعبئة تركيبات حليب جوفي",
          "text": "بمجرد الانتهاء من المنتج النهائي يُعبَّأ فورًا. واختارت جوفي عبوات معدنية مستدامة، ونتبع تعليمات صارمة طوال عملية التعبئة لنحافظ على الجودة."
        },
        {
          "step": "خطوة 5",
          "title": "اختبار الجودة النهائي",
          "text": "وكخطوة أخيرة من خطوات الإنتاج ولضمان الجودة، قبل مغادرة أي من منتجات جوفي للمصنع، تُختبر كل دفعة إنتاج على حدة، للتأكد من جودتها ومطابقتها للمواصفات المعتمدة. وبعد أن يمر المنتج بكل خطوات اختبار الجودة، تُرسَل المنتجات إلى المستهلكين حول العالم."
        },
        {
          "step": "خطوة 6",
          "title": "في متجر قريب منك!",
          "text": "وأخيرًا، تُوزَّع منتجات جوفي لتصل إلى متجر قريب منك."
        }
      ],
      "previous": "السابق",
      "next": "التالي"
    }
  }
};
