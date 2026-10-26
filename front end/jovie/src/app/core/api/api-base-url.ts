import { InjectionToken } from '@angular/core';

/**
 * Prefix for Laravel API requests.
 *
 * - Browser: '' (same origin). Locally `ng serve` proxies /api, /sanctum and /storage to Laravel
 *   (proxy.conf.json); in production a reverse proxy must do the same, because Sanctum's cookie
 *   authentication and CSRF protection require the API to be on the site's own origin.
 * - Server (SSR / prerender): set in app.config.server.ts from the API_URL environment variable.
 *   `null` means "do not call the API" — the bundled texts and images are rendered instead.
 */
export const API_BASE_URL = new InjectionToken<string | null>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '',
});
