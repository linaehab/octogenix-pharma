import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { LocalizedTitleStrategy } from './core/i18n/localized-title.strategy';
import { SiteContentService } from './core/content/site-content.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideClientHydration(withEventReplay()),
    // XSRF: Angular sends the XSRF-TOKEN cookie (set by Laravel Sanctum) as X-XSRF-TOKEN on
    // same-origin POST/PUT/PATCH/DELETE requests by default.
    provideHttpClient(withFetch()),
    provideAppInitializer(() => inject(SiteContentService).load()),
    { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
  ]
};
