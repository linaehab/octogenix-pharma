import { Component } from '@angular/core';
import { WHY_IMAGES } from '../../data/why-content';
import { injectWhyContent } from './why-content';

/** "The Jovie Spirit" (official cta-block--3): masked photo and the brand story. */
@Component({
  selector: 'app-why-spirit',
  template: `
    <section id="aboutJovie" class="spirit" aria-labelledby="jovie-why-spirit">
      <div class="jv-container layout">
        <div class="image">
          <div class="mask"><img [src]="image" [alt]="content().spirit.title" loading="lazy" /></div>
        </div>
        <div class="caption">
          <h3 id="jovie-why-spirit">{{ content().spirit.title }}</h3>
          <p class="lead"><strong>{{ content().spirit.lead }}</strong></p>
          @for (paragraph of content().spirit.paragraphs; track $index) {
            <p>{{ paragraph }}</p>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .spirit { padding-block: clamp(5rem, 11vw, 10rem); }
    .layout { display: grid; grid-template-columns: 6fr 5fr; align-items: center; gap: 8%; }
    .image { position: relative; }
    .image::before { content: ''; position: absolute; z-index: 1; top: 0; left: 0; width: 110px; height: 120px; background: url('/assets/images/jovie/official/patterns/cta-3.svg') no-repeat center / contain; }
    .mask { clip-path: url(#jv-ctaImage); }
    .mask img { display: block; width: 100%; height: auto; }
    h3 { margin: 0 0 1.5rem; font-size: clamp(2rem, 3.6vw, 3rem); font-weight: 700; line-height: 1.15; }
    .lead { margin: 0 0 1.5rem; font-size: 1.05rem; line-height: 1.55; }
    p { margin: 0 0 1rem; font-size: 1rem; line-height: 1.5; }
    @media (max-width: 991px) { .layout { grid-template-columns: 1fr; } .image { margin-bottom: 2rem; } .image::before { display: none; } }
  `,
})
export class WhySpirit {
  protected readonly content = injectWhyContent();
  protected readonly image = WHY_IMAGES.spirit;
}
