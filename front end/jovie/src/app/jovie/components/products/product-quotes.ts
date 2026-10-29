import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectProductsContent } from './products-content';

/**
 * "What People Say" (official quotes block): the three official testimonials, each a photo in the
 * official mask with the quote in a yellow blob. Shown side by side instead of the official
 * sideways-moving track.
 */
@Component({
  selector: 'app-product-quotes',
  imports: [RouterLink],
  template: `
    <section class="quotes" aria-labelledby="jovie-product-quotes">
      <div class="jv-container">
        <div class="head">
          <h2 id="jovie-product-quotes">{{ content().detail.quotesTitle }}</h2>
          <p>{{ content().detail.quotesText }}</p>
          <a class="jv-button" routerLink="/jovie/contact">{{ content().detail.shareStory }}</a>
        </div>
        <ul class="list">
          @for (quote of content().detail.quotes; track quote.name) {
            <li class="item">
              <img [src]="quote.image" alt="" width="850" height="840" loading="lazy" />
              <figure class="caption">
                <span class="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false"><path d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5V13h4v4h2zM20 7h-3.5A2.5 2.5 0 0 0 14 9.5V13h4v4h2z" /></svg>
                </span>
                <blockquote>{{ quote.text }}</blockquote>
                <figcaption>
                  <strong>{{ quote.name }}</strong>
                  @if (quote.role) {
                    <span>{{ quote.role }}</span>
                  }
                </figcaption>
              </figure>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    .quotes { padding-block: clamp(5rem, 11vw, 8.9rem); background: var(--jv-panel); }
    .head { max-width: 34rem; margin: 0 auto 3.5rem; text-align: center; }
    h2 { margin: 0 0 1.35rem; font-size: clamp(2rem, 3.6vw, 2.75rem); font-weight: 700; line-height: 1.15; }
    .head p { margin: 0 0 2.6rem; font-size: 1rem; line-height: 1.6; }
    .list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; margin: 0; padding: 0; list-style: none; }
    .item { position: relative; display: flex; padding-bottom: 7.5rem; }
    .item img { display: block; width: 72%; height: auto; clip-path: url(#jv-quoteImage); }
    .caption { position: absolute; inset-inline-end: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; width: 76%; aspect-ratio: 320 / 322; margin: 0; padding: 2.2rem 2rem 1.8rem; background: var(--jv-sunshine); color: var(--jv-white); text-align: center; clip-path: url(#jv-quoteCaption); }
    .item:nth-child(2n) { flex-direction: row-reverse; padding: 7.5rem 0 0; }
    .item:nth-child(2n) .caption { inset-inline: 0 auto; top: 0; bottom: auto; }
    .icon { position: absolute; top: 50%; inset-inline-start: 0.7rem; display: grid; place-items: center; width: 1.8rem; height: 1.8rem; margin-top: -0.9rem; background: var(--jv-white); color: var(--jv-night); clip-path: url(#jv-quoteIcon); }
    .item:nth-child(2n) .icon { inset-inline: auto 0.7rem; }
    .icon svg { width: 0.9rem; height: 0.9rem; fill: currentColor; }
    blockquote { margin: 0 0 1rem; font-size: 0.85rem; line-height: 1.35; }
    figcaption { display: flex; flex-direction: column; font-size: 0.85rem; line-height: 1.35; }
    @media (max-width: 1199px) {
      .list { grid-template-columns: 1fr; max-width: 30rem; margin-inline: auto; gap: 2.5rem; }
      .item, .item:nth-child(2n) { padding: 0 0 8rem; flex-direction: row; }
      .item:nth-child(2n) { flex-direction: row-reverse; }
      .item .caption, .item:nth-child(2n) .caption { top: auto; bottom: 0; width: 70%; }
      .item .caption { inset-inline: auto 0; }
      .item:nth-child(2n) .caption { inset-inline: 0 auto; }
      blockquote, figcaption { font-size: 0.95rem; }
    }
    @media (max-width: 479px) {
      .item, .item:nth-child(2n) { flex-direction: column; padding: 0; }
      .item img { width: 80%; margin-inline: auto; }
      .item .caption, .item:nth-child(2n) .caption { position: relative; inset: auto; width: 100%; margin-top: -2.5rem; }
      .icon, .item:nth-child(2n) .icon { top: 1rem; inset-inline: 0; margin: 0 auto; }
    }
  `,
})
export class ProductQuotes {
  protected readonly content = injectProductsContent();
}
