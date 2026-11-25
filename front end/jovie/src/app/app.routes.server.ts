import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The cart, checkout and payment pages depend on the browser's cart and order tokens: not prerendered.
  { path: 'jovieEgypt/shop/:slug', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/cart', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/checkout', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/checkout/**', renderMode: RenderMode.Client },
  // Account pages and the admin area depend on the visitor's session: rendered in the browser only.
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'signup', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/login', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/signup', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/forgot-password', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/reset-password', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/verify-email', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/account', renderMode: RenderMode.Client },
  { path: 'jovieEgypt/account/**', renderMode: RenderMode.Client },
  // The former store address only redirects to /jovieEgypt (in the browser).
  { path: 'jovie', renderMode: RenderMode.Client },
  { path: 'jovie/**', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  // The intro is shown once per visit, which only the browser knows: rendered in the browser.
  { path: '', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
