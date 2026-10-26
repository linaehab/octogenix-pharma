import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_URL } from './core/api/api-base-url';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // On the server the API needs an absolute URL. Without API_URL (e.g. during `ng build`
    // prerendering) the API is not called and pages render with the bundled content; the
    // browser then loads the current content from the API after start-up.
    {
      provide: API_BASE_URL,
      useFactory: () => process.env['API_URL']?.replace(/\/+$/, '') || null,
    },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
