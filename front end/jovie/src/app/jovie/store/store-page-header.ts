import { Component, input } from '@angular/core';

/**
 * Title band of the store pages (cart, checkout, payment): the yellow band the Jovie header floats
 * over on every page, kept short so the cart and forms start near the top. Projected content
 * (a back link, for example) sits beside the title.
 */
@Component({
  selector: 'app-store-page-header',
  template: `
    <div class="band">
      <div class="jv-container row">
        <div>
          @if (kicker()) {
            <p class="kicker">{{ kicker() }}</p>
          }
          <h1>{{ title() }}</h1>
        </div>
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .band {
      padding-block: calc(var(--jv-header-height) + 1.25rem) 3.25rem;
      background: var(--jv-sunshine);
      clip-path: ellipse(120% 100% at 50% 0);
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 0.75rem 2rem;
    }

    .kicker {
      margin: 0 0 0.25rem;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      font-size: clamp(2.1rem, 5vw, 3.2rem);
      font-weight: 700;
      line-height: 1.05;
    }
  `,
})
export class StorePageHeader {
  readonly title = input.required<string>();
  readonly kicker = input('');
}
