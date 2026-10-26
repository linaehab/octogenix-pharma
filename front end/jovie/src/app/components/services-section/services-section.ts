import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

type ServiceCategory = 'customers' | 'suppliers';

@Component({
  selector: 'app-services-section',
  imports: [TranslatePipe],
  templateUrl: './services-section.html',
  styleUrl: './services-section.css',
})
export class ServicesSection {
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);
  protected readonly selectedCategory = signal<ServiceCategory>('customers');

  /** Bundled services (translation keys), shown until (or unless) the API services are loaded. */
  private readonly bundledGroups: Record<
    ServiceCategory,
    { title: string; description?: string; items: { number: string; title: string; description: string; image: string; hoverImage: string; imageAlt: string }[] }
  > = {
    customers: {
      title: 'services.customers',
      items: [
        {
          number: '01',
          title: 'services.customerContractingTitle',
          description: 'services.customerContractingDescription',
          imageAlt: 'services.customerContractingImageAlt',
          image: '/assets/images/hero-partnership.jpg',
          hoverImage: '/assets/images/hero-operations.jpg',
        },
        {
          number: '02',
          title: 'services.customerOrderReceptionTitle',
          description: 'services.customerOrderReceptionDescription',
          imageAlt: 'services.customerOrderReceptionImageAlt',
          image: '/assets/images/cut-out-medicament-drug-doctor-medical.jpg',
          hoverImage: '/assets/images/female-pharmacist-with-table-checking-stock-pharmacy.jpg',
        },
        {
          number: '03',
          title: 'services.customerOrderSupplyTitle',
          description: 'services.customerOrderSupplyDescription',
          imageAlt: 'services.customerOrderSupplyImageAlt',
          image: '/assets/images/medium-shot-delivery-man-with-mask.jpg',
          hoverImage: '/assets/images/hero-warehouse.jpg',
        },
        {
          number: '04',
          title: 'services.customerPaymentTitle',
          description: 'services.customerPaymentDescription',
          imageAlt: 'services.customerPaymentImageAlt',
          image: '/assets/images/beautiful-asian-woman-using-smartphone-buying-online-shopping.jpg',
          hoverImage: '/assets/images/pay-goods-by-credit-card-through-smartphone-coffee-shop.jpg',
        },
        {
          number: '05',
          title: 'services.customerSupportTitle',
          description: 'services.customerSupportDescription',
          imageAlt: 'services.customerSupportImageAlt',
          image: '/assets/images/smile.jpg',
          hoverImage: '/assets/images/happy.jpg',
        },
      ],
    },
    suppliers: {
      title: 'services.suppliers',
      items: [
        {
          number: '01',
          title: 'services.supplierDistributionTitle',
          description: 'services.supplierDistributionDescription',
          imageAlt: 'services.supplierDistributionImageAlt',
          image: '/assets/images/service-warehouse-forklift.jpg',
          hoverImage: '/assets/images/hero-warehouse.jpg',
        },
        {
          number: '02',
          title: 'services.supplierRegulatoryTitle',
          description: 'services.supplierRegulatoryDescription',
          imageAlt: 'services.supplierRegulatoryImageAlt',
          image: '/assets/images/doctor .jpg',
          hoverImage: '/assets/images/doctor 2.jpg',
        },
        {
          number: '03',
          title: 'services.supplierAgencyTitle',
          description: 'services.supplierAgencyDescription',
          imageAlt: 'services.supplierAgencyImageAlt',
          image: '/assets/images/hero-operations.jpg',
          hoverImage: '/assets/images/hero-partnership.jpg',
        },
        {
          number: '04',
          title: 'services.supplierMarketingTitle',
          description: 'services.supplierMarketingDescription',
          imageAlt: 'services.supplierMarketingImageAlt',
          image: '/assets/images/discussing-evidence.jpg',
          hoverImage: '/assets/images/doctor 3.jpg',
        },
        {
          number: '05',
          title: 'services.supplierImportTitle',
          description: 'services.supplierImportDescription',
          imageAlt: 'services.supplierImportImageAlt',
          image: '/assets/images/buiss.jpg',
          hoverImage: '/assets/images/warehouse-workers-checking-inventory-goods-distribution-large-storehouse.jpg',
        },
        {
          number: '06',
          title: 'services.supplierExportTitle',
          description: 'services.supplierExportDescription',
          imageAlt: 'services.supplierExportImageAlt',
          image: '/assets/images/workers-with-hardhats-reflective-jackets-walking-through-big-warehouse-aisle-checking-goods-condition.jpg',
          hoverImage: '/assets/images/value-distribution.jpg',
        },
        {
          number: '07',
          title: 'services.supplierScientificTitle',
          description: 'services.supplierScientificDescription',
          imageAlt: 'services.supplierScientificImageAlt',
          image: '/assets/images/pharmacists-analyzing-tablet-pharmacy.jpg',
          hoverImage: '/assets/images/value-sustainable-growth.jpg',
        },
      ],
    },
  };

  protected readonly currentServices = computed(() => {
    const category = this.selectedCategory();
    const remote = this.content.services()?.[category];

    if (remote) {
      return remote.map((service, index) => ({
        number: String(index + 1).padStart(2, '0'),
        title: this.content.pick(service.title),
        description: this.content.pick(service.description),
        image: service.image_url ?? '',
        hoverImage: service.hover_image_url ?? service.image_url ?? '',
        imageAlt: this.content.pick(service.image_alt),
      }));
    }

    return this.bundledGroups[category].items.map((item) => ({
      ...item,
      title: this.language.translate(item.title),
      description: this.language.translate(item.description),
      imageAlt: this.language.translate(item.imageAlt),
    }));
  });

  constructor() {
    if (!this.route) {
      return;
    }

    const routeCategory = this.route.snapshot.queryParamMap.get('category');
    this.selectedCategory.set(routeCategory === 'suppliers' ? 'suppliers' : 'customers');

    this.route.queryParamMap.subscribe((params) => {
      const nextCategory = params.get('category');
      this.selectedCategory.set(nextCategory === 'suppliers' ? 'suppliers' : 'customers');
    });
  }

  protected selectCategory(category: ServiceCategory): void {
    this.selectedCategory.set(category);
  }
}
