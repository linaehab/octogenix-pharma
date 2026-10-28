import { Component } from '@angular/core';
import { WHY_IMAGES } from '../../data/why-content';
import { injectWhyContent } from './why-content';

/** "Jovie Goat Chooses Organic" (official cta-block--4): navy, with the official blob behind the text. */
@Component({
  selector: 'app-why-organic',
  template: `
    <section class="organic" aria-labelledby="jovie-why-organic">
      <svg class="blob" viewBox="0 0 1280 800" preserveAspectRatio="xMinYMin slice" aria-hidden="true" focusable="false">
        <path d="M905.796817,519.196502 C840.928809,730.832162 574.67204,865.159854 488.446853,900.741548 C402.192167,936.323242 71.7901121,1045.78826 -234.629364,797.631289 C-359.571814,696.412622 -414.05622,513.744268 -420.82621,439.094419 C-427.610949,364.432207 -464.853268,175.174193 -172.313009,20.718982 C120.183003,-133.723866 334.71351,-168.996476 505.216958,-104.051849 C675.720407,-39.1319486 742.697584,48.2645043 806.54788,119.464981 C879.94106,201.297931 970.650075,307.560841 905.796817,519.196502 Z" />
      </svg>
      <div class="jv-container layout">
        <div class="caption">
          <h3 id="jovie-why-organic">{{ content().organic.title }}</h3>
          @for (paragraph of content().organic.paragraphs; track $index) {
            <p>{{ paragraph }}</p>
          }
        </div>
        <div class="image">
          <div class="mask"><img [src]="image" alt="" loading="lazy" /></div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .organic { position: relative; overflow: hidden; padding-block: clamp(5rem, 9vw, 7.5rem); background: var(--jv-night); color: var(--jv-white); }
    .blob { position: absolute; inset: 0; width: 100%; height: 100%; }
    .blob path { fill: #2b3d6d; }
    .layout { position: relative; display: grid; grid-template-columns: 5fr 6fr; align-items: center; gap: 8%; }
    h3 { margin: 0 0 1.5rem; font-size: clamp(2rem, 3.6vw, 3rem); font-weight: 700; line-height: 1.15; }
    p { max-width: 26rem; margin: 0 0 1.5rem; font-size: 1rem; line-height: 1.5; }
    .image { position: relative; }
    .image::before { content: ''; position: absolute; z-index: 1; right: 0; bottom: 0; width: 110px; height: 120px; background: url('/assets/images/jovie/official/patterns/cta-4.svg') no-repeat center / contain; }
    :host-context([dir='rtl']) .image::before { right: auto; left: 0; transform: scaleX(-1); }
    .mask { clip-path: url(#jv-ctaImage2); }
    .mask img { display: block; width: 100%; height: auto; }
    @media (max-width: 991px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class WhyOrganic {
  protected readonly content = injectWhyContent();
  protected readonly image = WHY_IMAGES.organic;
}
