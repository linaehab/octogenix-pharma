import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Language = 'en' | 'ar';

const translations: Record<Language, Record<string, string>> = {
  en: {
    'company.name': 'Octogenix Pharma',
    'header.tagline': 'Trusted pharmaceutical solutions',
    'header.home': 'Home',
    'header.about': 'About Us',
    'header.services': 'Services',
    'header.servicesCustomers': 'Customers',
    'header.servicesSuppliers': 'Suppliers',
    'header.brands': 'Our Brands',
    'header.contact': 'Contact Us',
    'header.menu': 'Toggle navigation',
    'header.navigation': 'Main navigation',
    'header.homeLabel': 'Octogenix Pharma home',
    'header.switchLanguage': 'العربية',
    'title.welcome': 'Octogenix Pharma',
    'title.home': 'Home | Octogenix Pharma',
    'title.about': 'About Us | Octogenix Pharma',
    'title.services': 'Services | Octogenix Pharma',
    'title.brands': 'Our Brands | Octogenix Pharma',
    'title.contact': 'Contact Us | Octogenix Pharma',
    'banner.message': 'Trusted pharmaceutical solutions for better healthcare',
    'banner.highlight': 'Quality • Trust • Healthcare',
    'banner.link': 'Explore our services',
    'hero.kicker': 'Pharmaceutical distribution, import and export',
    'hero.titleFirst': 'Trusted Pharmaceutical',
    'hero.titleSecond': 'Solutions for Better',
    'hero.titleEmphasis': 'Healthcare',
    'hero.description':
      'Octogenix Pharma delivers pharmaceutical distribution, import, and export services with a focus on quality, reliability, and long-term partnerships.',
    'hero.cta': 'About Us',
    'hero.tagMarketing': 'Marketing',
    'hero.contactCta': 'Contact Us',
    'hero.noteOne': 'Quality-led',
    'hero.noteTwo': 'GSDP',
    'hero.scroll': 'Discover our company',
    'hero.imageAlt': 'A mother holding her baby in a bright studio',
    'about.kicker': 'About Octogenix Pharma',
    'about.title': 'Pharmaceutical solutions for a healthier future.',
    'about.description':
      'Octogenix Pharma was founded in 2020 as a company specializing in pharmaceutical import, export, and distribution, under the leadership of its founder and owner, Dr. Tarek Elmetwally Kandil.',
    'about.story':
      'Our story began with an ambitious vision to bring advanced pharmaceutical solutions and import and export services to the healthcare sector.',
    'about.link': 'Explore our services',
    'bridge.title': "Connecting global expertise with Egypt's healthcare needs",
    'bridge.textOne':
      'At Octogenix, we build on our experience in the Egyptian market to develop partnerships with international companies and to make selected products available in pharmaceuticals, dietary supplements and specialized nutrition.',
    'bridge.textTwo':
      'We combine local knowledge with international ambition, and we are developing our registration, import and distribution capabilities to create lasting value for our partners and for the healthcare sector.',
    'bridge.imageAlt': 'Hands holding a tablet showing a health app',
    'market.title': 'Our market reach',
    'market.description':
      "We are developing a network of commercial relationships that connects our portfolio's products with healthcare channels in Egypt, suited to the needs of each sector and supporting our partners' growth.",
    'market.pharmacies': 'Pharmacies',
    'market.distributors': 'Distributors & Wholesalers',
    'market.hospitals': 'Hospitals',
    'market.clinics': 'Clinics & Medical Centers',
    'values.teamImageAlt': 'Colleagues joining hands in the middle of a circle',
    'quality.sectionTitle': 'Certified quality',
    'focus.title': 'Our areas of focus',
    'focus.medicine.title': 'Pharmaceuticals',
    'focus.medicine.text': 'Trading and distributing pharmaceutical products.',
    'focus.supplement.title': 'Dietary supplements',
    'focus.supplement.text': 'Developing a selected portfolio that supports nutritional needs.',
    'focus.infant.title': 'Infant and child nutrition',
    'focus.infant.text': 'Working to bring specialized brands to the Egyptian market.',
    'focus.partnership.title': 'International partnerships',
    'focus.partnership.text': 'Developing import and commercial representation opportunities.',
    'journey.kicker': 'Our journey',
    'journey.title': 'Our journey towards wider horizons',
    'journey.description':
      'Experience we build on, and partnerships through which we look ahead to a better future for healthcare.',
    'journey.2020.title': 'Our beginning',
    'journey.2020.text':
      'Octogenix Pharma is founded under Dr. Tarek Kandil, specializing in the import, export and distribution of pharmaceutical products.',
    'journey.2021.title': 'Laying the foundation',
    'journey.2021.text':
      "Building a business base in pharmaceutical trade and distribution, grounded in trust and an understanding of the Egyptian market's needs.",
    'journey.2022.title': 'Growing our partner network',
    'journey.2022.text':
      "Developing relationships with pharmacies and distribution partners, and strengthening ties across the pharmaceutical sector's channels.",
    'journey.2023.title': 'Strengthening operational efficiency',
    'journey.2023.text':
      'Developing our supply and distribution system to support business continuity and prepare for expansion.',
    'journey.2024.title': 'Broadening the vision',
    'journey.2024.text':
      'Moving towards new opportunities in food supplements and specialized nutrition, complementing our work in the pharmaceutical sector.',
    'journey.2025.title': 'Building international bridges',
    'journey.2025.text':
      'Opening channels of cooperation with global companies, and exploring partnerships that bring together product quality and local market needs.',
    'journey.2026.title': 'Developing our international portfolio',
    'journey.2026.text':
      'Registering selected products, developing import partnerships, and building the groundwork to launch international brands in Egypt.',
    'journey.2027.title': 'Our next horizon',
    'journey.2027.text':
      'We look forward to launching our portfolio of international brands and expanding our presence, as a trusted partner in providing healthcare and nutrition products.',
    'services.kicker': 'Our services',
    'services.title': 'Pharmaceutical services with care and quality.',
    'services.customers': 'Customers',
    'services.suppliers': 'Suppliers',
    'services.customerContractingTitle': 'Contracting and Documentation',
    'services.customerContractingDescription':
      'Official contracting procedures and documentation of company-client information and agreements, including pharmacies and medical institutions.',
    'services.customerOrderReceptionTitle': 'Order Reception',
    'services.customerOrderReceptionDescription':
      'Receiving orders for medicines and medical supplies through digital platforms and various communication channels.',
    'services.customerOrderSupplyTitle': 'Order Supply and Delivery',
    'services.customerOrderSupplyDescription':
      'Logistics and distribution operations for delivering medicines and products to pharmacies and outlets across different governorates.',
    'services.customerPaymentTitle': 'Payment Services',
    'services.customerPaymentDescription':
      'Providing diverse payment solutions, including electronic payment options, to facilitate customer transactions.',
    'services.customerSupportTitle': 'Customer Service',
    'services.customerSupportDescription':
      'Ongoing support, inquiry follow-up, problem resolution, and assistance to meet customer needs.',
    'services.supplierDistributionTitle': 'Distribution',
    'services.supplierDistributionDescription':
      'Efficient storage and distribution services for pharmaceutical and medical products, supported by broad distribution coverage.',
    'services.supplierRegulatoryTitle': 'Regulatory Affairs',
    'services.supplierRegulatoryDescription':
      'Assistance with regulatory procedures, product registration, and official legal and administrative requirements related to pharmaceuticals.',
    'services.supplierAgencyTitle': 'Agency Services',
    'services.supplierAgencyDescription':
      'Commercial representation and agency services for manufacturers and suppliers.',
    'services.supplierMarketingTitle': 'Marketing Services',
    'services.supplierMarketingDescription':
      'Developing marketing and promotional strategies for pharmaceutical products to increase sales and reach customers.',
    'services.supplierImportTitle': 'Import',
    'services.supplierImportDescription':
      'Managing import operations and customs-clearance procedures for medicines and medical supplies sourced internationally.',
    'services.supplierExportTitle': 'Export',
    'services.supplierExportDescription':
      'Supporting access to international markets and facilitating product export procedures.',
    'services.supplierScientificTitle': 'Scientific Office',
    'services.supplierScientificDescription':
      'Providing scientific support, consultations, and communication with healthcare professionals and physicians to introduce products.',
    'services.customerContractingImageAlt': 'Professionals collaborating in a bright meeting room',
    'services.customerOrderReceptionImageAlt': 'A laboratory specialist conducting quality checks',
    'services.customerOrderSupplyImageAlt': 'Packaged goods in an organized distribution warehouse',
    'services.customerPaymentImageAlt': 'Palletized goods in a distribution warehouse',
    'services.customerSupportImageAlt': 'Healthcare researchers working at a microscope',
    'services.supplierDistributionImageAlt': 'An organized aisle in a high-bay warehouse',
    'services.supplierRegulatoryImageAlt': 'A specialist working in a clean production environment',
    'services.supplierAgencyImageAlt':
      'A professional working in an industrial production facility',
    'services.supplierMarketingImageAlt':
      'Infant nutrition powder and feeding products in a clean studio',
    'services.supplierImportImageAlt':
      'A laboratory specialist preparing samples for quality checks',
    'services.supplierExportImageAlt': 'A laboratory specialist selecting a sample for inspection',
    'services.supplierScientificImageAlt':
      'Researchers collaborating in a pharmaceutical laboratory',
    'values.kicker': 'What guides us',
    'values.title': 'Quality, purpose and trust in healthcare.',
    'values.description':
      'Our mission, vision and values guide how we approach pharmaceutical solutions and our role in healthcare.',
    'values.missionTitle': 'Our Mission',
    'values.missionDescription':
      'To make quality healthcare products more accessible in Egypt by connecting international manufacturers with pharmacies, hospitals and healthcare professionals through reliable import and distribution services.',
    'values.visionTitle': 'Our Vision',
    'values.visionDescription':
      'To become a leading healthcare distribution company in Egypt and a trusted partner for international brands expanding into regional markets.',
    'values.missionImageAlt': 'A laboratory specialist preparing samples for quality checks',
    'ourValues.title': 'Our Values',
    'ourValues.intro': 'Our values guide our decisions, shape our relationships and define how we work every day.',
    'ourValues.teamSpirit': 'Team Spirit',
    'ourValues.teamSpiritText': 'We work together towards shared goals.',
    'ourValues.responsibility': 'Responsibility',
    'ourValues.responsibilityText': 'We take ownership of our actions and commitments.',
    'ourValues.respect': 'Respect',
    'ourValues.respectText': 'We value people and treat everyone fairly.',
    'ourValues.innovation': 'Innovation',
    'ourValues.innovationText': 'We welcome new ideas and better ways of working.',
    'ourValues.professionalism': 'Professionalism',
    'ourValues.professionalismText': 'We bring care, knowledge and dedication to our work.',
    'ourValues.efficiency': 'Efficiency',
    'ourValues.efficiencyText': 'We use time and resources wisely.',
    'ourValues.personalGrowth': 'Personal Growth',
    'ourValues.personalGrowthText': 'We support continuous learning and development.',
    'ourValues.trust': 'Trust',
    'ourValues.trustText': 'We build lasting relationships through honesty and transparency.',
    'approach.title': 'Our Approach',
    'approach.market': 'Market Understanding',
    'approach.marketText': 'Identify healthcare needs and assess the market potential of each product.',
    'approach.portfolio': 'Portfolio Selection',
    'approach.portfolioText': 'Select complementary brands and products with a clear role in our portfolio.',
    'approach.regulatory': 'Regulatory Coordination',
    'approach.regulatoryText': 'Coordinate documentation and registration requirements to support market entry.',
    'approach.distribution': 'Distribution Planning',
    'approach.distributionText': 'Plan supply and distribution around product requirements and customer demand.',
    'approach.commercial': 'Commercial Development',
    'approach.commercialText': 'Support market presence through focused sales, marketing and ongoing performance review.',
    'quality.kicker': 'Our quality commitment',
    'quality.title': 'A clear standard for storage and distribution practices.',
    'quality.standard': 'GSDP — Good Storage and Distribution Practices',
    'leadership.kicker': 'Leadership',
    'leadership.title': 'Our leadership',
    'leadership.description': 'The people leading Octogenix Pharma.',
    'leadership.tarek': 'Dr. Tarek Kandil',
    'leadership.founder': 'Founder',
    'leadership.metwally': 'Mr. Metwally Kandil',
    'leadership.managingDirector': 'VP & Managing Director',
    'leadership.soha': 'Dr. Soha El-Kholy',
    'leadership.coo': 'COO',
    'brands.kicker': 'Our brands',
    'brands.title': 'A considered brand portfolio.',
    'brands.summary': 'Meet one confirmed brand from Octogenix Pharma’s portfolio.',
    'brands.label': 'A confirmed represented brand',
    'brands.jovie': 'Jovie',
    'brands.description':
      'Jovie has been identified as a brand represented by the company. An approved brand description has not been supplied.',
    'brands.imageAlt': 'Infant nutrition powder, bottle and measuring scoop',
    'page.about.imageAlt': 'A technical specialist working in a bright production facility',
    'page.services.imageAlt': 'An organized aisle in a high-bay distribution warehouse',
    'page.brands.imageAlt': 'Healthcare researchers collaborating in a bright laboratory',
    'page.contact.imageAlt': 'Healthcare researchers collaborating in a bright laboratory',
    'brands.cta': 'Contact us about our portfolio',
    'brands.visitWebsite': 'Visit {brand} Egypt website',
    'contact.kicker': 'Contact Octogenix Pharma',
    'contact.title': 'Let’s start a conversation.',
    'contact.description':
      'Have a question or want to discuss a potential business opportunity? Get in touch with our team.',
    'contact.detailsTitle': 'Contact details',
    'contact.phoneLabel': 'Phone',
    'contact.emailLabel': 'Email',
    'contact.addressLabel': 'Address',
    'contact.address':
      '128/4, Building 14, District 3, Neighborhood 14, New Damietta, Damietta, Egypt.',
    'contact.imageAlt': 'Professionals collaborating in a bright meeting room',
    'contact.formTitle': 'Send a Message',
    'contact.formDescription':
      'Have a question or want to discuss a potential business opportunity? Get in touch with our team.',
    'contact.firstName': 'First Name',
    'contact.firstNamePlaceholder': 'John',
    'contact.lastName': 'Last Name',
    'contact.lastNamePlaceholder': 'Doe',
    'contact.emailPlaceholder': 'john@company.com',
    'contact.phonePlaceholder': '+20 1XX XXX XXXX',
    'contact.subject': 'Subject',
    'contact.subjectPlaceholder': 'Select a subject...',
    'contact.subjectGeneral': 'General Inquiry',
    'contact.subjectPartnership': 'Business Partnership',
    'contact.subjectDistribution': 'Pharmaceutical Distribution',
    'contact.subjectImportExport': 'Import & Export',
    'contact.subjectOther': 'Other',
    'contact.message': 'Message',
    'contact.messagePlaceholder': 'Write your message here...',
    'contact.requiredError': 'This field is required.',
    'contact.emailError': 'Enter a valid email address.',
    'contact.sending': 'Sending…',
    'contact.success': 'Thank you. Your message has been sent and our team will get back to you soon.',
    'contact.errorValidation': 'Some details could not be accepted. Please review the form and try again.',
    'contact.errorRateLimited':
      'Too many messages were sent from this connection. Please try again in a few minutes.',
    'contact.errorGeneric':
      'Your message could not be sent right now. Please try again later, or contact us by phone or email.',
    'contact.submit': 'Send Message',
    'footer.tagline': 'Trusted pharmaceutical solutions for better healthcare.',
    'footer.navigation': 'Footer navigation',
    'footer.social': 'Octogenix on social media',
    'footer.social.facebook': 'Facebook (opens in a new tab)',
    'footer.social.instagram': 'Instagram (opens in a new tab)',
    'footer.social.linkedin': 'LinkedIn (opens in a new tab)',
    'footer.copyright': '© {year} Octogenix Pharma.',
    'page.about.kicker': 'About us',
    'page.about.title': 'About Octogenix Pharma',
    'page.about.description':
      'A pharmaceutical company founded in 2020, specializing in import, export and distribution.',
    'page.services.kicker': 'What we do',
    'page.services.title': 'Pharmaceutical distribution, import, export and supplements.',
    'page.services.description':
      'Discover Octogenix Pharma’s stated pharmaceutical business activities.',
    'page.brands.kicker': 'Our brands',
    'page.brands.title': 'A considered brand portfolio.',
    'page.brands.description':
      'Meet Jovie, one of the brands in the Octogenix Pharma portfolio.',
    'page.contact.kicker': 'Contact us',
    'page.contact.title': 'Contact Octogenix Pharma',
    'page.contact.description':
      'Find our contact details and send a message to the Octogenix Pharma team.',
    // Company Impact
    'companyImpact.purpose': 'OUR PURPOSE',
    'companyImpact.headlineLine1': 'Improving Access',
    'companyImpact.headlineLine2': 'to Better Healthcare',
    'companyImpact.description':
      'We connect trusted international manufacturers with the Egyptian market through reliable import, compliant distribution and strong local support.',
    'companyImpact.aboutCta': 'About OCTOGENIX',

    // Feature Cards

    // Company Impact Statistics
    'companyImpact.impact': 'OUR IMPACT',
    'companyImpact.impactLine1': 'Global Expertise.',
    'companyImpact.impactLine2': 'Local Commitment.',

    // Trusted Partners
    'companyImpact.partnersLine1': 'Trusted',
    'companyImpact.partnersLine2': 'Partners',
    'companyImpact.partnersLine3': 'Worldwide',

    // Pharmaceutical Products
    'companyImpact.productsLine1': 'Wide Range',
    'companyImpact.productsLine2': 'of Pharmaceutical',
    'companyImpact.productsLine3': 'Products',

    // Distribution Across Egypt
    'companyImpact.distributionLine1': 'Nationwide',
    'companyImpact.distributionLine2': 'Distribution',
    'companyImpact.distributionLine3': 'Across Egypt',

    // Healthcare Professionals
    'companyImpact.healthcareLine1': 'Supporting',
    'companyImpact.healthcareLine2': 'Healthcare',
    'companyImpact.healthcareLine3': 'Professionals',
  },
  ar: {
    'company.name': 'أوكتوجينيكس فارما',
    'header.tagline': 'حلول صيدلانية موثوقة',
    'header.home': 'الرئيسية',
    'header.about': 'من نحن',
    'header.services': 'خدماتنا',
    'header.servicesCustomers': 'العملاء',
    'header.servicesSuppliers': 'الموردون',
    'header.brands': 'علاماتنا التجارية',
    'header.contact': 'تواصل معنا',
    'header.menu': 'فتح قائمة التنقل',
    'header.navigation': 'القائمة الرئيسية',
    'header.homeLabel': 'أوكتوجينيكس فارما - الرئيسية',
    'header.switchLanguage': 'English',
    'title.welcome': 'أوكتوجينيكس فارما',
    'title.home': 'الرئيسية | أوكتوجينيكس فارما',
    'title.about': 'من نحن | أوكتوجينيكس فارما',
    'title.services': 'خدماتنا | أوكتوجينيكس فارما',
    'title.brands': 'علاماتنا التجارية | أوكتوجينيكس فارما',
    'title.contact': 'تواصل معنا | أوكتوجينيكس فارما',
    'banner.message': 'حلول صيدلانية موثوقة لرعاية صحية أفضل',
    'banner.highlight': 'الجودة • الثقة • الرعاية الصحية',
    'banner.link': 'اكتشفوا خدماتنا',
    'hero.kicker': 'التوزيع الدوائي والاستيراد والتصدير',
    'hero.titleFirst': 'حلول صيدلانية',
    'hero.titleSecond': 'موثوقة لرعاية صحية',
    'hero.titleEmphasis': 'أفضل',
    'hero.description':
      'تقدّم أوكتوجينيكس فارما خدمات توزيع واستيراد وتصدير المنتجات الصيدلانية، مع التركيز على الجودة والموثوقية والشراكات طويلة الأمد.',
    'hero.cta': 'عن الشركة',
    'hero.tagMarketing': 'التسويق',
    'hero.contactCta': 'تواصل معنا',
    'hero.noteOne': 'الجودة أولًا',
    'hero.noteTwo': 'GSDP',
    'hero.scroll': 'اكتشفوا الشركة',
    'hero.imageAlt': 'أم تحتضن طفلها في أجواء مشرقة',
    'about.kicker': 'عن أوكتوجينيكس فارما',
    'about.title': 'حلول صيدلانية من أجل مستقبل صحي أفضل.',
    'about.description':
      'تأسست شركة أوكتوجينيكس فارما عام 2020، وهي شركة متخصصة في استيراد وتصدير وتوزيع المنتجات الصيدلانية، تحت قيادة مؤسسها ومالكها الدكتور طارق المتولي قنديل.',
    'about.story':
      'بدأت رحلتنا برؤية طموحة لتقديم حلول صيدلانية متطورة وخدمات الاستيراد والتصدير لقطاع الرعاية الصحية.',
    'about.link': 'اكتشفوا خدماتنا',
    'bridge.title': 'نربط الخبرات العالمية باحتياجات الرعاية الصحية في مصر',
    'bridge.textOne':
      'في أوكتوجينيكس، نبني على خبرتنا في السوق المصري لتطوير شراكات مع شركات دولية، وإتاحة منتجات مختارة في الأدوية والمكملات الغذائية والتغذية المتخصصة.',
    'bridge.textTwo':
      'نجمع بين المعرفة المحلية والطموح الدولي، ونعمل على تطوير قدرات التسجيل والاستيراد والتوزيع، لنصنع قيمة مستدامة لشركائنا وللقطاع الصحي.',
    'bridge.imageAlt': 'يدان تحملان جهازًا لوحيًا يعرض تطبيقًا صحيًا',
    'market.title': 'قنوات تواجدنا في السوق',
    'market.description':
      'نطوّر شبكة علاقات تجارية تربط منتجات محفظتنا بقنوات الرعاية الصحية في مصر، بما يلائم احتياجات كل قطاع ويدعم نمو شركائنا.',
    'market.pharmacies': 'الصيدليات',
    'market.distributors': 'شركات التوزيع وتجار الجملة',
    'market.hospitals': 'المستشفيات',
    'market.clinics': 'العيادات والمراكز الطبية',
    'values.teamImageAlt': 'زملاء يضعون أيديهم معًا في دائرة',
    'quality.sectionTitle': 'جودة معتمدة',
    'focus.title': 'مجالات تركيزنا',
    'focus.medicine.title': 'الأدوية',
    'focus.medicine.text': 'تجارة وتوزيع المستحضرات الدوائية.',
    'focus.supplement.title': 'المكملات الغذائية',
    'focus.supplement.text': 'تطوير محفظة مختارة تدعم الاحتياجات الغذائية.',
    'focus.infant.title': 'تغذية الرضع والأطفال',
    'focus.infant.text': 'العمل على إتاحة علامات متخصصة للسوق المصري.',
    'focus.partnership.title': 'الشراكات الدولية',
    'focus.partnership.text': 'تطوير فرص الاستيراد والتمثيل التجاري.',
    'journey.kicker': 'رحلتنا',
    'journey.title': 'رحلتنا نحو آفاق أوسع',
    'journey.description': 'خبرة نبني عليها، وشراكات نتطلع من خلالها إلى مستقبل أفضل للرعاية الصحية.',
    'journey.2020.title': 'البداية',
    'journey.2020.text':
      'تأسيس أوكتوجينيكس فارما تحت قيادة الدكتور طارق قنديل، متخصصةً في استيراد وتصدير وتوزيع المنتجات الصيدلانية.',
    'journey.2021.title': 'ترسيخ الأساس',
    'journey.2021.text':
      'بناء قاعدة أعمال في تجارة وتوزيع الأدوية، ترتكز على الثقة وفهم احتياجات السوق المصري.',
    'journey.2022.title': 'تنمية شبكة الشركاء',
    'journey.2022.text':
      'تطوير العلاقات مع الصيدليات وشركاء التوزيع، وتعزيز التواصل مع مختلف قنوات القطاع الدوائي.',
    'journey.2023.title': 'تعزيز الكفاءة التشغيلية',
    'journey.2023.text': 'تطوير منظومة التوريد والتوزيع لدعم استمرارية الأعمال والاستعداد للتوسع.',
    'journey.2024.title': 'توسيع الرؤية',
    'journey.2024.text':
      'التوجه نحو فرص جديدة في المكملات الغذائية والتغذية المتخصصة، استكمالًا لنشاطنا في القطاع الدوائي.',
    'journey.2025.title': 'بناء جسور دولية',
    'journey.2025.text':
      'فتح قنوات التعاون مع شركات عالمية، ودراسة شراكات تجمع بين جودة المنتجات واحتياجات السوق المحلي.',
    'journey.2026.title': 'تطوير محفظتنا الدولية',
    'journey.2026.text':
      'العمل على تسجيل منتجات مختارة، وتطوير شراكات الاستيراد، وبناء مقومات إطلاق علامات دولية في مصر.',
    'journey.2027.title': 'أفقنا القادم',
    'journey.2027.text':
      'نتطلع إلى إطلاق محفظتنا من العلامات الدولية وتوسيع حضورنا، لنكون شريكًا موثوقًا في إتاحة منتجات الرعاية الصحية والتغذية.',
    'services.kicker': 'خدماتنا',
    'services.title': 'خدمات صيدلانية ترتكز على العناية والجودة.',
    'services.customers': 'العملاء',
    'services.suppliers': 'الموردون',
    'services.customerContractingTitle': 'التعاقد والتوثيق',
    'services.customerContractingDescription':
      'إجراءات التعاقد رسميًا وتوثيق البيانات بين الشركة والعملاء، مثل الصيدليات والمؤسسات الطبية.',
    'services.customerOrderReceptionTitle': 'استلام الطلبات',
    'services.customerOrderReceptionDescription':
      'استقبال طلبات الأدوية والمستلزمات الطبية من العملاء عبر المنصات الرقمية أو وسائل التواصل المختلفة.',
    'services.customerOrderSupplyTitle': 'تجهيز الطلبات والتسليم',
    'services.customerOrderSupplyDescription':
      'عمليات اللوجستيات والتوزيع لنقل الأدوية والمنتجات إلى الصيدليات والمنافذ بمختلف المحافظات.',
    'services.customerPaymentTitle': 'خدمات الدفع',
    'services.customerPaymentDescription':
      'توفير حلول وطرق دفع متنوعة وإلكترونية لتسهيل المعاملات المالية للعملاء.',
    'services.customerSupportTitle': 'خدمة العملاء',
    'services.customerSupportDescription':
      'الدعم الفني والمتابعة المستمرة للاستفسارات، حل المشكلات، وتلبية احتياجات العملاء.',
    'services.supplierDistributionTitle': 'التوزيع',
    'services.supplierDistributionDescription':
      'خدمات تخزين وتوزيع المنتجات الدوائية والطبية بكفاءة وتغطية واسعة.',
    'services.supplierRegulatoryTitle': 'الشؤون التنظيمية',
    'services.supplierRegulatoryDescription':
      'المساعدة في الإجراءات التنظيمية، التسجيل، وتسهيل المعاملات القانونية والرسمية الخاصة بالدواء.',
    'services.supplierAgencyTitle': 'خدمات الوكالة',
    'services.supplierAgencyDescription':
      'تقديم خدمات التمثيل التجاري والوكالة للمصنعين والموردين.',
    'services.supplierMarketingTitle': 'خدمات التسويق',
    'services.supplierMarketingDescription':
      'وضع الاستراتيجيات التسويقية والترويجية للمنتجات الدوائية لزيادة مبيعاتها وصولاً للعملاء.',
    'services.supplierImportTitle': 'الاستيراد',
    'services.supplierImportDescription':
      'إدارة عمليات التخليص واستيراد الأدوية والمستلزمات من الخارج.',
    'services.supplierExportTitle': 'التصدير',
    'services.supplierExportDescription':
      'فتح منافذ وتسهيل إجراءات تصدير المنتجات إلى الأسواق الخارجية.',
    'services.supplierScientificTitle': 'المكتب العلمي',
    'services.supplierScientificDescription':
      'تقديم الدعم العلمي، الاستشارات، والتواصل مع القطاع الطبي والأطباء للتعريف بالمنتجات.',
    'services.customerContractingImageAlt': 'متخصصون يتعاونون في غرفة اجتماعات مشرقة',
    'services.customerOrderReceptionImageAlt': 'متخصص مختبر يجري فحوصات الجودة',
    'services.customerOrderSupplyImageAlt': 'بضائع معبأة في مستودع توزيع منظم',
    'services.customerPaymentImageAlt': 'بضائع مرصوصة على منصات في مستودع توزيع',
    'services.customerSupportImageAlt': 'باحثون صحيون يعملون باستخدام مجهر',
    'services.supplierDistributionImageAlt': 'ممر منظم في مستودع مرتفع الرفوف',
    'services.supplierRegulatoryImageAlt': 'متخصص يعمل في بيئة إنتاج نظيفة',
    'services.supplierAgencyImageAlt': 'متخصص يعمل في منشأة إنتاج صناعية',
    'services.supplierMarketingImageAlt': 'مسحوق تغذية أطفال ومنتجات إطعام في استوديو نظيف',
    'services.supplierImportImageAlt': 'متخصص مختبر يجهز عينات لفحوصات الجودة',
    'services.supplierExportImageAlt': 'متخصص مختبر يختار عينة للفحص',
    'services.supplierScientificImageAlt': 'باحثون يتعاونون في مختبر صيدلاني',
    'values.kicker': 'ما الذي يوجهنا',
    'values.title': 'الجودة والهدف والثقة في قطاع الرعاية الصحية.',
    'values.description':
      'توجّه رسالتنا ورؤيتنا وقيمنا نهجنا في الحلول الصيدلانية ودورنا في قطاع الرعاية الصحية.',
    'values.missionTitle': 'رسالتنا',
    'values.missionDescription':
      'إتاحة منتجات رعاية صحية عالية الجودة على نطاق أوسع في مصر، من خلال ربط الشركات المصنّعة الدولية بالصيدليات والمستشفيات ومقدّمي الرعاية الصحية عبر خدمات استيراد وتوزيع موثوقة.',
    'values.visionTitle': 'رؤيتنا',
    'values.visionDescription':
      'أن نصبح شركة رائدة في توزيع منتجات الرعاية الصحية في مصر، وشريكًا موثوقًا للعلامات الدولية التي تتوسع في الأسواق الإقليمية.',
    'values.missionImageAlt': 'متخصص مختبر يجهز عينات لفحوصات الجودة',
    'ourValues.title': 'قيمنا',
    'ourValues.intro': 'قيمنا توجّه قراراتنا، وتشكّل علاقاتنا، وتحدد طريقة عملنا كل يوم.',
    'ourValues.teamSpirit': 'روح الفريق',
    'ourValues.teamSpiritText': 'نعمل معًا لتحقيق أهداف مشتركة.',
    'ourValues.responsibility': 'المسؤولية',
    'ourValues.responsibilityText': 'نتحمّل مسؤولية أفعالنا والتزاماتنا.',
    'ourValues.respect': 'الاحترام',
    'ourValues.respectText': 'نقدّر الناس ونتعامل مع الجميع بإنصاف.',
    'ourValues.innovation': 'الابتكار',
    'ourValues.innovationText': 'نرحّب بالأفكار الجديدة وبطرق عمل أفضل.',
    'ourValues.professionalism': 'الاحترافية',
    'ourValues.professionalismText': 'نؤدي عملنا بعناية ومعرفة وتفانٍ.',
    'ourValues.efficiency': 'الكفاءة',
    'ourValues.efficiencyText': 'نستخدم الوقت والموارد بحكمة.',
    'ourValues.personalGrowth': 'النمو الشخصي',
    'ourValues.personalGrowthText': 'ندعم التعلّم والتطوير المستمرين.',
    'ourValues.trust': 'الثقة',
    'ourValues.trustText': 'نبني علاقات دائمة قائمة على الصدق والشفافية.',
    'approach.title': 'نهجنا',
    'approach.market': 'فهم السوق',
    'approach.marketText': 'تحديد احتياجات الرعاية الصحية وتقييم الإمكانات السوقية لكل منتج.',
    'approach.portfolio': 'اختيار المحفظة',
    'approach.portfolioText': 'اختيار علامات ومنتجات متكاملة، لكلٍّ منها دور واضح في محفظتنا.',
    'approach.regulatory': 'التنسيق التنظيمي',
    'approach.regulatoryText': 'تنسيق متطلبات المستندات والتسجيل لدعم دخول المنتجات إلى السوق.',
    'approach.distribution': 'تخطيط التوزيع',
    'approach.distributionText': 'تخطيط التوريد والتوزيع وفق متطلبات كل منتج واحتياجات العملاء.',
    'approach.commercial': 'التطوير التجاري',
    'approach.commercialText': 'دعم الحضور في السوق من خلال مبيعات وتسويق مركّزين ومراجعة مستمرة للأداء.',
    'quality.kicker': 'التزامنا بالجودة',
    'quality.title': 'معيار واضح لممارسات التخزين والتوزيع.',
    'quality.standard': 'ممارسات التخزين والتوزيع الجيد (GSDP)',
    'leadership.kicker': 'القيادة',
    'leadership.title': 'فريق القيادة',
    'leadership.description': 'الأشخاص الذين يقودون أوكتوجينيكس فارما.',
    'leadership.tarek': 'د. طارق قنديل',
    'leadership.founder': 'المؤسس',
    'leadership.metwally': 'أ. متولي قنديل',
    'leadership.managingDirector': 'نائب الرئيس والعضو المنتدب',
    'leadership.soha': 'د. سها الخولي',
    'leadership.coo': 'رئيس قطاع العمليات',
    'brands.kicker': 'علاماتنا التجارية',
    'brands.title': 'مجموعة علامات تجارية مختارة بعناية.',
    'brands.summary': 'تعرّفوا على إحدى العلامات المؤكدة ضمن محفظة أوكتوجينيكس فارما.',
    'brands.label': 'علامة تجارية مؤكدة ضمن محفظتنا',
    'brands.jovie': 'Jovie',
    'brands.description':
      'تم تحديد Jovie ضمن العلامات التي تمثلها الشركة. لم يُقدَّم وصف معتمد للعلامة.',
    'brands.imageAlt': 'مسحوق تغذية أطفال وزجاجة وملعقة قياس',
    'page.about.imageAlt': 'متخصص فني يعمل في منشأة إنتاج مشرقة',
    'page.services.imageAlt': 'ممر منظم في مستودع توزيع مرتفع الرفوف',
    'page.brands.imageAlt': 'باحثون صحيون يتعاونون في مختبر مشرق',
    'page.contact.imageAlt': 'باحثون صحيون يتعاونون في مختبر مشرق',
    'brands.cta': 'تواصلوا معنا بشأن العلامات',
    'brands.visitWebsite': 'زيارة موقع {brand} مصر',
    'contact.kicker': 'تواصلوا مع أوكتوجينيكس فارما',
    'contact.title': 'لنبدأ حوارًا.',
    'contact.description': 'هل لديك استفسار أو ترغب في مناقشة فرصة تعاون؟ تواصل مع فريقنا.',
    'contact.detailsTitle': 'بيانات التواصل',
    'contact.phoneLabel': 'أرقام التواصل',
    'contact.emailLabel': 'البريد الإلكتروني',
    'contact.addressLabel': 'العنوان',
    'contact.address': '128/4، مبنى 14، المجاورة 14، الحي الثالث، دمياط الجديدة، دمياط، مصر.',
    'contact.imageAlt': 'متخصصون يتعاونون في غرفة اجتماعات مشرقة',
    'contact.formTitle': 'أرسل رسالة',
    'contact.formDescription': 'هل لديك استفسار أو ترغب في مناقشة فرصة تعاون؟ تواصل مع فريقنا.',
    'contact.firstName': 'الاسم الأول',
    'contact.firstNamePlaceholder': 'أحمد',
    'contact.lastName': 'اسم العائلة',
    'contact.lastNamePlaceholder': 'محمد',
    'contact.emailPlaceholder': 'name@company.com',
    'contact.phonePlaceholder': '+20 1XX XXX XXXX',
    'contact.subject': 'الموضوع',
    'contact.subjectPlaceholder': 'اختر موضوعًا...',
    'contact.subjectGeneral': 'استفسار عام',
    'contact.subjectPartnership': 'شراكة تجارية',
    'contact.subjectDistribution': 'توزيع المنتجات الصيدلانية',
    'contact.subjectImportExport': 'الاستيراد والتصدير',
    'contact.subjectOther': 'أخرى',
    'contact.message': 'الرسالة',
    'contact.messagePlaceholder': 'اكتب رسالتك هنا...',
    'contact.requiredError': 'هذا الحقل مطلوب.',
    'contact.emailError': 'أدخل عنوان بريد إلكتروني صحيحًا.',
    'contact.sending': 'جارٍ الإرسال…',
    'contact.success': 'شكرًا لك. تم إرسال رسالتك وسيتواصل معك فريقنا قريبًا.',
    'contact.errorValidation': 'تعذّر قبول بعض البيانات. يرجى مراجعة النموذج والمحاولة مرة أخرى.',
    'contact.errorRateLimited': 'تم إرسال عدد كبير من الرسائل من هذا الاتصال. يرجى المحاولة مرة أخرى بعد بضع دقائق.',
    'contact.errorGeneric':
      'تعذّر إرسال رسالتك الآن. يرجى المحاولة لاحقًا أو التواصل معنا عبر الهاتف أو البريد الإلكتروني.',
    'contact.submit': 'إرسال الرسالة',
    'footer.tagline': 'حلول صيدلانية موثوقة لرعاية صحية أفضل.',
    'footer.navigation': 'روابط التذييل',
    'footer.social': 'أوكتوجينكس على التواصل الاجتماعي',
    'footer.social.facebook': 'فيسبوك (يفتح في تبويب جديد)',
    'footer.social.instagram': 'إنستجرام (يفتح في تبويب جديد)',
    'footer.social.linkedin': 'لينكدإن (يفتح في تبويب جديد)',
    'footer.copyright': '© {year} أوكتوجينيكس فارما.',
    'page.about.kicker': 'من نحن',
    'page.about.title': 'عن أوكتوجينيكس فارما',
    'page.about.description':
      'شركة صيدلانية تأسست عام 2020، متخصصة في الاستيراد والتصدير والتوزيع.',
    'page.services.kicker': 'ما نقدمه',
    'page.services.title': 'التوزيع الدوائي والاستيراد والتصدير والمكملات الغذائية.',
    'page.services.description': 'اكتشفوا أنشطة أوكتوجينيكس فارما الصيدلانية المعلنة.',
    'page.brands.kicker': 'علاماتنا التجارية',
    'page.brands.title': 'مجموعة علامات تجارية مختارة بعناية.',
    'page.brands.description':
      'تعرّفوا على Jovie، إحدى العلامات التجارية ضمن محفظة أوكتوجينيكس فارما.',
    'page.contact.kicker': 'تواصلوا معنا',
    'page.contact.title': 'تواصلوا مع أوكتوجينيكس فارما',
    'page.contact.description':
      'تعرّفوا على بيانات التواصل وأرسلوا رسالة إلى فريق أوكتوجينيكس فارما.',
    'companyImpact.purpose': 'هدفنا',
    'companyImpact.headlineLine1': 'تسهيل الوصول',
    'companyImpact.headlineLine2': 'إلى رعاية صحية أفضل',
    'companyImpact.description':
      'نربط الشركات المصنّعة العالمية الموثوقة بالسوق المصري من خلال الاستيراد الموثوق والتوزيع المتوافق مع المعايير والدعم المحلي الفعّال.',
    'companyImpact.aboutCta': 'عن أوكتوجينيكس',

    // Feature Cards

    // Company Impact Statistics
    'companyImpact.impact': 'أثرنا',
    'companyImpact.impactLine1': 'خبرة عالمية.',
    'companyImpact.impactLine2': 'التزام محلي.',

    // Trusted Partners
    'companyImpact.partnersLine1': 'شركاء',
    'companyImpact.partnersLine2': 'موثوقون',
    'companyImpact.partnersLine3': 'حول العالم',

    // Pharmaceutical Products
    'companyImpact.productsLine1': 'مجموعة واسعة',
    'companyImpact.productsLine2': 'من المنتجات',
    'companyImpact.productsLine3': 'الدوائية',

    // Distribution Across Egypt
    'companyImpact.distributionLine1': 'توزيع',
    'companyImpact.distributionLine2': 'على مستوى',
    'companyImpact.distributionLine3': 'جميع أنحاء مصر',

    // Healthcare Professionals
    'companyImpact.healthcareLine1': 'دعم',
    'companyImpact.healthcareLine2': 'المتخصصين',
    'companyImpact.healthcareLine3': 'في الرعاية الصحية',
  },
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  readonly currentLanguage = signal<Language>('en');
  /** Texts edited in the dashboard; they override the bundled dictionary key by key. */
  private readonly remoteTranslations = signal<Record<string, Partial<Record<Language, string | null>>>>({});
  /** Bundled texts of lazily loaded sections (the Jovie store), registered when they load. */
  private readonly sectionTranslations = signal<Record<Language, Record<string, string>>>({ en: {}, ar: {} });
  private currentTitleKey = 'title.home';
  private fallbackTitle = 'Home | Octogenix Pharma';

  translate(key: string, params?: Record<string, string | number>): string {
    let value = this.lookup(key) ?? key;
    for (const [name, replacement] of Object.entries(params ?? {})) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  }

  toggleLanguage(): void {
    this.setLanguage(this.currentLanguage() === 'en' ? 'ar' : 'en');
  }

  setLanguage(language: Language): void {
    this.currentLanguage.set(language);
    this.document.documentElement.lang = language;
    this.document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    this.updateDocumentTitle();
  }

  setRouteTitle(key: string, fallbackTitle: string): void {
    this.currentTitleKey = key;
    this.fallbackTitle = fallbackTitle;
    this.updateDocumentTitle();
  }

  /** Adds the bundled dictionary of a lazily loaded section; corporate keys keep precedence. */
  addTranslations(texts: Record<Language, Record<string, string>>): void {
    this.sectionTranslations.update((current) => ({
      en: { ...current.en, ...texts.en },
      ar: { ...current.ar, ...texts.ar },
    }));
    this.updateDocumentTitle();
  }

  /**
   * Applies texts loaded from the API. Keys without a non-empty value for a language keep
   * using the bundled translation, so the bundled dictionary always remains the fallback.
   */
  setRemoteTranslations(texts: Record<string, Partial<Record<Language, string | null>>>): void {
    this.remoteTranslations.set(texts);
    this.updateDocumentTitle();
  }

  private lookup(key: string): string | undefined {
    const language = this.currentLanguage();
    return (
      this.remoteTranslations()[key]?.[language] ||
      translations[language][key] ||
      this.sectionTranslations()[language][key]
    );
  }

  private updateDocumentTitle(): void {
    this.document.title = this.lookup(this.currentTitleKey) ?? this.fallbackTitle;
  }
}
