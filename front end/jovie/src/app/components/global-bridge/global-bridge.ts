import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * About page: the company statement, laid out like the reference's slogan block — a light grey
 * card with the title and two paragraphs on one side and a rounded photograph on the other.
 * Photograph: supplied by the project team (src/assets/images/health.jpg), as WebP.
 */
@Component({
  selector: 'app-global-bridge',
  imports: [TranslatePipe],
  template: `
    <section class="bridge-wrap section-wrap" aria-labelledby="bridge-title">
      <div class="bridge">
        <div class="bridge-copy">
          <h2 id="bridge-title">{{ 'bridge.title' | translate }}</h2>
          <p>{{ 'bridge.textOne' | translate }}</p>
          <p>{{ 'bridge.textTwo' | translate }}</p>
        </div>
        <figure class="bridge-figure">
          <img
            src="/assets/images/corporate-v3/health-tablet.webp"
            [alt]="'bridge.imageAlt' | translate"
            width="1216"
            height="873"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      background: #fff;
    }

    .bridge-wrap {
      padding-top: var(--cx-section);
    }

    .bridge {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: stretch;
      overflow: hidden;
      border-radius: var(--cx-radius-lg);
      background: var(--cx-cloud);
    }

    .bridge-copy {
      align-self: center;
      padding: clamp(32px, 4.4vw, 64px);
    }

    h2 {
      margin: 0 0 20px;
      font-size: clamp(24px, 2.3vw, 32px);
      line-height: 1.2;
    }

    p {
      margin: 0;
      color: var(--cx-slate);
      font-size: 15px;
      line-height: 1.75;
    }

    p + p {
      margin-top: 14px;
    }

    .bridge-figure {
      position: relative;
      min-height: 380px;
      margin: 0;
    }

    .bridge-figure img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 62% 12%;
      border-radius: var(--cx-radius-lg);
    }

    @media (max-width: 900px) {
      .bridge {
        grid-template-columns: minmax(0, 1fr);
      }

      .bridge-figure {
        min-height: 0;
        aspect-ratio: 3 / 2;
      }
    }
  `,
})
export class GlobalBridge {}
