import type { MapRegion } from './world-map-data';

export interface MarketInfo {
  region: MapRegion;
  /** Countries listed in the popup (translation keys), as on the official map. */
  countries?: string[];
  /** Contact e-mail published on the official map; Egypt shows the Octogenix settings instead. */
  email?: string;
  usesDistributorContacts?: boolean;
  /** External website, or this store's contact page for Egypt. */
  link: { href: string; label: string; external: boolean };
}

/**
 * Markets in legend order. Europe, Middle East and Southeast Asia: as published on the official
 * jovieproducts.com/where-to-find map. Egypt: this store, with the Octogenix Pharma details.
 */
export const MAP_MARKETS: MarketInfo[] = [
  {
    region: 'europe',
    email: 'sayhello@jovieproducts.eu',
    link: { href: 'https://jovieproducts.eu', label: 'jovie.where.visitWebsite', external: true },
  },
  {
    region: 'middle-east',
    countries: ['jovie.where.country.ae', 'jovie.where.country.sa', 'jovie.where.country.eg', 'jovie.where.country.om'],
    email: 'sayhello-me@jovieproducts.com',
    link: { href: 'https://jovieproducts.com/ae-en', label: 'jovie.where.visitWebsite', external: true },
  },
  {
    region: 'southeast-asia',
    email: 'sayhello@jovieproducts.com',
    link: { href: 'https://jovie.vn/', label: 'jovie.where.visitWebsite', external: true },
  },
  {
    region: 'egypt',
    usesDistributorContacts: true,
    link: { href: '/jovie/contact', label: 'jovie.where.contactUs', external: false },
  },
];
