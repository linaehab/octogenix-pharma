import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  protected readonly selectedCategory = signal<ServiceCategory>('customers');

  protected readonly serviceGroups: Record<
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
          imageAlt: 'services.distributionImageAlt',
          image: '/assets/images/service-warehouse-forklift.jpg',
          hoverImage: '/assets/images/service-import-warehouse.jpg',
        },
        {
          number: '02',
          title: 'services.customerOrderReceptionTitle',
          description: 'services.customerOrderReceptionDescription',
          imageAlt: 'services.importImageAlt',
          image: '/assets/images/service-import-warehouse.jpg',
          hoverImage: '/assets/images/value-distribution.jpg',
        },
        {
          number: '03',
          title: 'services.customerOrderSupplyTitle',
          description: 'services.customerOrderSupplyDescription',
          imageAlt: 'services.distributionImageAlt',
          image: '/assets/images/value-distribution.jpg',
          hoverImage: '/assets/images/service-warehouse-forklift.jpg',
        },
        {
          number: '04',
          title: 'services.customerPaymentTitle',
          description: 'services.customerPaymentDescription',
          imageAlt: 'services.supplementsImageAlt',
          image: '/assets/images/service-nutrition-preparation.jpg',
          hoverImage: '/assets/images/mission-baby-feeding.jpg',
        },
        {
          number: '05',
          title: 'services.customerSupportTitle',
          description: 'services.customerSupportDescription',
          imageAlt: 'services.importImageAlt',
          image: '/assets/images/mission-baby-feeding.jpg',
          hoverImage: '/assets/images/service-import-warehouse.jpg',
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
          imageAlt: 'services.distributionImageAlt',
          image: '/assets/images/service-warehouse-forklift.jpg',
          hoverImage: '/assets/images/service-import-warehouse.jpg',
        },
        {
          number: '02',
          title: 'services.supplierRegulatoryTitle',
          description: 'services.supplierRegulatoryDescription',
          imageAlt: 'services.importImageAlt',
          image: '/assets/images/service-import-warehouse.jpg',
          hoverImage: '/assets/images/value-distribution.jpg',
        },
        {
          number: '03',
          title: 'services.supplierAgencyTitle',
          description: 'services.supplierAgencyDescription',
          imageAlt: 'services.distributionImageAlt',
          image: '/assets/images/value-distribution.jpg',
          hoverImage: '/assets/images/service-warehouse-forklift.jpg',
        },
        {
          number: '04',
          title: 'services.supplierMarketingTitle',
          description: 'services.supplierMarketingDescription',
          imageAlt: 'services.supplementsImageAlt',
          image: '/assets/images/service-nutrition-preparation.jpg',
          hoverImage: '/assets/images/mission-baby-feeding.jpg',
        },
        {
          number: '05',
          title: 'services.supplierImportTitle',
          description: 'services.supplierImportDescription',
          imageAlt: 'services.importImageAlt',
          image: '/assets/images/mission-baby-feeding.jpg',
          hoverImage: '/assets/images/service-import-warehouse.jpg',
        },
        {
          number: '06',
          title: 'services.supplierExportTitle',
          description: 'services.supplierExportDescription',
          imageAlt: 'services.distributionImageAlt',
          image: '/assets/images/service-import-warehouse.jpg',
          hoverImage: '/assets/images/service-warehouse-forklift.jpg',
        },
        {
          number: '07',
          title: 'services.supplierScientificTitle',
          description: 'services.supplierScientificDescription',
          imageAlt: 'services.importImageAlt',
          image: '/assets/images/mission-baby-feeding.jpg',
          hoverImage: '/assets/images/value-distribution.jpg',
        },
      ],
    },
  };

  protected readonly currentServices = computed(() => this.serviceGroups[this.selectedCategory()].items);

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
