import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, inject, input, signal, viewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

type ServiceCategory = 'customers' | 'suppliers';

const V2 = '/assets/images/corporate-v2';

/**
 * New photographs for four services (Contracting and Documentation, Distribution, Agency
 * Services, and the Scientific Office hover image). A service is matched by the image pair it
 * still has from the previous site, so the swap only applies while the dashboard images are
 * unchanged: an image edited in the dashboard is always shown as it is.
 */
const SERVICE_IMAGE_UPGRADES: { image: string; hover: string; to: { image: string; hover: string } }[] = [
  {
    image: '/assets/images/hero-partnership.jpg',
    hover: '/assets/images/hero-operations.jpg',
    to: { image: `${V2}/service-contracting.webp`, hover: `${V2}/service-contracting-review.webp` },
  },
  {
    image: '/assets/images/service-warehouse-forklift.jpg',
    hover: '/assets/images/hero-warehouse.jpg',
    to: { image: `${V2}/service-distribution.webp`, hover: `${V2}/service-distribution-warehouse.webp` },
  },
  {
    image: '/assets/images/hero-operations.jpg',
    hover: '/assets/images/hero-partnership.jpg',
    to: { image: `${V2}/service-agency.webp`, hover: `${V2}/service-agency-collaboration.webp` },
  },
  {
    image: '/assets/images/pharmacists-analyzing-tablet-pharmacy.jpg',
    hover: '/assets/images/value-sustainable-growth.jpg',
    to: { image: '/assets/images/pharmacists-analyzing-tablet-pharmacy.jpg', hover: `${V2}/service-scientific-office.webp` },
  },
];

/**
 * Web-sized copies (WebP, 1400 px wide) of the original service photographs, which are camera
 * originals of up to 42 MB / 45 megapixels. Same photographs, only lighter to load and decode.
 */
const OPTIMIZED_SERVICE_IMAGES: Record<string, string> = {
  '/assets/images/cut-out-medicament-drug-doctor-medical.jpg': 'order-reception',
  '/assets/images/female-pharmacist-with-table-checking-stock-pharmacy.jpg': 'order-reception-stock',
  '/assets/images/medium-shot-delivery-man-with-mask.jpg': 'order-delivery',
  '/assets/images/hero-warehouse.jpg': 'order-delivery-warehouse',
  '/assets/images/beautiful-asian-woman-using-smartphone-buying-online-shopping.jpg': 'payment',
  '/assets/images/pay-goods-by-credit-card-through-smartphone-coffee-shop.jpg': 'payment-card',
  '/assets/images/smile.jpg': 'customer-service',
  '/assets/images/happy.jpg': 'customer-service-team',
  '/assets/images/doctor .jpg': 'regulatory',
  '/assets/images/doctor 2.jpg': 'regulatory-review',
  '/assets/images/discussing-evidence.jpg': 'marketing',
  '/assets/images/doctor 3.jpg': 'marketing-doctor',
  '/assets/images/buiss.jpg': 'import',
  '/assets/images/warehouse-workers-checking-inventory-goods-distribution-large-storehouse.jpg': 'import-inventory',
  '/assets/images/workers-with-hardhats-reflective-jackets-walking-through-big-warehouse-aisle-checking-goods-condition.jpg': 'export',
  '/assets/images/pharmacists-analyzing-tablet-pharmacy.jpg': 'scientific-office',
};

function optimized(url: string): string {
  const name = OPTIMIZED_SERVICE_IMAGES[url];
  return name ? `${V2}/services/${name}.webp` : url;
}

function upgradeImages(image: string, hoverImage: string): { image: string; hoverImage: string } {
  const upgrade = SERVICE_IMAGE_UPGRADES.find((entry) => entry.image === image && entry.hover === hoverImage);
  const pair = upgrade ? { image: upgrade.to.image, hoverImage: upgrade.to.hover } : { image, hoverImage };
  return { image: optimized(pair.image), hoverImage: optimized(pair.hoverImage) };
}

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
  /**
   * 'showcase' (home page): a featured image panel beside the list of services.
   * 'editorial' (services page): every service as an image-and-text block.
   */
  readonly layout = input<'showcase' | 'editorial'>('showcase');
  /** The service shown in the showcase's featured panel. */
  protected readonly activeIndex = signal(0);
  /** Services page blocks, revealed once as they come into view. */
  private readonly blocks = viewChildren<ElementRef<HTMLElement>>('serviceBlock');
  private revealObserver: IntersectionObserver | null = null;
  protected readonly activeService = computed(() => {
    const services = this.currentServices();
    return services[Math.min(this.activeIndex(), services.length - 1)] ?? null;
  });

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
          hoverImage: `${V2}/service-scientific-office.webp`,
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
        ...upgradeImages(service.image_url ?? '', service.hover_image_url ?? service.image_url ?? ''),
        imageAlt: this.content.pick(service.image_alt),
      }));
    }

    return this.bundledGroups[category].items.map((item) => ({
      ...item,
      ...upgradeImages(item.image, item.hoverImage),
      title: this.language.translate(item.title),
      description: this.language.translate(item.description),
      imageAlt: this.language.translate(item.imageAlt),
    }));
  });

  constructor() {
    // Browser only (never runs during server rendering), after the blocks are in the DOM.
    afterRenderEffect(() => this.revealBlocks(this.blocks().map((block) => block.nativeElement)));
    inject(DestroyRef).onDestroy(() => this.revealObserver?.disconnect());

    if (!this.route) {
      return;
    }

    const routeCategory = this.route.snapshot.queryParamMap.get('category');
    this.selectedCategory.set(routeCategory === 'suppliers' ? 'suppliers' : 'customers');

    this.route.queryParamMap.subscribe((params) => {
      const nextCategory = params.get('category');
      this.selectedCategory.set(nextCategory === 'suppliers' ? 'suppliers' : 'customers');
      this.activeIndex.set(0);
    });
  }

  protected selectCategory(category: ServiceCategory): void {
    this.selectedCategory.set(category);
    this.activeIndex.set(0);
  }

  protected showService(index: number): void {
    this.activeIndex.set(index);
  }

  /** Services page index: scrolls (smoothly, unless reduced motion is preferred) to a service. */
  protected scrollToService(index: number): void {
    if (typeof document === 'undefined') {
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`service-${index}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /**
   * Services page entrance: each block fades and rises once, the first time it enters the
   * screen, then is no longer observed. Blocks already on screen are shown at once (no flash),
   * and nothing is hidden without IntersectionObserver or when reduced motion is preferred.
   */
  private revealBlocks(blocks: HTMLElement[]): void {
    if (!blocks.length || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.revealObserver ??= new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );

    for (const block of blocks) {
      if (block.classList.contains('is-visible') || block.classList.contains('is-pending')) {
        continue;
      }
      if (block.getBoundingClientRect().top < window.innerHeight) {
        block.classList.add('is-visible');
      } else {
        block.classList.add('is-pending');
        this.revealObserver.observe(block);
      }
    }
  }
}
