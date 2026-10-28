/*
 * The official "More information" pages of jovieproducts.com/why-jovie-goat/ (English only: the
 * official Arabic site has no such pages), used with the brand owner's permission, as ordered
 * text blocks. The headings of "makes good sense" carry the anchors the benefit cards link to.
 */
export type WhySubpageKey = 'makes-good-sense' | 'organic' | 'without-promise';

export interface WhyBlock {
  kind: 'h3' | 'h4' | 'p' | 'strong' | 'em' | 'li' | 'img';
  text: string;
  id?: string;
  src?: string;
}

export const WHY_SUBPAGES: Record<WhySubpageKey, { title: string; blocks: WhyBlock[] }> = {
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
