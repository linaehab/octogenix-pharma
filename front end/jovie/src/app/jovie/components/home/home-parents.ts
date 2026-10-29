import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HOME_IMAGES } from '../../data/home-content';
import { injectHomeContent } from './home-content';

/** "Just Like You We Are Parents Too" (official cta-block--1): navy, text and a masked photo. */
@Component({
  selector: 'app-home-parents',
  imports: [RouterLink],
  template: `
    <section class="parents" aria-labelledby="jovie-home-parents">
      <div class="jv-container layout">
        <div class="caption">
          <h2 id="jovie-home-parents">{{ content().parents.title }}</h2>
          @for (paragraph of content().parents.paragraphs; track $index) {
            <p>{{ paragraph }}</p>
          }
          <a class="jv-button" routerLink="/jovie/why">{{ content().parents.button }}</a>
          <p class="arrow jv-handwritten" aria-hidden="true">{{ content().parents.more }}</p>
        </div>
        <div class="image">
          <div class="mask"><img [src]="image" alt="" width="1040" height="1120" loading="lazy" /></div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .parents { position: relative; overflow: hidden; padding-block: clamp(5.62rem, 9vw, 8.44rem); background: var(--jv-night) url('/assets/images/jovie/official/home/block-pattern-1.svg') no-repeat right top / 100% 100%; color: var(--jv-white); clip-path: url(#jv-ctaBackground); }
    .layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: center; gap: 2.25rem; }
    h2 { max-width: 29.25rem; margin: 0 0 1.97rem; font-size: clamp(2.48rem, 4.4vw, 3.82rem); font-weight: 700; line-height: 1.1; }
    .caption p:not(.arrow) { max-width: 29.25rem; margin: 0 0 1.57rem; font-size: 1.12rem; line-height: 1.6; }
    .caption .jv-button { margin-top: 1.41rem; border-radius: 2px; }
    .arrow { margin: 2.02rem 0 0 5.17rem; padding: 1.12rem 0 0 4.27rem; font-size: 1.97rem; line-height: 3.94rem; background: url('/assets/images/jovie/official/home/cta-arrow.svg') no-repeat 0 0; }
    :host-context([dir='rtl']) .arrow { margin: 2.02rem 5.17rem 0 0; padding: 1.12rem 4.27rem 0 0; background-image: url('/assets/images/jovie/official/home/cta-arrow-flipped.svg'); background-position: 100% 0; }
    .image { position: relative; }
    .image::before { content: ''; position: absolute; z-index: 1; top: -3.83rem; left: 5.85rem; width: 4.44rem; height: 6.3rem; background: url('/assets/images/jovie/official/home/cta-pattern-1.svg') no-repeat center / contain; }
    :host-context([dir='rtl']) .image::before { right: 5.85rem; left: auto; transform: scaleX(-1); }
    .mask { clip-path: url(#jv-ctaImage); }
    .mask img { display: block; width: 100%; height: auto; }
    @media (max-width: 991px) {
      .parents { background-size: 220% 100%; background-position: 0 150px; }
      .layout { grid-template-columns: 1fr; gap: 4.5rem; }
      .caption { text-align: center; }
      h2, .caption p:not(.arrow) { margin-inline: auto; }
      .arrow { display: none; }
      .image::before { top: 0; left: 0; width: 4.05rem; height: 5.91rem; }
    }
  `,
})
export class HomeParents {
  protected readonly content = injectHomeContent();
  protected readonly image = HOME_IMAGES.parents;
}
