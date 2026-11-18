import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CxIcon, serviceIcon } from '../cx-icon/cx-icon';

type ServiceCategory = 'customers' | 'suppliers';

@Component({
  selector: 'app-services-section',
  imports: [TranslatePipe, CxIcon],
  templateUrl: './services-section.html',
  styleUrl: './services-section.css',
})
export class ServicesSection {
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);
  protected readonly selectedCategory = signal<ServiceCategory>('customers');
  /**
   * 'showcase' (home page) or 'editorial' (services page): the same service cards; the
   * services page sets them four to a row on a white background.
   */
  readonly layout = input<'showcase' | 'editorial'>('showcase');
  /** Bundled services (translation keys), shown until (or unless) the API services are loaded. */
  private readonly bundledGroups: Record<
    ServiceCategory,
    { title: string; description?: string; items: { number: string; title: string; description: string }[] }
  > = {
    customers: {
      title: 'services.customers',
      items: [
        {
          number: '01',
          title: 'services.customerContractingTitle',
          description: 'services.customerContractingDescription',
        },
        {
          number: '02',
          title: 'services.customerOrderReceptionTitle',
          description: 'services.customerOrderReceptionDescription',
        },
        {
          number: '03',
          title: 'services.customerOrderSupplyTitle',
          description: 'services.customerOrderSupplyDescription',
        },
        {
          number: '04',
          title: 'services.customerPaymentTitle',
          description: 'services.customerPaymentDescription',
        },
        {
          number: '05',
          title: 'services.customerSupportTitle',
          description: 'services.customerSupportDescription',
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
        },
        {
          number: '02',
          title: 'services.supplierRegulatoryTitle',
          description: 'services.supplierRegulatoryDescription',
        },
        {
          number: '03',
          title: 'services.supplierAgencyTitle',
          description: 'services.supplierAgencyDescription',
        },
        {
          number: '04',
          title: 'services.supplierMarketingTitle',
          description: 'services.supplierMarketingDescription',
        },
        {
          number: '05',
          title: 'services.supplierImportTitle',
          description: 'services.supplierImportDescription',
        },
        {
          number: '06',
          title: 'services.supplierExportTitle',
          description: 'services.supplierExportDescription',
        },
        {
          number: '07',
          title: 'services.supplierScientificTitle',
          description: 'services.supplierScientificDescription',
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
        icon: serviceIcon(service.title?.en ?? ''),
      }));
    }

    return this.bundledGroups[category].items.map((item) => ({
      ...item,
      title: this.language.translate(item.title),
      description: this.language.translate(item.description),
      icon: serviceIcon(item.title),
    }));
  });

  constructor() {
    if (!this.route) {
      return;
    }

    const routeCategory = this.route.snapshot.queryParamMap.get('category');
    this.selectedCategory.set(routeCategory === 'suppliers' ? 'suppliers' : 'customers');

    // Ends with the component (on the home page the route outlives it)
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const nextCategory = params.get('category');
      this.selectedCategory.set(nextCategory === 'suppliers' ? 'suppliers' : 'customers');
    });
  }

  protected selectCategory(category: ServiceCategory): void {
    this.selectedCategory.set(category);
  }
}
