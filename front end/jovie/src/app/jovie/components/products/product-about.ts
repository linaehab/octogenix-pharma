import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductInfo, USP_FRAGMENTS, USP_LINKS } from '../../data/products-content';
import { injectProductsContent } from './products-content';

/**
 * "All About Jovie Goat ..." (official product-content): two introduction columns and the three
 * goat milk benefits, each with "More information" leading to its part of the Why Jovie Goat page.
 */
@Component({
  selector: 'app-product-about',
  imports: [RouterLink],
  template: `
    <section class="about" aria-labelledby="jovie-product-about">
      <div class="jv-container">
        <h2 id="jovie-product-about">{{ text().allAboutTitle }}</h2>
        <div class="intro">
          @for (paragraph of text().intro; track $index) {
            <p>{{ paragraph }}</p>
          }
        </div>
        <ul class="usps">
          @for (usp of content().detail.usps; track $index) {
            <li class="usp">
              <h3>{{ usp.title }}</h3>
              <p>{{ usp.text }}</p>
              <a class="jv-link jv-link--small" [routerLink]="links[$index]" [fragment]="fragments[$index]">
                {{ content().detail.moreInformation }}
              </a>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    .about { position: relative; padding-block: clamp(5rem, 11vw, 8.9rem); overflow-x: clip; }
    .about::before { content: ''; position: absolute; top: -5rem; inset-inline-end: 0; width: 6rem; height: 6.45rem; background: url('/assets/images/jovie/products/content-pattern-1.svg') no-repeat center / contain; }
    .about::after { content: ''; position: absolute; bottom: -0.55rem; inset-inline-end: -0.28rem; width: 8.65rem; height: 18rem; background: url('/assets/images/jovie/products/content-pattern-2.svg') no-repeat 100% 100% / contain; }
    :host-context([dir='rtl']) .about::before, :host-context([dir='rtl']) .about::after { transform: scaleX(-1); }
    .jv-container { max-width: 56rem; }
    h2 { margin: 0 0 2.7rem; text-align: center; font-size: clamp(2rem, 3.6vw, 2.75rem); font-weight: 700; line-height: 1.15; }
    .intro { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem 2rem; margin-bottom: 0.5rem; }
    .intro p { margin: 0; font-size: 1.15rem; line-height: 1.65; }
    .usps { display: flex; flex-wrap: wrap; justify-content: center; gap: 0 2rem; margin: 0; padding: 0; list-style: none; }
    .usp { flex: 0 1 calc(50% - 1rem); margin-top: 2.2rem; padding-inline-start: 2.2rem; background: url('/assets/images/jovie/products/usp-icon.svg') no-repeat; background-position: top 6px left; }
    :host-context([dir='rtl']) .usp { background-position: top 6px right; }
    h3 { margin: 0 0 0.55rem; font-size: 1.35rem; font-weight: 700; line-height: 1.3; }
    .usp p { margin: 0 0 0.35rem; font-size: 1rem; line-height: 1.6; }
    @media (max-width: 991px) { .about::before, .about::after { display: none; } }
    @media (max-width: 767px) { .intro { grid-template-columns: 1fr; } .usp { flex-basis: 100%; } }
  `,
})
export class ProductAbout {
  readonly product = input.required<ProductInfo>();

  protected readonly content = injectProductsContent();
  protected readonly text = computed(() => this.content().products[this.product().slug]);
  protected readonly links = USP_LINKS;
  protected readonly fragments = USP_FRAGMENTS;
}
