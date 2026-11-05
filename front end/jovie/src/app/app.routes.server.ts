import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The cart, checkout and payment pages depend on the browser's cart and order tokens: not prerendered.
  { path: 'jovie/shop/:slug', renderMode: RenderMode.Client },
  { path: 'jovie/cart', renderMode: RenderMode.Client },
  { path: 'jovie/checkout', renderMode: RenderMode.Client },
  { path: 'jovie/checkout/**', renderMode: RenderMode.Client },
  // Account pages and the admin area depend on the visitor's session: rendered in the browser only.
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'signup', renderMode: RenderMode.Client },
  { path: 'jovie/login', renderMode: RenderMode.Client },
  { path: 'jovie/signup', renderMode: RenderMode.Client },
  { path: 'jovie/forgot-password', renderMode: RenderMode.Client },
  { path: 'jovie/reset-password', renderMode: RenderMode.Client },
  { path: 'jovie/verify-email', renderMode: RenderMode.Client },
  { path: 'jovie/account', renderMode: RenderMode.Client },
  { path: 'jovie/account/**', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
