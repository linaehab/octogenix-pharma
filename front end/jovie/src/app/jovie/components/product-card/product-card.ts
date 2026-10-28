import { Component, computed, inject, input } from '@angular/core';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { formatPrice } from '../../data/format-price';
import { ApiProduct } from '../../data/jovie-product.models';

/**
 * Shop card. Adding to the cart is not available in this phase, so the button is always
 * disabled; prices from the preview catalogue are labelled as such.
 */
@Component({
  selector: 'app-product-card',
  imports: [TranslatePipe],
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
  protected readonly subtitle = computed(() => this.content.pick(this.product().subtitle));
  protected readonly description = computed(() => this.content.pick(this.product().short_description));
  protected readonly imageAlt = computed(() => this.content.pick(this.product().image?.alt) || this.name());
  protected readonly weight = computed(() => {
    const variant = this.product().variants.find((v) => v.is_default) ?? this.product().variants[0];
    return variant ? this.content.pick(variant.name) : '';
  });
  protected readonly price = computed(() => {
    const price = this.product().price_from;
    return price ? formatPrice(price, this.language.currentLanguage()) : null;
  });
}
