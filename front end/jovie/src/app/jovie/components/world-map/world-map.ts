import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { contactEmail, contactPhones } from '../../../core/content/contact-details';
import { SiteContentService } from '../../../core/content/site-content.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { MAP_MARKETS } from './map-markets';
import { MapRegion, REGION_ANCHORS, WORLD_COUNTRIES, WORLD_MAP_VIEWBOX } from './world-map-data';

/** Official Jovie contact page, offered for the regions where Jovie is not sold yet. */
export const JOVIE_GLOBAL_CONTACT = 'https://jovieproducts.com/contact/';

/**
 * World map after the official jovieproducts.com "Where to find" page: its regions, with Europe,
 * the Middle East and Southeast Asia lit in the official colours, plus Egypt for this store.
 * Clicking a region (or a legend entry) highlights the whole region and opens its popup.
 * With `interactive` false (home summary) it is a static picture.
 */
@Component({
  selector: 'app-world-map',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './world-map.html',
  styleUrl: './world-map.css',
  host: { '(document:keydown.escape)': 'close()' },
})
export class WorldMap {
  private readonly content = inject(SiteContentService);

  readonly interactive = input(true);

  protected readonly viewBox = WORLD_MAP_VIEWBOX;
  protected readonly countries = WORLD_COUNTRIES;
  protected readonly markets = MAP_MARKETS;
  protected readonly globalContact = JOVIE_GLOBAL_CONTACT;

  protected readonly selected = signal<MapRegion | null>(null);

  protected readonly popup = computed(() => {
    const region = this.selected();
    if (!region) {
      return null;
    }
    const [left, top] = REGION_ANCHORS[region];
    const market = this.markets.find((m) => m.region === region);
    return {
      region,
      left: Math.min(86, Math.max(14, left)),
      top,
      market: market && {
        countries: market.countries ?? [],
        phones: market.usesDistributorContacts ? contactPhones(this.content) : [],
        emails: market.usesDistributorContacts ? [contactEmail(this.content)] : market.email ? [market.email] : [],
        link: market.link,
      },
    };
  });

  protected isMarket(region: MapRegion): boolean {
    return this.markets.some((m) => m.region === region);
  }

  protected onMapClick(event: MouseEvent): void {
    if (!this.interactive()) {
      return;
    }
    const country = (event.target as Element).closest('path');
    if (!country) {
      this.close();
      return;
    }
    this.selected.set(country.getAttribute('data-region') as MapRegion);
  }

  protected toggle(region: MapRegion): void {
    this.selected.update((current) => (current === region ? null : region));
  }

  protected close(): void {
    this.selected.set(null);
  }
}
