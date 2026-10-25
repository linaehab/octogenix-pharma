import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Language = 'en' | 'ar';

const translations: Record<Language, Record<string, string>> = {
  en: {
    'company.name': 'Octogenix Pharma',
    'header.announcement': 'Pharmaceutical distribution, supplements, import and export',
    'header.meetBrands': 'Discover Octogenix',
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
      'Octogenix Pharma specializes in pharmaceutical import, export, and distribution, with a commitment to quality and trusted healthcare partnerships.',
    'hero.cta': 'About Us',
    'hero.contactCta': 'Contact Us',
    'hero.noteOne': 'Quality-led',
    'hero.noteTwo': 'GSDP',
    'hero.scroll': 'Discover our company',
    'hero.imageAlt': 'A mother holding her baby in a bright studio',
    'about.kicker': 'About Octogenix Pharma',
    'about.aside': 'Founded in 2020.<br>Serving healthcare.',
    'about.title': 'Pharmaceutical solutions for a healthier future.',
    'about.description':
      'Octogenix Pharma was founded in 2020 as a company specializing in pharmaceutical import, export, and distribution, under the leadership of its founder and owner, Dr. Tarek Kandil.',
    'about.story':
      'Our story began with an ambitious vision to bring advanced pharmaceutical solutions and import and export services to the healthcare sector.',
    'about.link': 'Explore our services',
    'about.imageAlt': 'A baby resting on a soft blanket',
    'about.caption': 'Care for brighter beginnings',
    'services.kicker': 'Our services',
    'services.title': 'Pharmaceutical services with care and quality.',
    'services.summary':
      'Our stated business activities span pharmaceutical distribution, pharmaceutical import and export, and supplements.',
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
    'services.distributionTitle': 'Pharmaceutical Distribution',
    'services.distributionDescription':
      'Distribution of pharmaceutical products as part of our stated business activities.',
    'services.importTitle': 'Pharmaceutical Import & Export',
    'services.importDescription':
      'Import and export of pharmaceutical products for the healthcare sector.',
    'services.supplementsTitle': 'Supplements',
    'services.supplementsDescription':
      'Supplements and related activities within our stated business scope.',
    'services.distributionImageAlt':
      'Warehouse forklift and packaged goods in a distribution center',
    'services.importImageAlt': 'Palletized cartons in a large distribution warehouse',
    'services.supplementsImageAlt': 'Unbranded infant nutrition powder, bottle and measuring scoop',
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
      'To offer innovative, high-quality pharmaceutical solutions in important therapeutic areas, supporting patients’ quality of life and healthcare professionals’ confidence.',
    'values.visionTitle': 'Our Vision',
    'values.visionDescription':
      'To be a trusted partner in pharmaceutical import, export and distribution services in Egypt.',
    'values.missionImageAlt': 'A laboratory specialist preparing samples for quality checks',
    'values.visionImageAlt': 'Healthcare researchers collaborating at a microscope',
    'values.qualityImageAlt': 'Healthcare researchers using a microscope in a laboratory',
    'values.innovationImageAlt': 'Researchers collaborating over laboratory samples',
    'values.integrityImageAlt': 'Laboratory worker carefully using a pipette',
    'values.distributionImageAlt': 'Warehouse workers handling stocked goods',
    'values.growthImageAlt': 'A green seedling emerging from soil',
    'values.coreTitle': 'Core Values',
    'values.quality': 'Quality',
    'values.qualityDescription':
      'We commit to rigorous pharmaceutical standards through each stage of the supply chain, import and export.',
    'values.innovation': 'Innovation',
    'values.integrity': 'Integrity & Trust',
    'values.distributionExcellence': 'Distribution Excellence',
    'values.sustainable': 'Sustainable Growth',
    'values.companyTitle': 'Company Values',
    'values.commitment': 'Commitment',
    'values.commitmentDescription': 'Integrity, respect, fairness and compliance.',
    'values.companyExcellence': 'Excellence',
    'values.excellenceDescription': 'Through development and a drive to succeed and excel.',
    'values.harmony': 'Harmony',
    'values.harmonyDescription': 'Communication and connection.',
    'values.growth': 'Growth',
    'values.growthDescription': 'Through development, empowerment and continuous improvement.',
    'values.credibility': 'Credibility',
    'values.credibilityDescription': 'Earning trust.',
    'quality.kicker': 'Our quality commitment',
    'quality.title': 'A clear standard for storage and distribution practices.',
    'quality.standard': 'GSDP — Good Storage and Distribution Practices',
    'quality.description':
      'Presented as a company quality credential. No certificate image, number, issuing authority or validity details have been supplied.',
    'quality.imageAlt': 'A specialist conducting quality checks in a clean production environment',
    'leadership.kicker': 'Leadership',
    'leadership.title': 'Meet our leadership',
    'leadership.description': 'The people leading Octogenix Pharma.',
    'leadership.imageAlt': 'Healthcare professionals collaborating in a clinical setting',
    'leadership.imageCaption': 'A shared commitment to healthcare',
    'leadership.tarek': 'Dr. Tarek Kandil',
    'leadership.founder': 'Founder',
    'leadership.metwally': 'Mr. Metwally Kandil',
    'leadership.managingDirector': 'VP & Managing Director',
    'leadership.soha': 'Dr. Soha El-Kholy',
    'leadership.coo': 'COO',
    'leadership.portraitNote':
      'The image above is illustrative, not a portrait. Official leadership photos can be added when approved.',
    'brands.kicker': 'Our brands',
    'brands.title': 'A considered brand portfolio.',
    'brands.summary': 'Meet one confirmed brand from Octogenix Pharma’s portfolio.',
    'brands.label': 'A confirmed represented brand',
    'brands.jovie': 'Jovie',
    'brands.description':
      'Jovie has been identified as a brand represented by the company. An approved brand description has not been supplied.',
    'brands.assetNote': 'Displayed as text only; no official Jovie logo asset has been supplied.',
    'brands.imageAlt': 'Infant nutrition powder, bottle and measuring scoop',
    'page.about.imageAlt': 'A technical specialist working in a bright production facility',
    'page.services.imageAlt': 'An organized aisle in a high-bay distribution warehouse',
    'page.brands.imageAlt': 'Healthcare researchers collaborating in a bright laboratory',
    'page.contact.imageAlt': 'Healthcare researchers collaborating in a bright laboratory',
    'brands.cta': 'Contact us about our portfolio',
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
    'contact.integrationNote':
      'This form currently validates in your browser only. A contact service must be connected before messages can be sent.',
    'contact.integrationFeedback':
      'Your details passed the checks. This website is not yet connected to a message delivery service, so nothing has been sent.',
    'contact.submit': 'Send Message',
    'footer.tagline': 'Trusted pharmaceutical solutions for better healthcare.',
    'footer.navigation': 'Footer navigation',
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
      'Meet Jovie, a brand identified in the company’s portfolio. Its official logo has not been supplied.',
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
    'companyImpact.services': 'OUR SERVICES',
    'companyImpact.servicesAlt': 'Pharmaceutical laboratory and medical research',
    'companyImpact.brands': 'OUR BRANDS',
    'companyImpact.brandsAlt': 'Jovie and pharmaceutical product brands',
    'companyImpact.aboutUs': 'ABOUT US',
    'companyImpact.aboutUsAlt': 'Octogenix Pharma healthcare and pharmaceutical expertise',

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
    'header.announcement': 'التوزيع الدوائي والمكملات الغذائية والاستيراد والتصدير',
    'header.meetBrands': 'تعرّفوا على أوكتوجينيكس',
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
      'تتخصص أوكتوجينيكس فارما في استيراد وتصدير وتوزيع المنتجات الصيدلانية، مع الالتزام بالجودة وبناء شراكات موثوقة في قطاع الرعاية الصحية.',
    'hero.cta': 'عن الشركة',
    'hero.contactCta': 'تواصل معنا',
    'hero.noteOne': 'الجودة أولًا',
    'hero.noteTwo': 'GSDP',
    'hero.scroll': 'اكتشفوا الشركة',
    'hero.imageAlt': 'أم تحتضن طفلها في أجواء مشرقة',
    'about.kicker': 'عن أوكتوجينيكس فارما',
    'about.aside': 'تأسست عام 2020.<br>من أجل الرعاية الصحية.',
    'about.title': 'حلول صيدلانية من أجل مستقبل صحي أفضل.',
    'about.description':
      'تأسست شركة أوكتوجينيكس فارما عام 2020، وهي شركة متخصصة في استيراد وتصدير وتوزيع المنتجات الصيدلانية، تحت قيادة مؤسسها ومالكها الدكتور طارق قنديل.',
    'about.story':
      'بدأت رحلتنا برؤية طموحة لتقديم حلول صيدلانية متطورة وخدمات الاستيراد والتصدير لقطاع الرعاية الصحية.',
    'about.link': 'اكتشفوا خدماتنا',
    'about.imageAlt': 'طفل يستريح على غطاء ناعم',
    'about.caption': 'رعاية لبدايات أكثر إشراقًا',
    'services.kicker': 'خدماتنا',
    'services.title': 'خدمات صيدلانية ترتكز على العناية والجودة.',
    'services.summary':
      'تشمل أنشطة الشركة المعلنة توزيع المنتجات الصيدلانية واستيرادها وتصديرها والمكملات الغذائية.',
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
    'services.distributionTitle': 'توزيع المنتجات الصيدلانية',
    'services.distributionDescription': 'توزيع المنتجات الصيدلانية ضمن أنشطة الشركة المعلنة.',
    'services.importTitle': 'استيراد وتصدير المنتجات الصيدلانية',
    'services.importDescription': 'استيراد وتصدير المنتجات الصيدلانية لقطاع الرعاية الصحية.',
    'services.supplementsTitle': 'المكملات الغذائية',
    'services.supplementsDescription':
      'المكملات الغذائية والأنشطة المرتبطة بها ضمن نطاق أعمال الشركة المعلن.',
    'services.distributionImageAlt': 'رافعة شوكية وبضائع معبأة في مركز توزيع',
    'services.importImageAlt': 'صناديق على منصات داخل مستودع توزيع كبير',
    'services.supplementsImageAlt': 'مسحوق تغذية أطفال غير موسوم وزجاجة وملعقة قياس',
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
      'تقديم حلول صيدلانية مبتكرة وعالية الجودة في مجالات علاجية هامة، بما يدعم تحسين جودة حياة المرضى وتعزيز ثقة الممارسين الصحيين.',
    'values.visionTitle': 'رؤيتنا',
    'values.visionDescription':
      'أن نكون الشريك الموثوق به في خدمات استيراد وتصدير وتوزيع المنتجات الصيدلانية في مصر.',
    'values.missionImageAlt': 'متخصص مختبر يجهز عينات لفحوصات الجودة',
    'values.visionImageAlt': 'باحثون صحيون يتعاونون باستخدام مجهر',
    'values.qualityImageAlt': 'باحثون صحيون يستخدمون المجهر في مختبر',
    'values.innovationImageAlt': 'باحثون يتعاونون حول عينات مخبرية',
    'values.integrityImageAlt': 'عامل مختبر يستخدم ماصة بعناية',
    'values.distributionImageAlt': 'عاملون في مستودع يتعاملون مع بضائع مخزنة',
    'values.growthImageAlt': 'شتلة خضراء تنمو من التربة',
    'values.coreTitle': 'قيمنا الجوهرية',
    'values.quality': 'الجودة',
    'values.qualityDescription':
      'نلتزم بمعايير صيدلانية صارمة في كل مرحلة من مراحل سلسلة التوريد والاستيراد والتصدير.',
    'values.innovation': 'الابتكار',
    'values.integrity': 'النزاهة والثقة',
    'values.distributionExcellence': 'التميز في التوزيع',
    'values.sustainable': 'النمو المستدام',
    'values.companyTitle': 'قيم الشركة',
    'values.commitment': 'الالتزام',
    'values.commitmentDescription': 'النزاهة، الاحترام، العدالة، والامتثال.',
    'values.companyExcellence': 'التميز',
    'values.excellenceDescription': 'من خلال التطوير والرغبة في النجاح والتميز.',
    'values.harmony': 'التناغم',
    'values.harmonyDescription': 'الاتصال والترابط.',
    'values.growth': 'النمو',
    'values.growthDescription': 'من خلال التطوير والتمكين والتحسين المستمر.',
    'values.credibility': 'المصداقية',
    'values.credibilityDescription': 'كسب الثقة.',
    'quality.kicker': 'التزامنا بالجودة',
    'quality.title': 'معيار واضح لممارسات التخزين والتوزيع.',
    'quality.standard': 'ممارسات التخزين والتوزيع الجيد (GSDP)',
    'quality.description':
      'يُعرض باعتباره بيان جودة للشركة. لم تُقدَّم صورة شهادة أو رقمها أو جهة إصدارها أو تفاصيل صلاحيتها.',
    'quality.imageAlt': 'متخصص يجري فحوصات الجودة في بيئة إنتاج نظيفة',
    'leadership.kicker': 'القيادة',
    'leadership.title': 'تعرّفوا على فريق القيادة',
    'leadership.description': 'الأشخاص الذين يقودون أوكتوجينيكس فارما.',
    'leadership.imageAlt': 'ممارسون صحيون يتعاونون في بيئة سريرية',
    'leadership.imageCaption': 'التزام مشترك بالرعاية الصحية',
    'leadership.tarek': 'د. طارق قنديل',
    'leadership.founder': 'المؤسس',
    'leadership.metwally': 'أ. متولي قنديل',
    'leadership.managingDirector': 'نائب الرئيس والعضو المنتدب',
    'leadership.soha': 'د. سها الخولي',
    'leadership.coo': 'رئيس قطاع العمليات',
    'leadership.portraitNote':
      'الصورة أعلاه توضيحية وليست صورة شخصية. يمكن إضافة صور القيادة الرسمية عند توفيرها واعتمادها.',
    'brands.kicker': 'علاماتنا التجارية',
    'brands.title': 'مجموعة علامات تجارية مختارة بعناية.',
    'brands.summary': 'تعرّفوا على إحدى العلامات المؤكدة ضمن محفظة أوكتوجينيكس فارما.',
    'brands.label': 'علامة تجارية مؤكدة ضمن محفظتنا',
    'brands.jovie': 'Jovie',
    'brands.description':
      'تم تحديد Jovie ضمن العلامات التي تمثلها الشركة. لم يُقدَّم وصف معتمد للعلامة.',
    'brands.assetNote': 'يُعرض الاسم كنص فقط؛ لم يُقدَّم الشعار الرسمي لـ Jovie.',
    'brands.imageAlt': 'مسحوق تغذية أطفال وزجاجة وملعقة قياس',
    'page.about.imageAlt': 'متخصص فني يعمل في منشأة إنتاج مشرقة',
    'page.services.imageAlt': 'ممر منظم في مستودع توزيع مرتفع الرفوف',
    'page.brands.imageAlt': 'باحثون صحيون يتعاونون في مختبر مشرق',
    'page.contact.imageAlt': 'باحثون صحيون يتعاونون في مختبر مشرق',
    'brands.cta': 'تواصلوا معنا بشأن العلامات',
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
    'contact.integrationNote':
      'يتحقق هذا النموذج من البيانات داخل المتصفح فقط. يجب ربط خدمة تواصل قبل إمكانية إرسال الرسائل.',
    'contact.integrationFeedback':
      'اجتازت البيانات التحقق. هذا الموقع غير مرتبط حاليًا بخدمة لإرسال الرسائل، لذلك لم يتم إرسال أي شيء.',
    'contact.submit': 'إرسال الرسالة',
    'footer.tagline': 'حلول صيدلانية موثوقة لرعاية صحية أفضل.',
    'footer.navigation': 'روابط التذييل',
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
      'تعرّفوا على Jovie، إحدى العلامات المحددة ضمن محفظة الشركة. لم يُقدَّم شعارها الرسمي بعد.',
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
    'companyImpact.services': 'خدماتنا',
    'companyImpact.servicesAlt': 'معمل أبحاث دوائية وفحوصات علمية',
    'companyImpact.brands': 'علاماتنا التجارية',
    'companyImpact.brandsAlt': 'جوفي ومنتجات العلامات التجارية الدوائية',
    'companyImpact.aboutUs': 'من نحن',
    'companyImpact.aboutUsAlt': 'خبرات أوكتوجينيكس فارما في مجال الرعاية الصحية والأدوية',

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
  private currentTitleKey = 'title.home';
  private fallbackTitle = 'Home | Octogenix Pharma';

  translate(key: string, params?: Record<string, string | number>): string {
    let value = translations[this.currentLanguage()][key] ?? key;
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

  private updateDocumentTitle(): void {
    this.document.title =
      translations[this.currentLanguage()][this.currentTitleKey] ?? this.fallbackTitle;
  }
}
