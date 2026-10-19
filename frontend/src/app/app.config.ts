import {
  ApplicationConfig,
  DOCUMENT,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { BASE_PATH } from './api';
import { routes } from './app.routes';
import { ANALYTICS_CONFIG, browserAnalyticsConfig } from './core/analytics/analytics-config';
import { API_BASE_URL } from './core/api-base-url';
import { adminAuthInterceptor } from './core/auth/admin-session';
import { apiErrorInterceptor } from './core/http/api-error';
import { provideI18n } from './core/i18n/i18n.providers';
import { SITE_ORIGIN } from './core/seo/seo.service';
import { TURNSTILE_SITE_KEY, browserSiteKey } from './core/turnstile/turnstile';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Resolved page data arrives as signal inputs (docs/CONVENTIONS.md, Routing and data).
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Top of the page on navigation, the old position on back, #anchors scroll (app-shell spec).
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // adminAuthInterceptor sits inside apiErrorInterceptor so it sees the raw 401 and can refresh the session once.
    provideHttpClient(
      withFetch(),
      withInterceptors([apiErrorInterceptor, adminAuthInterceptor]),
    ),
    provideI18n(),
    // GET responses fetched during SSR are embedded in the page and reused by the browser.
    provideClientHydration(withEventReplay(), withHttpTransferCacheOptions({})),
    // Browser: same origin as the page (Cloudflare or the dev proxy routes /api). The server overrides this.
    { provide: API_BASE_URL, useFactory: () => inject(DOCUMENT).location.origin },
    { provide: SITE_ORIGIN, useFactory: () => inject(DOCUMENT).location.origin },
    // The generated client (src/app/api) builds its URLs from BASE_PATH.
    { provide: BASE_PATH, useFactory: () => inject(API_BASE_URL) },
    // The public Turnstile key arrives from the server (TransferState); the test key is the fallback.
    { provide: TURNSTILE_SITE_KEY, useFactory: browserSiteKey },
    // The PostHog key arrives from the server (TransferState); without it analytics is off.
    { provide: ANALYTICS_CONFIG, useFactory: browserAnalyticsConfig },
  ],
};
