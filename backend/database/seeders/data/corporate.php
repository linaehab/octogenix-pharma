<?php

/*
| Initial corporate list items, services and brands, copied from the current Angular site.
| Journey stops keep their year in subtitle_en (the "year" field: the same in both languages).
| Seeded only into empty lists/tables; never overwrites dashboard edits.
*/

return [
    'lists' => [
        'home.hero_slides' => [
            [
                'image_path' => '/assets/images/corporate-v3/hero-hands-capsules.webp',
            ],
            [
                'image_path' => '/assets/images/corporate-v3/hero-hands-care.webp',
            ],
            [
                'image_path' => '/assets/images/corporate-v3/hero-hands-tablets.webp',
            ],
        ],
        'about.journey' => [
            [
                'subtitle_en' => '2020',
                'title_en' => 'Our beginning',
                'title_ar' => 'البداية',
                'description_en' => 'Octogenix Pharma is founded under Dr. Tarek Kandil, specializing in the import, export and distribution of pharmaceutical products.',
                'description_ar' => 'تأسيس أوكتوجينيكس فارما تحت قيادة الدكتور طارق قنديل، متخصصةً في استيراد وتصدير وتوزيع المنتجات الصيدلانية.',
            ],
            [
                'subtitle_en' => '2021',
                'title_en' => 'Laying the foundation',
                'title_ar' => 'ترسيخ الأساس',
                'description_en' => 'Building a business base in pharmaceutical trade and distribution, grounded in trust and an understanding of the Egyptian market\'s needs.',
                'description_ar' => 'بناء قاعدة أعمال في تجارة وتوزيع الأدوية، ترتكز على الثقة وفهم احتياجات السوق المصري.',
            ],
            [
                'subtitle_en' => '2022',
                'title_en' => 'Growing our partner network',
                'title_ar' => 'تنمية شبكة الشركاء',
                'description_en' => 'Developing relationships with pharmacies and distribution partners, and strengthening ties across the pharmaceutical sector\'s channels.',
                'description_ar' => 'تطوير العلاقات مع الصيدليات وشركاء التوزيع، وتعزيز التواصل مع مختلف قنوات القطاع الدوائي.',
            ],
            [
                'subtitle_en' => '2023',
                'title_en' => 'Strengthening operational efficiency',
                'title_ar' => 'تعزيز الكفاءة التشغيلية',
                'description_en' => 'Developing our supply and distribution system to support business continuity and prepare for expansion.',
                'description_ar' => 'تطوير منظومة التوريد والتوزيع لدعم استمرارية الأعمال والاستعداد للتوسع.',
            ],
            [
                'subtitle_en' => '2024',
                'title_en' => 'Broadening the vision',
                'title_ar' => 'توسيع الرؤية',
                'description_en' => 'Moving towards new opportunities in food supplements and specialized nutrition, complementing our work in the pharmaceutical sector.',
                'description_ar' => 'التوجه نحو فرص جديدة في المكملات الغذائية والتغذية المتخصصة، استكمالًا لنشاطنا في القطاع الدوائي.',
            ],
            [
                'subtitle_en' => '2025',
                'title_en' => 'Building international bridges',
                'title_ar' => 'بناء جسور دولية',
                'description_en' => 'Opening channels of cooperation with global companies, and exploring partnerships that bring together product quality and local market needs.',
                'description_ar' => 'فتح قنوات التعاون مع شركات عالمية، ودراسة شراكات تجمع بين جودة المنتجات واحتياجات السوق المحلي.',
            ],
            [
                'subtitle_en' => '2026',
                'title_en' => 'Developing our international portfolio',
                'title_ar' => 'تطوير محفظتنا الدولية',
                'description_en' => 'Registering selected products, developing import partnerships, and building the groundwork to launch international brands in Egypt.',
                'description_ar' => 'العمل على تسجيل منتجات مختارة، وتطوير شراكات الاستيراد، وبناء مقومات إطلاق علامات دولية في مصر.',
            ],
            [
                'subtitle_en' => '2027',
                'title_en' => 'Our next horizon',
                'title_ar' => 'أفقنا القادم',
                'description_en' => 'We look forward to launching our portfolio of international brands and expanding our presence, as a trusted partner in providing healthcare and nutrition products.',
                'description_ar' => 'نتطلع إلى إطلاق محفظتنا من العلامات الدولية وتوسيع حضورنا، لنكون شريكًا موثوقًا في إتاحة منتجات الرعاية الصحية والتغذية.',
            ],
        ],
        'about.leadership' => [
            [
                'title_en' => 'Dr. Tarek Kandil',
                'title_ar' => 'د. طارق قنديل',
                'subtitle_en' => 'Founder',
                'subtitle_ar' => 'المؤسس',
            ],
            [
                'title_en' => 'Mr. Metwally Kandil',
                'title_ar' => 'أ. متولي قنديل',
                'subtitle_en' => 'VP & Managing Director',
                'subtitle_ar' => 'نائب الرئيس والعضو المنتدب',
            ],
            [
                'title_en' => 'Dr. Soha El-Kholy',
                'title_ar' => 'د. سها الخولي',
                'subtitle_en' => 'COO',
                'subtitle_ar' => 'رئيس قطاع العمليات',
            ],
        ],
    ],
    'services' => [
        [
            'category' => 'customers',
            'title_en' => 'Contracting and Documentation',
            'title_ar' => 'التعاقد والتوثيق',
            'description_en' => 'Official contracting procedures and documentation of company-client information and agreements, including pharmacies and medical institutions.',
            'description_ar' => 'إجراءات التعاقد رسميًا وتوثيق البيانات بين الشركة والعملاء، مثل الصيدليات والمؤسسات الطبية.',
        ],
        [
            'category' => 'customers',
            'title_en' => 'Order Reception',
            'title_ar' => 'استلام الطلبات',
            'description_en' => 'Receiving orders for medicines and medical supplies through digital platforms and various communication channels.',
            'description_ar' => 'استقبال طلبات الأدوية والمستلزمات الطبية من العملاء عبر المنصات الرقمية أو وسائل التواصل المختلفة.',
        ],
        [
            'category' => 'customers',
            'title_en' => 'Order Supply and Delivery',
            'title_ar' => 'تجهيز الطلبات والتسليم',
            'description_en' => 'Logistics and distribution operations for delivering medicines and products to pharmacies and outlets across different governorates.',
            'description_ar' => 'عمليات اللوجستيات والتوزيع لنقل الأدوية والمنتجات إلى الصيدليات والمنافذ بمختلف المحافظات.',
        ],
        [
            'category' => 'customers',
            'title_en' => 'Payment Services',
            'title_ar' => 'خدمات الدفع',
            'description_en' => 'Providing diverse payment solutions, including electronic payment options, to facilitate customer transactions.',
            'description_ar' => 'توفير حلول وطرق دفع متنوعة وإلكترونية لتسهيل المعاملات المالية للعملاء.',
        ],
        [
            'category' => 'customers',
            'title_en' => 'Customer Service',
            'title_ar' => 'خدمة العملاء',
            'description_en' => 'Ongoing support, inquiry follow-up, problem resolution, and assistance to meet customer needs.',
            'description_ar' => 'الدعم الفني والمتابعة المستمرة للاستفسارات، حل المشكلات، وتلبية احتياجات العملاء.',
        ],
        [
            'category' => 'suppliers',
            'title_en' => 'Distribution',
            'title_ar' => 'التوزيع',
            'description_en' => 'Efficient storage and distribution services for pharmaceutical and medical products, supported by broad distribution coverage.',
            'description_ar' => 'خدمات تخزين وتوزيع المنتجات الدوائية والطبية بكفاءة وتغطية واسعة.',
        ],
        [
            'category' => 'suppliers',
            'title_en' => 'Regulatory Affairs',
            'title_ar' => 'الشؤون التنظيمية',
            'description_en' => 'Assistance with regulatory procedures, product registration, and official legal and administrative requirements related to pharmaceuticals.',
            'description_ar' => 'المساعدة في الإجراءات التنظيمية، التسجيل، وتسهيل المعاملات القانونية والرسمية الخاصة بالدواء.',
        ],
        [
            'category' => 'suppliers',
            'title_en' => 'Agency Services',
            'title_ar' => 'خدمات الوكالة',
            'description_en' => 'Commercial representation and agency services for manufacturers and suppliers.',
            'description_ar' => 'تقديم خدمات التمثيل التجاري والوكالة للمصنعين والموردين.',
        ],
        [
            'category' => 'suppliers',
            'title_en' => 'Marketing Services',
            'title_ar' => 'خدمات التسويق',
            'description_en' => 'Developing marketing and promotional strategies for pharmaceutical products to increase sales and reach customers.',
            'description_ar' => 'وضع الاستراتيجيات التسويقية والترويجية للمنتجات الدوائية لزيادة مبيعاتها وصولاً للعملاء.',
        ],
        [
            'category' => 'suppliers',
            'title_en' => 'Import',
            'title_ar' => 'الاستيراد',
            'description_en' => 'Managing import operations and customs-clearance procedures for medicines and medical supplies sourced internationally.',
            'description_ar' => 'إدارة عمليات التخليص واستيراد الأدوية والمستلزمات من الخارج.',
        ],
        [
            'category' => 'suppliers',
            'title_en' => 'Export',
            'title_ar' => 'التصدير',
            'description_en' => 'Supporting access to international markets and facilitating product export procedures.',
            'description_ar' => 'فتح منافذ وتسهيل إجراءات تصدير المنتجات إلى الأسواق الخارجية.',
        ],
        [
            'category' => 'suppliers',
            'title_en' => 'Scientific Office',
            'title_ar' => 'المكتب العلمي',
            'description_en' => 'Providing scientific support, consultations, and communication with healthcare professionals and physicians to introduce products.',
            'description_ar' => 'تقديم الدعم العلمي، الاستشارات، والتواصل مع القطاع الطبي والأطباء للتعريف بالمنتجات.',
        ],
    ],
    'brands' => [
        [
            'slug' => 'jovie',
            'name_en' => 'Jovie',
            'name_ar' => 'Jovie',
            // The official Jovie logo, shown in a white tile on the Our Brands page.
            'logo_path' => '/assets/images/jovie/logo-official-yellow.png',
            'cta_label_en' => 'Contact us about our portfolio',
            'cta_label_ar' => 'تواصلوا معنا بشأن العلامات',
            'link_type' => 'internal',
            'link_url' => '/contact',
            'has_store' => true,
            'is_active' => true,
        ],
    ],
];
