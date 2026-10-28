import { Routes } from '@angular/router';
import { CorporateLayout } from './layouts/corporate-layout/corporate-layout';
import { AboutPage } from './pages/about-page/about-page';
import { BrandsPage } from './pages/brands-page/brands-page';
import { ContactPage } from './pages/contact-page/contact-page';
import { HomePage } from './pages/home-page/home-page';
import { ServicesPage } from './pages/services-page/services-page';

export const routes: Routes = [
  // Jovie store: loaded on demand, so the corporate pages do not download it.
  {
    path: 'jovie',
    loadComponent: () => import('./jovie/jovie-layout/jovie-layout').then((m) => m.JovieLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./jovie/pages/jovie-home-page/jovie-home-page').then((m) => m.JovieHomePage),
        title: 'Jovie | Organic Goat Milk Formula',
      },
      {
        path: 'shop',
        loadComponent: () => import('./jovie/pages/jovie-shop-page/jovie-shop-page').then((m) => m.JovieShopPage),
        title: 'Shop | Jovie',
      },
      {
        path: 'why',
        loadComponent: () => import('./jovie/pages/jovie-why-page/jovie-why-page').then((m) => m.JovieWhyPage),
        title: 'Why Jovie Goat | Jovie',
      },
      // The official "More information" pages behind the Why Jovie Goat page.
      ...(
        [
          ['why/makes-good-sense', 'makes-good-sense', 'Why Jovie Goat makes good sense | Jovie'],
          ['why/organic', 'organic', 'Organic Goat Milk | Jovie'],
          ['why/without-promise', 'without-promise', "Jovie's without promise | Jovie"],
        ] as const
      ).map(([path, subpage, title]) => ({
        path,
        loadComponent: () => import('./jovie/pages/jovie-why-subpage/jovie-why-subpage').then((m) => m.JovieWhySubpage),
        title,
        data: { subpage, headerTone: 'green' },
      })),
      {
        path: 'feeding-guide',
        loadComponent: () =>
          import('./jovie/pages/jovie-feeding-guide-page/jovie-feeding-guide-page').then((m) => m.JovieFeedingGuidePage),
        title: 'Feeding guide | Jovie',
      },
      {
        path: 'where-to-find',
        loadComponent: () => import('./jovie/pages/jovie-where-page/jovie-where-page').then((m) => m.JovieWherePage),
        title: 'Where to find | Jovie',
        // The header keeps the colour of the page's top band when it becomes solid on scroll.
        data: { headerTone: 'navy' },
      },
      {
        path: 'faq',
        loadComponent: () => import('./jovie/pages/jovie-faq-page/jovie-faq-page').then((m) => m.JovieFaqPage),
        title: 'FAQ | Jovie',
        data: { headerTone: 'red' },
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./jovie/pages/jovie-contact-page/jovie-contact-page').then((m) => m.JovieContactPage),
        title: 'Say hello | Jovie',
      },
      { path: '**', redirectTo: '' },
    ],
  },
  {
    path: '',
    component: CorporateLayout,
    children: [
      { path: '', pathMatch: 'full', component: HomePage, title: 'Home | Octogenix Pharma' },
      { path: 'about', component: AboutPage, title: 'About Us | Octogenix Pharma' },
      { path: 'services', component: ServicesPage, title: 'Services | Octogenix Pharma' },
      { path: 'brands', component: BrandsPage, title: 'Our Brands | Octogenix Pharma' },
      { path: 'contact', component: ContactPage, title: 'Contact Us | Octogenix Pharma' },
    ],
  },
  { path: '**', redirectTo: '' },
];
