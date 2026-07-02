import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeSk from '@angular/common/locales/sk';
import { provideTransloco } from '@jsverse/transloco';

registerLocaleData(localeSk);

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch()
      // CSRF header (X-CSRFToken) is attached manually in authInterceptor —
      // Angular's built-in withXsrfConfiguration skips absolute URLs, which
      // dev mode's environment.apiUrl uses, so it can't be relied on here.
    ),
    provideTransloco({
      config: {
        availableLangs: ['en', 'sk'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        fallbackLang: 'en',
        missingHandler: {
          useFallbackTranslation: true
        }
      },
      loader: TranslocoHttpLoader
    })
  ]
};
