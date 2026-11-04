import { Component, input } from '@angular/core';

/** The official Jovie Goat benefits (product-page USPs) on the cream band of the shop product page. */
@Component({
  selector: 'app-shop-highlights',
  template: `
    <section class="highlights" aria-labelledby="pdp-highlights">
      <div class="jv-container">
        <h2 id="pdp-highlights" class="jv-title">{{ title() }}</h2>
        <ul>
          @for (usp of items(); track usp.title) {
            <li>
              <img src="/assets/images/jovie/products/usp-icon.svg" alt="" width="56" height="56" />
              <h3>{{ usp.title }}</h3>
              <p>{{ usp.text }}</p>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .highlights {
      padding-block: clamp(3rem, 7vw, 5rem);
      background: var(--jv-cream);
      text-align: center;
    }

    ul {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 2rem;
      margin: 2rem 0 0;
      padding: 0;
      list-style: none;
    }

    h3 {
      margin: 0.75rem 0 0.4rem;
      font-size: 1.15rem;
    }

    p {
      margin: 0;
    }

    @media (max-width: 899px) {
      ul {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ShopHighlights {
  readonly title = input.required<string>();
  readonly items = input.required<{ title: string; text: string }[]>();
}
