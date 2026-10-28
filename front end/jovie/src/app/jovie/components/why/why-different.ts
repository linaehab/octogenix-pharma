import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WHY_IMAGES, WHY_LINKS } from '../../data/why-content';
import { injectWhyContent } from './why-content';

/** "Jovie Goat is Different" (official organic-block): alternating masked photos and texts on grey. */
@Component({
  selector: 'app-why-different',
  imports: [RouterLink],
  template: `
    <section id="organic" class="different" aria-labelledby="jovie-why-different">
      <div class="background" aria-hidden="true"></div>
      <div class="jv-container">
        <h3 id="jovie-why-different" class="title">{{ content().different.title }}</h3>
        @for (item of content().different.items; track item.key) {
          <div class="row" [class.reverse]="$index % 2 === 1">
            <div class="image">
              <div class="mask" [class.alt]="$index % 2 === 1"><img [src]="images[item.key]" alt="" loading="lazy" /></div>
            </div>
            <div class="caption">
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
              <a class="jv-link jv-link--small" [routerLink]="links[item.key]">{{ item.more }}</a>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .different { position: relative; padding-block: clamp(5rem, 11vw, 10rem) 1.5rem; scroll-margin-top: 4rem; }
    .different::after { content: ''; position: absolute; z-index: 1; right: -20px; bottom: -30px; width: 172px; height: 159px; background: url('/assets/images/jovie/official/patterns/organic.svg') no-repeat center / contain; transform: rotate(-15deg); }
    :host-context([dir='rtl']) .different::after { right: auto; left: -20px; transform: rotate(15deg); }
    .background { position: absolute; inset: 0; background: var(--jv-panel); clip-path: url(#jv-organicBlock); }
    .jv-container { position: relative; }
    .title { margin: 0 0 clamp(3rem, 7vw, 5.5rem); text-align: center; font-size: clamp(2rem, 3.6vw, 3rem); font-weight: 700; }
    .row { display: grid; grid-template-columns: 6fr 4fr; align-items: center; justify-content: space-between; gap: 10%; margin-bottom: 5rem; }
    .row.reverse .image { order: 2; }
    .mask { display: block; clip-path: url(#jv-organicImage1); }
    .mask.alt { clip-path: url(#jv-organicImage2); }
    .mask img { display: block; width: 100%; height: auto; }
    .caption h3 { margin: 0 0 1rem; font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 700; line-height: 1.15; }
    .caption p { margin: 0 0 1.5rem; font-size: 1rem; line-height: 1.5; }
    @media (max-width: 991px) { .row { grid-template-columns: 1fr; gap: 2rem; } .row.reverse .image { order: 0; } }
  `,
})
export class WhyDifferent {
  protected readonly content = injectWhyContent();
  protected readonly images = WHY_IMAGES.different;
  protected readonly links = WHY_LINKS.different;
}
