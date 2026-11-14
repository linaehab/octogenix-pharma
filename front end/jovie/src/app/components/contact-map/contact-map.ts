import { Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Pin position on /assets/images/corporate-v3/location-map.svg, as a percentage of the image.
 * The map is an equirectangular crop (20°W–80°E, 0°–64°N) drawn from Natural Earth land data;
 * the pin is New Damietta, Damietta, Egypt: 31.4368°N, 31.667°E (city coordinates).
 */
const PIN = { left: 51.67, top: 50.88 };

/**
 * Contact page: the company location on a light, flat map in the reference style (grey land,
 * grey pin with a lime mark, the city in small grey type and the country in bold capitals).
 */
@Component({
  selector: 'app-contact-map',
  imports: [TranslatePipe],
  template: `
    <section class="location section-wrap" aria-labelledby="location-title">
      <div class="location-copy">
        <p class="eyebrow"><span></span>{{ 'contact.addressLabel' | translate }}</p>
        <h2 id="location-title">{{ place().country }}</h2>
        <p>{{ 'contact.address' | translate }}</p>
      </div>
      <div class="map">
        <img src="/assets/images/corporate-v3/location-map.svg" [alt]="'contact.address' | translate" width="1000" height="755" loading="lazy" />
        <div class="pin" [style.left.%]="pin.left" [style.top.%]="pin.top">
          <svg viewBox="0 0 40 52" aria-hidden="true">
            <path d="M20 51S3 31 3 19a17 17 0 0 1 34 0c0 12-17 32-17 32z" fill="#8c8f92" />
            <circle cx="20" cy="19" r="11" fill="#fff" />
            <path d="M20 26s-7-4.2-7-9a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 4.8-7 9-7 9z" fill="none" stroke="#b0d35b" stroke-width="2.2" stroke-linejoin="round" />
          </svg>
          <span class="pin-label">
            <small>{{ place().city }}</small>
            <strong>{{ place().country }}</strong>
          </span>
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      background: #fff;
    }

    .location {
      display: grid;
      grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
      align-items: center;
      gap: clamp(28px, 4vw, 56px);
      padding-block: var(--cx-section);
    }

    h2 {
      margin: 16px 0 12px;
      font-size: clamp(26px, 2.6vw, 34px);
    }

    .location-copy > p:last-child {
      margin: 0;
      padding: 18px 20px;
      border-radius: var(--cx-radius);
      color: var(--cx-slate);
      background: var(--cx-cloud);
      font-size: 14px;
    }

    .map {
      position: relative;
    }

    .map img {
      display: block;
      width: 100%;
      height: auto;
    }

    .pin {
      position: absolute;
      width: 34px;
      transform: translate(-50%, -100%);
    }

    .pin svg {
      display: block;
      width: 34px;
      height: auto;
      filter: drop-shadow(0 6px 6px rgba(43, 44, 45, 0.25));
    }

    .pin-label {
      position: absolute;
      bottom: 100%;
      left: 50%;
      display: grid;
      margin-bottom: 6px;
      color: var(--cx-ink);
      line-height: 1.15;
      text-align: center;
      transform: translateX(-50%);
      white-space: nowrap;
    }

    .pin-label small {
      color: var(--cx-gray);
      font-size: 13px;
    }

    .pin-label strong {
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
    }

    @media (max-width: 860px) {
      .location {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ContactMap {
  private readonly language = inject(LanguageService);
  protected readonly pin = PIN;

  /** City and country, taken from the company address ("…, New Damietta, Damietta, Egypt."). */
  protected readonly place = computed(() => {
    this.language.currentLanguage();
    const parts = this.language
      .translate('contact.address')
      .split(/[,،]/)
      .map((part) => part.trim().replace(/[.。]$/, ''))
      .filter(Boolean);
    return { city: parts.at(-3) ?? '', country: parts.at(-1) ?? '' };
  });
}
