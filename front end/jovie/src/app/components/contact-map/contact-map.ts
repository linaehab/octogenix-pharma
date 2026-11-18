import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { DOCUMENT } from '@angular/common';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Company location as supplied by the company (Google Maps: 31°26'35.7"N 31°39'52.5"E,
 * 128/4, Building 14, District 3, Neighborhood 14, New Damietta). The dashboard manages it
 * (Website → Company information); these values are used until the settings load.
 */
const DEFAULT_LOCATION: [number, number] = [31.44325, 31.664583];
const DEFAULT_MAPS_URL = 'https://maps.app.goo.gl/s75MFAW9BD1c9Y189';
const START_ZOOM = 15;

/** The same grey pin with a lime mark as the previous static map. */
const PIN_SVG = `<svg viewBox="0 0 40 52" aria-hidden="true">
  <path d="M20 51S3 31 3 19a17 17 0 0 1 34 0c0 12-17 32-17 32z" fill="#8c8f92" />
  <circle cx="20" cy="19" r="11" fill="#fff" />
  <path d="M20 26s-7-4.2-7-9a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 4.8-7 9-7 9z" fill="none" stroke="#b0d35b" stroke-width="2.2" stroke-linejoin="round" />
</svg>`;

/**
 * Contact page: the company location on an interactive map (Leaflet + OpenStreetMap), drawn in
 * the light grey of the previous flat map, with the grey pin and lime mark. Visitors can zoom and
 * move the map; the pin opens the company address. Leaflet is loaded in the browser only.
 *
 * Leaflet's stylesheet is copied to /assets/vendor/leaflet/ at build time and linked only when
 * the map is created. Encapsulation is off so the rules below reach the elements Leaflet builds;
 * every rule is therefore scoped under app-contact-map.
 */
@Component({
  selector: 'app-contact-map',
  imports: [TranslatePipe],
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="location section-wrap" aria-labelledby="location-title">
      <div class="location-copy">
        <p class="eyebrow"><span></span>{{ 'contact.addressLabel' | translate }}</p>
        <h2 id="location-title">{{ place().country }}</h2>
        <p>{{ 'contact.address' | translate }}</p>
      </div>
      <div class="map" #map role="region" [attr.aria-label]="'contact.address' | translate"></div>
    </section>
  `,
  styles: `
    app-contact-map {
      display: block;
      background: #fff;
    }

    app-contact-map .location {
      display: grid;
      grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
      align-items: center;
      gap: clamp(28px, 4vw, 56px);
      padding-block: var(--cx-section);
    }

    app-contact-map h2 {
      margin: 16px 0 12px;
      font-size: clamp(26px, 2.6vw, 34px);
    }

    app-contact-map .location-copy > p:last-child {
      margin: 0;
      padding: 18px 20px;
      border-radius: var(--cx-radius);
      color: var(--cx-slate);
      background: var(--cx-cloud);
      font-size: 14px;
    }

    /* Same box as the previous map image (1000 × 755) */
    app-contact-map .map {
      position: relative;
      z-index: 0;
      width: 100%;
      aspect-ratio: 1000 / 755;
      overflow: hidden;
      border-radius: var(--cx-radius-lg); /* same curve as the site's large cards */
      background: var(--cx-cloud);
      font-family: var(--cx-font);
    }

    /* Light grey streets, like the previous flat map */
    app-contact-map .leaflet-tile-pane {
      filter: grayscale(1) contrast(0.88) brightness(1.06);
    }

    app-contact-map .leaflet-container a {
      color: var(--cx-royal);
    }

    app-contact-map .leaflet-bar {
      border: 0;
      border-radius: 8px;
      box-shadow: 0 8px 20px -12px rgba(43, 44, 45, 0.55);
    }

    app-contact-map .leaflet-bar a,
    app-contact-map .leaflet-bar a:hover {
      width: 34px;
      height: 34px;
      color: var(--cx-ink);
      line-height: 34px;
    }

    app-contact-map .leaflet-bar a:hover {
      background: var(--cx-ice);
    }

    app-contact-map .cx-pin {
      background: none;
      border: 0;
    }

    app-contact-map .cx-pin svg {
      display: block;
      width: 34px;
      height: auto;
      filter: drop-shadow(0 6px 6px rgba(43, 44, 45, 0.25));
      cursor: pointer;
    }

    app-contact-map .cx-popup .leaflet-popup-content-wrapper {
      border-radius: var(--cx-radius);
      box-shadow: 0 18px 40px -20px rgba(43, 44, 45, 0.6);
    }

    app-contact-map .cx-popup .leaflet-popup-content {
      display: grid;
      gap: 6px;
      max-width: 240px;
      margin: 16px 18px;
      color: var(--cx-slate);
      font-size: 13px;
      line-height: 1.5;
    }

    app-contact-map .cx-popup strong {
      color: var(--cx-ink);
      font-size: 15px;
    }

    app-contact-map .cx-popup a {
      font-weight: 600;
    }

    @media (max-width: 860px) {
      app-contact-map .location {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ContactMap {
  private readonly language = inject(LanguageService);
  private readonly content = inject(SiteContentService);
  private readonly document = inject(DOCUMENT);
  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');
  private map?: LeafletMap;
  private marker?: Marker;

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

  /** The company location from the settings; an invalid pair keeps the supplied location. */
  private readonly location = computed<[number, number]>(() => {
    const lat = Number(this.content.setting<number | string>('contact.map_latitude', DEFAULT_LOCATION[0]));
    const lng = Number(this.content.setting<number | string>('contact.map_longitude', DEFAULT_LOCATION[1]));
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : DEFAULT_LOCATION;
  });

  /** The Google Maps link of the pin's popup (https only). */
  private readonly mapsUrl = computed(() => {
    const url = this.content.setting<string>('contact.map_url', DEFAULT_MAPS_URL);
    return typeof url === 'string' && url.startsWith('https://') ? url : DEFAULT_MAPS_URL;
  });

  private readonly popupHtml = computed(() => {
    this.language.currentLanguage();
    const text = (key: string) => escapeHtml(this.language.translate(key));
    const open = this.language.currentLanguage() === 'ar' ? 'افتح في خرائط Google' : 'Open in Google Maps';
    return `<strong>${text('company.name')}</strong><span>${text('contact.address')}</span>
      <a href="${escapeHtml(this.mapsUrl())}" target="_blank" rel="noopener noreferrer">${open} ↗</a>`;
  });

  constructor() {
    afterNextRender(() => void this.createMap());
    inject(DestroyRef).onDestroy(() => this.map?.remove());
    // Keep the popup text in the current language
    effect(() => {
      const html = this.popupHtml();
      this.marker?.setPopupContent(html);
    });
    // A location saved in the dashboard arrives after the map may already be drawn
    effect(() => {
      const location = this.location();
      this.marker?.setLatLng(location);
      this.map?.setView(location, this.map.getZoom());
    });
  }

  private async createMap(): Promise<void> {
    this.linkLeafletStyles();
    // Leaflet is CommonJS: the bundler exposes it as the module's default export.
    const leaflet = await import('leaflet');
    const L = (leaflet as unknown as { default?: typeof leaflet }).default ?? leaflet;
    const element = this.mapElement().nativeElement;
    if (this.map || !element.isConnected) return;

    const map = L.map(element, {
      center: this.location(),
      zoom: START_ZOOM,
      minZoom: 3,
      maxZoom: 19,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);

    // The mouse wheel zooms only once the visitor has clicked the map, so the page still scrolls.
    map.on('click focus', () => map.scrollWheelZoom.enable());
    map.on('mouseout blur', () => map.scrollWheelZoom.disable());

    const icon = L.divIcon({ className: 'cx-pin', html: PIN_SVG, iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -40] });
    this.marker = L.marker(this.location(), { icon, keyboard: true, title: this.language.translate('company.name') })
      .addTo(map)
      .bindPopup(this.popupHtml(), { className: 'cx-popup', autoPanPaddingTopLeft: [56, 16], autoPanPaddingBottomRight: [16, 16] });
    this.map = map;
  }

  private linkLeafletStyles(): void {
    const href = '/assets/vendor/leaflet/leaflet.css';
    if (this.document.head.querySelector(`link[href="${href}"]`)) return;
    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    this.document.head.appendChild(link);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
