import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { formatPrice } from '../../data/format-price';
import { ApiProduct } from '../../data/jovie-product.models';
import { PREVIEW_PRODUCTS } from '../../data/preview-catalog';
import { PRODUCTS, productLink } from '../../data/products-content';
import { CartService } from '../../store/cart.service';
import { CheckoutService } from '../../store/checkout.service';

/** Feedback under the card's buttons. */
interface CartFeedback {
  kind: 'added' | 'adjusted' | 'error';
  /** adjusted: how many the server allows. */
  allowed?: number;
  /** error: translation key of the message. */
  key?: string;
}

/**
 * Shop card, laid out like the kabrita.eu product cards in the Jovie colours: the tin on the
 * stage colour, swapping on hover to two Egyptian tins side by side; rating, name, price, age and
 * tin chips, then two actions: Add to Cart (stays on the page; the server prices the cart) and
 * Shop now (the product's page). Preview prices and ratings are labelled as such.
 */
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
  host: { '[attr.data-stage]': 'product().stage' },
})
export class ProductCard {
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);
  private readonly cart = inject(CartService);
  private readonly checkout = inject(CheckoutService);
  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;

  readonly product = input.required<ApiProduct>();
  readonly isPreview = input(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.feedbackTimer));
  }

  protected readonly name = computed(() => this.content.pick(this.product().name));
  protected readonly imageAlt = computed(() => this.content.pick(this.product().image?.alt) || this.name());
  /** The variant Add to Cart uses (the default one; sizes are chosen on the product page). */
  protected readonly variant = computed(
    () => this.product().variants.find((v) => v.is_default) ?? this.product().variants[0] ?? null,
  );
  protected readonly weight = computed(() => {
    const variant = this.variant();
    return variant ? this.content.pick(variant.name) : '';
  });
  protected readonly price = computed(() => {
    const price = this.product().price_from;
    return price ? formatPrice(price, this.language.currentLanguage()) : null;
  });

  /**
   * The rating line. The API has no reviews yet, so the card shows the stage's placeholder rating
   * from the preview catalogue, labelled "preview" (approved for the design, not real reviews).
   */
  protected readonly rating = computed(
    () => this.product().rating ?? PREVIEW_PRODUCTS.find((p) => p.stage === this.product().stage)?.rating ?? null,
  );
  protected readonly isPreviewRating = computed(() => !this.product().rating && !!this.rating());

  /** The age chip: months up to a year, years after that. */
  protected readonly age = computed(() => {
    const { age_from_months: from, age_to_months: to } = this.product();
    if (from === null || to === null) {
      return null;
    }
    return to > 12
      ? { key: 'jovie.shop.ageYears', from: Math.floor(from / 12), to: Math.floor(to / 12) }
      : { key: 'jovie.shop.ageMonths', from, to };
  });

  /** Fill of each of the five stars (0–1), for the rating's average. */
  protected readonly stars = computed(() => {
    const average = this.rating()?.average ?? 0;
    return [0, 1, 2, 3, 4].map((index) => Math.min(1, Math.max(0, average - index)));
  });

  protected readonly starPath =
    'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z';

  private readonly stageProduct = computed(() => PRODUCTS.find((p) => p.stage === this.product().stage) ?? null);

  /** The stage's two-tin photo (bundled, the listing API sends one image per product). */
  protected readonly duoImage = computed(() => {
    const stage = this.stageProduct()?.stage;
    return stage ? `/assets/images/jovie/products/eg-stage-${stage}-duo.webp` : null;
  });

  /** Shop now: the shop product page of an API product; preview cards keep the official page. */
  protected readonly link = computed(() => {
    if (!this.isPreview() && (this.variant()?.id ?? 0) > 0) {
      return `/jovie/shop/${this.product().slug}`;
    }
    const product = this.stageProduct();
    return product ? productLink(product.slug) : '/jovie/products';
  });

  protected readonly adding = signal(false);
  protected readonly feedback = signal<CartFeedback | null>(null);

  /** Why Add to Cart is off, or null when the product can be bought now. */
  protected readonly unavailableReason = computed(() => {
    const variant = this.variant();
    if (this.isPreview() || !variant || variant.id <= 0) {
      return 'jovie.cart.previewOnly';
    }
    if (!this.checkout.config().enabled) {
      return 'jovie.cart.storeClosed';
    }
    if (!variant.price) {
      return 'jovie.shop.pricePending';
    }
    return variant.is_available ? null : 'jovie.cart.outOfStock';
  });

  protected addToCart(): void {
    const variant = this.variant();
    if (!variant || this.unavailableReason() || this.adding()) {
      return;
    }
    this.adding.set(true);
    this.feedback.set(null);
    this.cart.add(variant.id, 1).subscribe({
      next: ({ adjustments }) => {
        const adjusted = adjustments.find((a) => a.variantId === variant.id);
        this.show(adjusted ? { kind: 'adjusted', allowed: adjusted.allowed } : { kind: 'added' });
      },
      error: (error: unknown) =>
        this.show({ kind: 'error', key: error instanceof Error && error.message === 'cart-full' ? 'jovie.cart.full' : 'jovie.cart.addError' }),
    });
  }

  private show(feedback: CartFeedback): void {
    this.adding.set(false);
    this.feedback.set(feedback);
    clearTimeout(this.feedbackTimer);
    if (feedback.kind === 'added') {
      this.feedbackTimer = setTimeout(() => this.feedback.set(null), 6000);
    }
  }
}
