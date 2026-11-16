import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CxIcon } from '../cx-icon/cx-icon';

/**
 * About page: the company's areas of focus, laid out like the reference's "Holding company
 * structure" block (a title over light grey cards, each with a centred duotone icon), with the
 * four business areas in place of the reference's figures.
 */
@Component({
  selector: 'app-focus-areas',
  imports: [TranslatePipe, CxIcon],
  template: `
    <section class="focus section-wrap" aria-labelledby="focus-title">
      <h2 id="focus-title">{{ 'focus.title' | translate }}</h2>
      <ul class="focus-grid">
        @for (area of areas; track area) {
          <li class="focus-card">
            <app-cx-icon [name]="area" />
            <h3>{{ 'focus.' + area + '.title' | translate }}</h3>
            <p>{{ 'focus.' + area + '.text' | translate }}</p>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: block;
      background: #fff;
    }

    .focus {
      padding-block: var(--cx-section);
    }

    h2 {
      margin: 0 0 clamp(24px, 3vw, 36px);
      font-size: clamp(26px, 2.6vw, 34px);
    }

    .focus-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 18px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .focus-card {
      display: grid;
      align-content: start;
      justify-items: center;
      gap: 10px;
      padding: 32px 22px 30px;
      border-radius: var(--cx-radius);
      background: var(--cx-cloud);
      text-align: center;
      transition: transform 320ms var(--cx-ease), box-shadow 320ms ease;
    }

    .focus-card:hover {
      box-shadow: 0 18px 36px -26px rgba(43, 44, 45, 0.45);
      transform: translateY(-3px);
    }

    app-cx-icon {
      --cx-icon-size: 52px;
      margin-bottom: 8px;
    }

    h3 {
      margin: 0;
      color: var(--cx-ink);
      font-size: 17px;
      font-weight: 700;
      line-height: 1.3;
      text-transform: none;
    }

    p {
      max-width: 240px;
      margin: 0;
      color: var(--cx-gray);
      font-size: 13.5px;
      line-height: 1.6;
    }

    @media (max-width: 1060px) {
      .focus-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 520px) {
      .focus-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .focus-card {
        transition: none;
      }
    }
  `,
})
export class FocusAreas {
  protected readonly areas = ['medicine', 'supplement', 'infant', 'partnership'] as const;
}
