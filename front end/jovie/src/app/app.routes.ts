import { Routes } from '@angular/router';
import { AboutPage } from './pages/about-page/about-page';
import { BrandsPage } from './pages/brands-page/brands-page';
import { ContactPage } from './pages/contact-page/contact-page';
import { HomePage } from './pages/home-page/home-page';
import { ServicesPage } from './pages/services-page/services-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePage, title: 'Home | Octogenix Pharma' },
  { path: 'about', component: AboutPage, title: 'About Us | Octogenix Pharma' },
  { path: 'services', component: ServicesPage, title: 'Services | Octogenix Pharma' },
  { path: 'brands', component: BrandsPage, title: 'Our Brands | Octogenix Pharma' },
  { path: 'contact', component: ContactPage, title: 'Contact Us | Octogenix Pharma' },
  { path: '**', redirectTo: '' },
];
