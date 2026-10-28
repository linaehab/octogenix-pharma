import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WHY_LINKS } from '../../data/why-content';
import { injectWhyContent } from './why-content';

/**
 * "The Benefits of Jovie Goat" (official facts-facts): six cards in the official card shape, each
 * linking to its part of the "makes good sense" page. Also used as the home-page summary, where
 * "More information" leads to the Why Jovie Goat page instead.
 */
@Component({
  selector: 'app-why-benefits',
  imports: [RouterLink],
  template: `
    <section id="jovieFacts" class="benefits" aria-labelledby="jovie-why-benefits">
      <div class="jv-container">
        <div class="head">
          <h2 id="jovie-why-benefits">{{ content().benefits.title }}</h2>
          <p>{{ content().benefits.intro }}</p>
        </div>
        <ul class="cards">
          @for (card of content().benefits.cards; track card.anchor) {
            <li>
              <a class="card" [routerLink]="links.benefits" [fragment]="card.anchor">
                <img [src]="'/assets/images/jovie/official/icons/benefit-' + ($index + 1) + '.svg'" alt="" loading="lazy" />
                <span class="caption">
                  <span class="card-title">{{ card.title }}</span>
                  <span class="card-text">{{ card.text }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
        <p class="more">
          <a class="jv-link jv-link--small" [routerLink]="moreLink() ?? links.benefits">{{ content().benefits.more }}</a>
        </p>
      </div>
    </section>
  `,
  styles: `
    .benefits { padding-block: clamp(5rem, 9vw, 7.5rem); scroll-margin-top: 4rem; }
    .head { max-width: 58rem; margin: 0 auto clamp(3rem, 6vw, 5rem); text-align: center; }
    h2 { margin: 0 0 1rem; font-size: clamp(2rem, 3.6vw, 3rem); font-weight: 700; line-height: 1.15; }
    .head p { margin: 0; font-size: 1.05rem; line-height: 1.6; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 2rem; margin: 0; padding: 0; list-style: none; }
    .card { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 340px; margin-bottom: 3rem; background: var(--jv-panel); text-align: center; clip-path: url(#jv-fastFact); transition: background 0.3s ease; }
    .card:hover { background: #eaecf3; }
    .card img { width: 5rem; height: 5rem; object-fit: contain; }
    .caption { display: flex; flex-direction: column; margin-top: 1rem; padding: 0 2.9rem; }
    .card-title { margin-bottom: 0.55rem; font-size: 1.3rem; font-weight: 700; line-height: 1.1; }
    .card-text { font-size: 0.95rem; line-height: 1.5; }
    .more { margin: 0; text-align: center; }
    @media (max-width: 991px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 599px) { .cards { grid-template-columns: 1fr; } .card { height: 300px; margin-bottom: 1.5rem; } }
  `,
})
export class WhyBenefits {
  protected readonly content = injectWhyContent();
  protected readonly links = WHY_LINKS;
  /** Target of "More information" (default: the "makes good sense" page). */
  readonly moreLink = input<string | null>(null);
}
