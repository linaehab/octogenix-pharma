<?php

/*
| Jovie products (phase 4), as provided by the client.
|
| Confirmed by the client: names (en/ar), age ranges, 400 g net weight, the Arabic descriptions
| (organic goat milk, made in Denmark). The English descriptions are translations of those
| Arabic descriptions and should be approved by the client.
|
| NOT provided, so intentionally left empty — no values are invented:
| prices, stock, barcodes, ingredients, nutrition facts, preparation/storage instructions,
| registration numbers and product images.
|
| SKUs are PLACEHOLDERS (marked "-TBC"): the column is required and unique, so each pack needs
| one. Replace them with the client's real SKUs from the dashboard.
|
| Products are seeded inactive and not purchasable: an active product needs an image, and a
| sellable one needs a price. Activate them from the dashboard once the client supplies both.
*/

return [
    [
        'slug' => 'jovie-organic-infant-milk-stage-1',
        'name_en' => 'Jovie Organic Infant Milk - Stage 1',
        'name_ar' => 'تركيبة حليب جوفي العضوي للرضع',
        'subtitle_en' => 'Stage 1 · 0–6 months',
        'subtitle_ar' => 'المرحلة 1 · من الولادة حتى 6 أشهر',
        'short_description_en' => 'Formula based on whole organic goat milk. Made in Denmark.',
        'short_description_ar' => 'تركيبة أساسها حليب ماعز عضوي كامل، صنع في الدنمارك.',
        'stage' => 1,
        'age_from_months' => 0,
        'age_to_months' => 6,
        'variant' => ['sku' => 'JOVIE-S1-400G-TBC', 'name_en' => '400 g', 'name_ar' => '400 جم', 'net_weight_grams' => 400],
    ],
    [
        'slug' => 'jovie-organic-follow-on-milk-stage-2',
        'name_en' => 'Jovie Organic Follow-on Milk - Stage 2',
        'name_ar' => 'تركيبة حليب جوفي العضوي للمتابعة',
        'subtitle_en' => 'Stage 2 · 6–12 months',
        'subtitle_ar' => 'المرحلة 2 · من 6 إلى 12 شهراً',
        'short_description_en' => 'Follow-on formula made from organic goat milk. Made in Denmark.',
        'short_description_ar' => 'تركيبة متابعة من حليب الماعز العضوي، صنع في الدنمارك.',
        'stage' => 2,
        'age_from_months' => 6,
        'age_to_months' => 12,
        'variant' => ['sku' => 'JOVIE-S2-400G-TBC', 'name_en' => '400 g', 'name_ar' => '400 جم', 'net_weight_grams' => 400],
    ],
    [
        'slug' => 'jovie-organic-follow-on-formula-toddlers-stage-3',
        'name_en' => 'Jovie Organic Follow-on Formula for Toddlers - Stage 3',
        'name_ar' => 'تركيبة للمتابعة من حليب الماعز العضوي للأطفال الصغار',
        'subtitle_en' => 'Stage 3 · 1–3 years',
        'subtitle_ar' => 'المرحلة 3 · من 1 إلى 3 سنوات',
        'short_description_en' => 'Advanced follow-on formula for toddlers, made from organic goat milk. Made in Denmark.',
        'short_description_ar' => 'تركيبة متابعة متقدمة للأطفال الصغار من حليب الماعز العضوي، صنع في الدنمارك.',
        'stage' => 3,
        'age_from_months' => 12,
        'age_to_months' => 36,
        'variant' => ['sku' => 'JOVIE-S3-400G-TBC', 'name_en' => '400 g', 'name_ar' => '400 جم', 'net_weight_grams' => 400],
    ],
];
