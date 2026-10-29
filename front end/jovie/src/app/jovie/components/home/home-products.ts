import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUCTS, productImage, productLink } from '../../data/products-content';
import { injectProductsContent } from '../products/products-content';
import { injectHomeContent } from './home-content';

/**
 * "Jovie Goat Organic" (official products-block): text and "Jovie products!", then the three
 * product tiles in the official blob shape and colours, with the Egyptian tins.
 */
@Component({
  selector: 'app-home-products',
  imports: [RouterLink],
  template: `
    <section class="block" aria-labelledby="jovie-home-organic">
      <div class="backdrop" aria-hidden="true"></div>
      <div class="jv-container head">
        <h2 id="jovie-home-organic">{{ content().organic.title }}</h2>
        <p>{{ content().organic.text }}</p>
        <a class="jv-button" routerLink="/jovie/products">{{ content().organic.button }}</a>
      </div>
      <ul class="tiles">
        @for (product of products; track product.slug) {
          <li>
            <a class="tile" [attr.data-tone]="product.tone" [routerLink]="link(product.slug)">
              <span class="brand">{{ productsContent().brand }}</span>
              <span class="name">{{ productsContent().products[product.slug].name }}</span>
              <img [src]="image(product.stage, 'front')" alt="" width="640" height="867" loading="lazy" />
              <span class="more">{{ content().organic.moreDetails }}</span>
            </a>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    .block { position: relative; overflow: hidden; padding-block: 11.25rem 7.54rem; }
    .block::before { content: ''; position: absolute; inset: 0 0 50%; background: var(--jv-panel); }
    .backdrop { position: absolute; top: -1.24rem; inset-inline: 0; height: 47.7rem; background: var(--jv-panel); clip-path: url(#jv-productTile); }
    .head { position: relative; max-width: 40.5rem; text-align: center; }
    h2 { margin: 0 0 1.69rem; font-size: clamp(2.25rem, 3.6vw, 3.38rem); font-weight: 700; line-height: 1.15; }
    .head p { margin: 0 0 2.98rem; font-size: 1.12rem; line-height: 1.6; }
    .head .jv-button { border-radius: 2px; }
    .tiles { position: relative; display: flex; justify-content: space-between; margin: 0 -5.51rem; padding: 0; list-style: none; }
    .tiles li { margin-top: -3.88rem; }
    .tiles li:nth-child(2) { margin-top: 5.46rem; }
    .tile { --tone: var(--jv-sunshine); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 26.78rem; height: 30.04rem; background: var(--tone); color: var(--jv-white); text-align: center; clip-path: url(#jv-productTile); }
    .tile[data-tone='pink'] { --tone: var(--jv-pink); }
    .tile[data-tone='blue'] { --tone: var(--jv-blue); }
    .brand { font-size: 1.52rem; font-weight: 700; line-height: 2.59rem; }
    .name { margin-bottom: 2.19rem; font-size: 1.01rem; }
    .tile img { width: auto; max-height: 50%; margin-bottom: 1.74rem; filter: drop-shadow(0 10px 12px rgba(32, 53, 100, 0.18)); }
    .more { padding: 0.51rem 1.24rem; background: var(--jv-white); color: var(--jv-night); font-size: 1.01rem; font-weight: 700; transition: background 0.3s ease; }
    .tile:hover .more { background: var(--jv-panel); }
    @media (max-width: 991px) {
      .block { padding-block: 5.62rem; }
      .block::before { display: none; }
      .tiles { flex-direction: column; align-items: center; margin: 0 1.41rem; }
      .tiles li, .tiles li:nth-child(2) { margin-top: 3.38rem; }
      .tile { width: min(26.78rem, calc(100vw - 2.81rem)); }
    }
  `,
})
export class HomeProducts {
  protected readonly content = injectHomeContent();
  protected readonly productsContent = injectProductsContent();
  protected readonly products = PRODUCTS;
  protected readonly image = productImage;
  protected readonly link = productLink;
}
