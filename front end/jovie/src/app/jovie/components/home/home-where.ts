import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { HOME_IMAGES } from '../../data/home-content';
import { injectHomeContent } from './home-content';

/**
 * "Where to Find Jovie Goat" (official cta-block--2): green, a masked photo and the text in a white
 * blob. The text is the Egyptian one (Octogenix Pharma), not the official "several countries".
 */
@Component({
  selector: 'app-home-where',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="where" aria-labelledby="jovie-home-where">
      <div class="jv-container layout">
        <div class="image">
          <div class="mask"><img [src]="image" alt="" width="1040" height="1120" loading="lazy" /></div>
        </div>
        <div class="caption">
          <p class="kicker">{{ content().where.kicker }}</p>
          <h2 id="jovie-home-where">{{ content().where.title }}</h2>
          <p class="text">{{ 'jovie.where.description' | translate }}</p>
          <a class="jv-button" routerLink="/jovie/where-to-find">{{ 'jovie.where.findCta' | translate }}</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .where { position: relative; overflow: hidden; padding-block: 5.62rem; background: var(--jv-green) url('/assets/images/jovie/official/home/block-pattern-2.svg') no-repeat left top / 100% 100%; color: var(--jv-night); clip-path: url(#jv-ctaBackground2); }
    .layout { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 4fr); align-items: center; gap: 2.25rem 1.12rem; }
    .image { position: relative; }
    .image::before { content: ''; position: absolute; z-index: 1; bottom: 1.91rem; left: 0; width: 9.22rem; height: 7.26rem; background: url('/assets/images/jovie/official/home/cta-pattern-2.svg') no-repeat center / contain; }
    :host-context([dir='rtl']) .image::before { right: 0; left: auto; transform: scaleX(-1); }
    .mask { clip-path: url(#jv-ctaImage2); }
    .mask img { display: block; width: 100%; height: auto; }
    .caption { position: relative; z-index: 1; padding: 1.12rem 0 0.56rem; text-align: center; }
    .caption::before { content: ''; position: absolute; z-index: -1; inset: -5.51rem -5.85rem 0.62rem; background: var(--jv-white); clip-path: url(#jv-ctaCaption); }
    .kicker { margin: 0 0 0.34rem; font-size: 1.52rem; font-weight: 700; line-height: 1.25; }
    h2 { margin: 0 0 1.69rem; font-size: clamp(2.25rem, 3.4vw, 3.09rem); font-weight: 700; line-height: 1.15; }
    .text { margin: 0 0 3.49rem; font-size: 1.07rem; line-height: 1.6; }
    .caption .jv-button { border-radius: 2px; }
    @media (max-width: 991px) {
      .where { padding-block: 10.12rem 4.5rem; background-image: none; }
      .layout { grid-template-columns: 1fr; gap: 5.62rem; }
      .caption { order: -1; padding-inline: 1.69rem; }
      .caption::before { inset-inline: 0; }
      .image { max-width: 36rem; margin-inline: auto; }
      .image::before { display: none; }
    }
  `,
})
export class HomeWhere {
  protected readonly content = injectHomeContent();
  protected readonly image = HOME_IMAGES.where;
}
