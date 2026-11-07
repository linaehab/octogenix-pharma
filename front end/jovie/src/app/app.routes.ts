import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { CanActivateFn, Routes } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { CorporateLayout } from './layouts/corporate-layout/corporate-layout';
import { AboutPage } from './pages/about-page/about-page';
import { BrandsPage } from './pages/brands-page/brands-page';
import { ContactPage } from './pages/contact-page/contact-page';
import { HomePage } from './pages/home-page/home-page';
import { ServicesPage } from './pages/services-page/services-page';

type AccountGuards = typeof import('./jovie/account/account.guards');

/** A store guard loaded with the Jovie code, so the corporate pages do not download the store. */
const lazyGuard =
  (name: 'customerOnly' | 'guestOnly' | 'sessionKnown'): CanActivateFn =>
  (route, state) => {
    const injector = inject(EnvironmentInjector);
    return import('./jovie/account/account.guards').then((guards: AccountGuards) => {
      const result = runInInjectionContext(injector, () => guards[name](route, state));
      return isObservable(result) ? firstValueFrom(result) : result;
    });
  };
const customerOnly = lazyGuard('customerOnly');
const guestOnly = lazyGuard('guestOnly');
const sessionKnown = lazyGuard('sessionKnown');

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
        path: 'products',
        loadComponent: () => import('./jovie/pages/jovie-products-page/jovie-products-page').then((m) => m.JovieProductsPage),
        title: 'Jovie Goat Products | Jovie',
      },
      // The official product pages; the header takes each product's colour.
      ...(
        [
          ['infant-goat-milk', 'yellow', 'Organic Infant Goat Milk | Jovie'],
          ['follow-on-goat-milk', 'pink', 'Organic Follow-on Goat Milk | Jovie'],
          ['toddler-goat-milk', 'blue', 'Organic Toddler Goat Milk | Jovie'],
        ] as const
      ).map(([product, headerTone, title]) => ({
        path: `products/${product}`,
        loadComponent: () => import('./jovie/pages/jovie-product-page/jovie-product-page').then((m) => m.JovieProductPage),
        title,
        data: { product, headerTone },
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
      // Shop product page (Add to Cart, sizes, quantity) of an API product, opened from the Shop cards.
      {
        path: 'shop/:slug',
        loadComponent: () =>
          import('./jovie/pages/jovie-shop-product-page/jovie-shop-product-page').then((m) => m.JovieShopProductPage),
        title: 'Shop | Jovie',
      },
      // Store: cart and guest checkout on the Laravel API (rendered in the browser, see app.routes.server.ts).
      {
        path: 'cart',
        loadComponent: () => import('./jovie/pages/jovie-cart-page/jovie-cart-page').then((m) => m.JovieCartPage),
        title: 'Cart | Jovie',
        canActivate: [sessionKnown],
      },
      {
        path: 'checkout',
        canActivate: [sessionKnown],
        loadComponent: () => import('./jovie/pages/jovie-checkout-page/jovie-checkout-page').then((m) => m.JovieCheckoutPage),
        title: 'Checkout | Jovie',
      },
      {
        // TEST MODE only: the stand-in payment page of the mock card driver.
        path: 'checkout/mock-payment',
        canActivate: [sessionKnown],
        loadComponent: () =>
          import('./jovie/pages/jovie-mock-payment-page/jovie-mock-payment-page').then((m) => m.JovieMockPaymentPage),
        title: 'Test payment | Jovie',
      },
      {
        path: 'checkout/payment-result',
        canActivate: [sessionKnown],
        loadComponent: () =>
          import('./jovie/pages/jovie-payment-result-page/jovie-payment-result-page').then((m) => m.JoviePaymentResultPage),
        title: 'Payment | Jovie',
      },
      {
        path: 'checkout/confirmation/:orderNumber',
        canActivate: [sessionKnown],
        loadComponent: () =>
          import('./jovie/pages/jovie-order-confirmation-page/jovie-order-confirmation-page').then(
            (m) => m.JovieOrderConfirmationPage,
          ),
        title: 'Order confirmed | Jovie',
      },
      // Customer accounts (Sanctum session, customer guard). Rendered in the browser only.
      {
        path: 'login',
        canActivate: [guestOnly],
        loadComponent: () => import('./jovie/account/pages/login-page').then((m) => m.LoginPage),
        title: 'Log in | Jovie',
      },
      {
        path: 'signup',
        canActivate: [guestOnly],
        loadComponent: () => import('./jovie/account/pages/signup-page').then((m) => m.SignupPage),
        title: 'Create an account | Jovie',
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./jovie/account/pages/forgot-password-page').then((m) => m.ForgotPasswordPage),
        title: 'Forgot password | Jovie',
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./jovie/account/pages/reset-password-page').then((m) => m.ResetPasswordPage),
        title: 'Reset password | Jovie',
      },
      {
        path: 'verify-email',
        canActivate: [sessionKnown],
        loadComponent: () => import('./jovie/account/pages/verify-email-page').then((m) => m.VerifyEmailPage),
        title: 'Confirm your email | Jovie',
      },
      {
        path: 'account',
        canActivate: [customerOnly],
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./jovie/account/pages/account-page').then((m) => m.AccountPage),
            title: 'My account | Jovie',
          },
          {
            path: 'orders',
            loadComponent: () => import('./jovie/account/pages/orders-page').then((m) => m.OrdersPage),
            title: 'My orders | Jovie',
          },
          {
            path: 'orders/:orderNumber',
            loadComponent: () => import('./jovie/account/pages/order-page').then((m) => m.OrderPage),
            title: 'My orders | Jovie',
          },
          {
            path: 'addresses',
            loadComponent: () => import('./jovie/account/pages/addresses-page').then((m) => m.AddressesPage),
            title: 'My addresses | Jovie',
          },
        ],
      },
      { path: '**', redirectTo: '' },
    ],
  },
  // Admin area: separate sign-in (admin guard), no sign-up. Rendered in the browser only and loaded
  // on demand (routes, guards and pages), so the storefront never downloads it.
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.adminRoutes),
  },
  // Short addresses for the store's sign-in pages.
  { path: 'login', redirectTo: '/jovie/login' },
  { path: 'signup', redirectTo: '/jovie/signup' },
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
