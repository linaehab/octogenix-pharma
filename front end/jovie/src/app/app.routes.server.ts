import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The cart, checkout and payment pages depend on the browser's cart and order tokens: not prerendered.
  { path: 'jovie/shop/:slug', renderMode: RenderMode.Client },
  { path: 'jovie/cart', renderMode: RenderMode.Client },
  { path: 'jovie/checkout', renderMode: RenderMode.Client },
  { path: 'jovie/checkout/**', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
