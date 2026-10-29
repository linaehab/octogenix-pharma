import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HOME_IMAGES } from '../../data/home-content';
import { injectHomeContent } from './home-content';

/** "The Jovie Goat Solution" (official fast-facts): three grey blob cards linking to Why Jovie Goat. */
@Component({
  selector: 'app-home-solution',
  imports: [RouterLink],
  template: `
    <section class="solution" aria-labelledby="jovie-home-solution">
      <div class="jv-container">
        <div class="head">
          <h2 id="jovie-home-solution">{{ content().solution.title }}</h2>
          <p>{{ content().solution.intro }}</p>
        </div>
        <ul class="cards">
          @for (card of content().solution.cards; track $index) {
            <li>
              <a class="card" routerLink="/jovie/why">
                <img [src]="icons[$index]" alt="" loading="lazy" />
                <span class="caption">
                  <span class="card-title">{{ card.title }}</span>
                  <span class="card-text">{{ card.text }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    .solution { padding-block: clamp(4.5rem, 9vw, 8.44rem) clamp(3.38rem, 6vw, 5.06rem); }
    .head { max-width: 40.5rem; margin: 0 auto clamp(3.38rem, 6vw, 5.06rem); text-align: center; }
    h2 { margin: 0 0 1.69rem; font-size: clamp(2.25rem, 3.6vw, 3.38rem); font-weight: 700; line-height: 1.15; }
    .head p { margin: 0; font-size: 1.12rem; line-height: 1.6; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 2.25rem; margin: 0; padding: 0; list-style: none; }
    .card { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 21.26rem; margin-bottom: 2.98rem; background: var(--jv-panel); text-align: center; clip-path: url(#jv-fastFact); transition: background 0.3s ease; }
    .card:hover { background: #eaecf3; }
    .card img { max-width: 8.44rem; max-height: 6.19rem; }
    :host-context([dir='rtl']) .card img { transform: scaleX(-1); }
    .caption { display: flex; flex-direction: column; margin-top: 1.01rem; padding: 0 3.26rem; }
    .card-title { margin-bottom: 0.62rem; font-size: 1.46rem; font-weight: 700; line-height: 1.2; }
    .card-text { font-size: 1.01rem; line-height: 1.5; }
    @media (max-width: 991px) { .cards { grid-template-columns: 1fr; max-width: 27rem; margin-inline: auto; } }
  `,
})
export class HomeSolution {
  protected readonly content = injectHomeContent();
  protected readonly icons = HOME_IMAGES.solution;
}
