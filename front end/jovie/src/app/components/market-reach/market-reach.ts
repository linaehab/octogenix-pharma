import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CxIcon } from '../cx-icon/cx-icon';

/**
 * About page: the healthcare channels the company works with. Same family as the reference's
 * "Holding company structure" block (title and short text over light grey icon cards); here the
 * text sits beside the title, and each card carries its icon on a white disc and a lime index.
 */
@Component({
  selector: 'app-market-reach',
  imports: [TranslatePipe, CxIcon],
  template: `
    <section class="market section-wrap" aria-labelledby="market-title">
      <div class="market-head">
        <h2 id="market-title">{{ 'market.title' | translate }}</h2>
        <p>{{ 'market.description' | translate }}</p>
      </div>
      <ul class="market-grid">
        @for (channel of channels; track channel.key; let index = $index) {
          <li class="market-card">
            <span class="market-index" aria-hidden="true">0{{ index + 1 }}</span>
            <span class="market-icon"><app-cx-icon [name]="channel.icon" /></span>
            <h3>{{ 'market.' + channel.key | translate }}</h3>
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

    .market {
      padding-bottom: var(--cx-section);
    }

    .market-head {
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      align-items: end;
      gap: clamp(20px, 4vw, 64px);
      margin-bottom: clamp(24px, 3vw, 36px);
    }

    h2 {
      margin: 0;
      font-size: clamp(26px, 2.6vw, 34px);
      line-height: 1.15;
    }

    .market-head p {
      max-width: 620px;
      margin: 0;
      color: var(--cx-slate);
      font-size: 15px;
      line-height: 1.75;
    }

    .market-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 18px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .market-card {
      position: relative;
      display: grid;
      align-content: start;
      justify-items: center;
      gap: 18px;
      min-height: 210px;
      padding: 34px 22px 28px;
      overflow: hidden;
      border-radius: var(--cx-radius);
      background: var(--cx-cloud);
      text-align: center;
      transition: background 320ms ease;
    }

    /* Lime rule along the bottom edge that fills in on hover */
    .market-card::after {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      height: 3px;
      background: var(--cx-azure);
      content: '';
      transform: scaleX(0.18);
      transition: transform 420ms var(--cx-ease);
    }

    .market-card:hover::after {
      transform: scaleX(1);
    }

    .market-index {
      position: absolute;
      top: 14px;
      inset-inline-start: 16px;
      color: #78992a;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .market-icon {
      display: grid;
      width: 84px;
      height: 84px;
      place-items: center;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 14px 28px -22px rgba(43, 44, 45, 0.55);
    }

    app-cx-icon {
      --cx-icon-size: 46px;
    }

    h3 {
      margin: 0;
      color: var(--cx-ink);
      font-size: 17px;
      font-weight: 700;
      line-height: 1.35;
      text-transform: none;
    }

    @media (max-width: 1060px) {
      .market-head {
        grid-template-columns: minmax(0, 1fr);
      }

      .market-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 520px) {
      .market-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .market-card {
        min-height: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .market-card::after {
        transition: none;
      }
    }
  `,
})
export class MarketReach {
  protected readonly channels = [
    { key: 'pharmacies', icon: 'pharmacy' },
    { key: 'distributors', icon: 'delivery' },
    { key: 'hospitals', icon: 'hospital' },
    { key: 'clinics', icon: 'clinic' },
  ] as const;
}
