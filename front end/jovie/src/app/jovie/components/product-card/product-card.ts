import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { formatPrice } from '../../data/format-price';
import { ApiProduct } from '../../data/jovie-product.models';
import { PRODUCTS, productLink } from '../../data/products-content';

/**
 * Shop card, laid out like the kabrita.eu product cards in the Jovie colours: the tin on the
 * stage colour, swapping on hover to two Egyptian tins side by side; name, price, age and tin
 * chips, and "Shop now" to the product's page. Preview prices are labelled as such.
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

  readonly product = input.required<ApiProduct>();
  readonly isPreview = input(false);

  protected readonly name = computed(() => this.content.pick(this.product().name));
  protected readonly imageAlt = computed(() => this.content.pick(this.product().image?.alt) || this.name());
  protected readonly weight = computed(() => {
    const variant = this.product().variants.find((v) => v.is_default) ?? this.product().variants[0];
    return variant ? this.content.pick(variant.name) : '';
  });
  protected readonly price = computed(() => {
    const price = this.product().price_from;
    return price ? formatPrice(price, this.language.currentLanguage()) : null;
  });

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
    const average = this.product().rating?.average ?? 0;
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

  protected readonly link = computed(() => {
    const product = this.stageProduct();
    return product ? productLink(product.slug) : '/jovie/products';
  });
}
