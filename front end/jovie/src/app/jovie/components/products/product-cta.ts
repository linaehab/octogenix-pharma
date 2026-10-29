import { Component, computed, input } from '@angular/core';
import { ProductInfo } from '../../data/products-content';
import { injectProductsContent } from './products-content';

/**
 * The navy call to action of the official product pages (cta-block--5): the text in a white blob,
 * "Download product details" (here: the Egyptian label of the tin) and a photo in the official mask.
 */
@Component({
  selector: 'app-product-cta',
  template: `
    <section class="cta" aria-labelledby="jovie-product-cta">
      <div class="jv-container grid">
        <div class="caption-wrap">
          <div class="caption">
            <p class="kicker">{{ text().cta.kicker }}</p>
            <h2 id="jovie-product-cta">{{ text().cta.title }}</h2>
            <p class="text">{{ text().cta.text }}</p>
            <p id="jovie-product-download-note" class="note">{{ content().detail.downloadNote }}</p>
            <a class="jv-button" [href]="product().download" download aria-describedby="jovie-product-download-note">
              {{ content().detail.download }}
            </a>
          </div>
          <p class="arrow jv-handwritten" aria-hidden="true">{{ content().detail.clickHere }}</p>
        </div>
        <div class="image">
          <img [src]="product().ctaImage" alt="" width="900" height="941" loading="lazy" />
        </div>
      </div>
    </section>
  `,
  styles: `
    .cta { position: relative; padding-block: 7rem 5.5rem; background: var(--jv-night) url('/assets/images/jovie/products/cta-pattern.svg') no-repeat right top / 100% 100%; color: var(--jv-night); clip-path: url(#jv-ctaBackground2); }
    .grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: center; gap: 2rem; }
    .caption-wrap { position: relative; padding-inline: 3.5rem 0; }
    .caption { position: relative; z-index: 1; padding: 1rem 0 0.5rem; text-align: center; }
    .caption::before { content: ''; position: absolute; z-index: -1; inset: -4.9rem -5.2rem 0.55rem; background: var(--jv-white); clip-path: url(#jv-ctaCaption); }
    .kicker { margin: 0 0 0.45rem; font-size: 1.35rem; font-weight: 700; line-height: 1.25; }
    h2 { margin: 0 0 1.4rem; font-size: clamp(2rem, 3.3vw, 2.6rem); font-weight: 700; line-height: 1.15; }
    .text { margin: 0 0 1.4rem; font-size: 0.95rem; line-height: 1.6; }
    .note { margin: 0 0 1rem; font-size: 0.85rem; font-weight: 700; }
    .arrow { position: absolute; inset-inline-start: -1rem; bottom: -5.5rem; width: 14.7rem; margin: 0; padding-inline-end: 3.3rem; color: var(--jv-white); font-size: 1.75rem; line-height: 1.8rem; text-align: center; background: url('/assets/images/jovie/products/cta-arrow.svg') no-repeat 100% 0; }
    :host-context([dir='rtl']) .arrow { background-position: 0 0; padding-inline-end: 0; padding-inline-start: 3.3rem; }
    .image img { display: block; width: 100%; height: auto; clip-path: url(#jv-ctaImage2); }
    @media (max-width: 991px) {
      .cta { padding-block: 7rem 4rem; background-image: none; }
      .grid { grid-template-columns: 1fr; gap: 3rem; }
      .caption-wrap { padding-inline: 1.5rem; }
      .caption::before { inset-inline: -1.25rem; }
      .arrow { display: none; }
      .image { max-width: 32rem; margin-inline: auto; }
    }
  `,
})
export class ProductCta {
  readonly product = input.required<ProductInfo>();

  protected readonly content = injectProductsContent();
  protected readonly text = computed(() => this.content().products[this.product().slug]);
}
