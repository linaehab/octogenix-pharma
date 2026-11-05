import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LocalizedText } from '../../../core/content/site-content.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FaqSection } from '../../components/faq-section/faq-section';
import { ProductCard } from '../../components/product-card/product-card';
import { fill, injectProductsContent } from '../../components/products/products-content';
import { GalleryImage, ShopGallery } from '../../components/shop-product/shop-gallery';
import { QuantityStepper } from '../../components/shop-product/quantity-stepper';
import { ShopRating } from '../../components/shop-product/shop-rating';
import { FamilyReviews } from '../../components/shop-product/family-reviews';
import { SHOW_FAMILY_REVIEWS } from '../../data/family-reviews';
import { ShopReviews } from '../../components/shop-product/shop-reviews';
import { ShopHighlights } from '../../components/shop-product/shop-highlights';
import { ShopStickyBar } from '../../components/shop-product/shop-sticky-bar';
import {
  FEEDING_CHART_PDF,
  FEEDING_CHART_TEXT,
  FEEDING_ROWS,
  type FeedingStage,
  dailyAmounts,
  tinsPerMonth,
} from '../../data/feeding-chart';
import { formatPrice } from '../../data/format-price';
import { JovieCatalogService } from '../../data/jovie-catalog.service';
import { ApiProduct, ApiProductVariant, Money } from '../../data/jovie-product.models';
import { LABEL_CONTENT } from '../../data/label-content';
import { PREVIEW_PRODUCTS } from '../../data/preview-catalog';
import { PRODUCTS, PRODUCT_VIEWS, productImage, productLink } from '../../data/products-content';
import { CartService } from '../../store/cart.service';
import { TestModeNotice } from '../../store/test-mode-notice';

const MAX_QUANTITY = 99;
const span = ([a, b]: readonly [number, number]) => (a === b ? `${a}` : `${a}–${b}`);

/**
 * /jovie/shop/:slug — the shop product page, in the order of the kabrita.com product page:
 * breadcrumb; gallery beside rating, name, price, key facts, size, quantity, Add to Cart and
 * availability; then information panels (important information, description, feeding guide,
 * ingredients, preparation & storage, nutrition), highlights, all products by age and the FAQ.
 *
 * Name, price, sizes and availability come from the API; every text is the Egyptian label
 * (data/label-content.ts), the label's feeding table (data/feeding-chart.ts) or the official
 * jovieproducts.com copy (data/products-content.ts). The rating is the labelled preview rating.
 */
@Component({
  selector: 'app-jovie-shop-product-page',
  imports: [RouterLink, TranslatePipe, ShopGallery, ShopRating, ShopReviews, QuantityStepper, ShopHighlights, ShopStickyBar, ProductCard, FaqSection, TestModeNotice, FamilyReviews],
  templateUrl: './jovie-shop-product-page.html',
  styleUrl: './jovie-shop-product-page.css',
})
export class JovieShopProductPage {
  /** Parents' testimonials section: off for Egypt until approved (see SHOW_FAMILY_REVIEWS). */
  protected readonly showFamilyReviews = SHOW_FAMILY_REVIEWS;
  private readonly catalog = inject(JovieCatalogService);
  private readonly cart = inject(CartService);
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);
  private readonly official = injectProductsContent();
  private readonly title = inject(Title);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly product = signal<ApiProduct | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  protected readonly variant = signal<ApiProductVariant | null>(null);
  protected readonly quantity = signal(1);
  protected readonly adding = signal(false);
  protected readonly feedback = signal<{ key: string; params?: Record<string, string | number>; ok: boolean } | null>(null);
  /** The sticky Add to Cart bar shows once the main button has scrolled out of view. */
  protected readonly showSticky = signal(false);

  private readonly buyButton = viewChild<ElementRef<HTMLElement>>('buyButton');
  private slug = '';

  protected readonly stage = computed(() => (this.product()?.stage ?? null) as FeedingStage | null);
  private readonly info = computed(() => PRODUCTS.find((p) => p.stage === this.stage()) ?? null);
  protected readonly officialText = computed(() => {
    const info = this.info();
    return info ? this.official().products[info.slug] : null;
  });
  protected readonly label = computed(() => {
    const stage = this.stage();
    const text = LABEL_CONTENT[this.language.currentLanguage()];
    return stage ? { ...text, stage: text.stages[stage] } : null;
  });
  protected readonly isArabic = computed(() => this.language.currentLanguage() === 'ar');
  protected readonly name = computed(() => this.content.pick(this.product()?.name));
  protected readonly tone = computed(() => this.info()?.tone ?? 'yellow');
  protected readonly download = computed(() => this.info()?.download ?? null);
  protected readonly officialLink = computed(() => {
    const info = this.info();
    return info ? productLink(info.slug) : '/jovie/products';
  });
  protected readonly usps = computed(() => this.official().detail.usps);

  /** Tin views of the Egyptian packaging, then the two-tin photo (official assets). */
  protected readonly images = computed<GalleryImage[]>(() => {
    const stage = this.stage();
    const official = this.official().detail;
    if (!stage) {
      return [];
    }
    return [
      ...PRODUCT_VIEWS.map((view) => ({
        src: productImage(stage, view),
        zoom: productImage(stage, view, true),
        alt: `${this.name()} – ${official.views[view]}`,
      })),
      { src: `/assets/images/jovie/products/eg-stage-${stage}-duo.webp`, alt: this.name() },
    ];
  });

  /** Placeholder rating of the stage (preview catalogue), labelled "preview" on the page. */
  protected readonly rating = computed(
    () => this.product()?.rating ?? PREVIEW_PRODUCTS.find((p) => p.stage === this.stage())?.rating ?? null,
  );

  protected readonly unitPrice = computed(() => this.variant()?.price ?? null);
  protected readonly linePrice = computed<Money | null>(() => {
    const price = this.unitPrice();
    return price ? { ...price, amount_piastres: price.amount_piastres * this.quantity() } : null;
  });
  protected readonly maxQuantity = computed(() => Math.min(MAX_QUANTITY, this.variant()?.max_per_order ?? MAX_QUANTITY));

  /** Why Add to Cart is off, or null. */
  protected readonly unavailableReason = computed(() => {
    const variant = this.variant();
    if (!variant) {
      return 'jovie.cart.outOfStock';
    }
    if (!variant.price) {
      return 'jovie.shop.pricePending';
    }
    return variant.is_available ? null : 'jovie.cart.outOfStock';
  });

  /** This stage's rows of the label's feeding table. */
  protected readonly feeding = computed(() => {
    const stage = this.stage();
    const text = FEEDING_CHART_TEXT[this.language.currentLanguage()];
    return FEEDING_ROWS.filter((row) => row.stage === stage).map((row) => {
      const daily = dailyAmounts(row);
      return {
        id: row.id,
        label: text.rows[row.id],
        feeds: typeof row.feeds === 'number' ? `${row.feeds}` : span(row.feeds),
        water: fill(text.units.ml, { value: row.water }),
        scoops: row.scoops,
        daily: fill(text.units.dailyValue, { water: span(daily.water), scoops: span(daily.scoops) }),
        tins: fill(text.units.tins, { value: span(tinsPerMonth(row)) }),
      };
    });
  });
  protected readonly feedingText = computed(() => FEEDING_CHART_TEXT[this.language.currentLanguage()]);
  protected readonly feedingPdf = computed(() => FEEDING_CHART_PDF[this.language.currentLanguage()]);

  /** All Jovie products by age (the catalogue cards). */
  protected readonly related = computed(() => this.catalog.products());
  protected readonly relatedArePreview = computed(() => this.catalog.isPreview());

  constructor() {
    const route = inject(ActivatedRoute);
    route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.slug = params.get('slug') ?? '';
      if (this.isBrowser) {
        this.load();
      }
    });
    if (this.isBrowser) {
      this.catalog.load();
    }

    // The sticky bar: watch the main Add to Cart button once it is rendered.
    effect((onCleanup) => {
      const button = this.buyButton()?.nativeElement;
      if (!button || typeof IntersectionObserver === 'undefined') {
        return;
      }
      const observer = new IntersectionObserver(([entry]) =>
        this.showSticky.set(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      );
      observer.observe(button);
      onCleanup(() => observer.disconnect());
    });
  }

  protected load(): void {
    this.state.set('loading');
    this.feedback.set(null);
    this.catalog.productDetail(this.slug).subscribe({
      next: (product) => {
        this.product.set(product);
        this.title.setTitle(`${this.content.pick(product.name)} | Jovie`);
        this.variant.set(product.variants.find((v) => v.is_default) ?? product.variants[0] ?? null);
        this.quantity.set(1);
        this.state.set('ready');
      },
      error: (error: unknown) =>
        this.state.set(error instanceof HttpErrorResponse && error.status === 404 ? 'notFound' : 'error'),
    });
  }

  protected pick(text: LocalizedText | null | undefined): string {
    return this.content.pick(text);
  }

  protected price(money: Money | null | undefined): string {
    return money ? formatPrice(money, this.language.currentLanguage()) : '';
  }

  protected selectVariant(variant: ApiProductVariant): void {
    this.variant.set(variant);
    this.quantity.update((q) => Math.min(q, Math.min(MAX_QUANTITY, variant.max_per_order ?? MAX_QUANTITY)));
    this.feedback.set(null);
  }

  protected setQuantity(value: number): void {
    if (Number.isFinite(value)) {
      this.quantity.set(Math.max(1, Math.min(this.maxQuantity(), Math.floor(value))));
    }
  }

  protected addToCart(): void {
    const variant = this.variant();
    if (!variant || this.unavailableReason() || this.adding()) {
      return;
    }
    const quantity = this.quantity();
    this.adding.set(true);
    this.feedback.set(null);
    this.cart.add(variant.id, quantity).subscribe({
      next: ({ adjustments }) => {
        const adjusted = adjustments.find((a) => a.variantId === variant.id);
        this.adding.set(false);
        this.feedback.set(
          adjusted
            ? { key: 'jovie.cart.limited', params: { count: adjusted.allowed }, ok: false }
            : { key: 'jovie.pdp.added', params: { count: quantity }, ok: true },
        );
      },
      error: (error: unknown) => {
        this.adding.set(false);
        this.feedback.set({
          key: error instanceof Error && error.message === 'cart-full' ? 'jovie.cart.full' : 'jovie.cart.addError',
          ok: false,
        });
      },
    });
  }
}
