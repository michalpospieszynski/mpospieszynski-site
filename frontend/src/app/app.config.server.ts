import { HTTP_TRANSFER_CACHE_ORIGIN_MAP } from '@angular/common/http';
import {
  ApplicationConfig,
  REQUEST,
  TransferState,
  inject,
  isDevMode,
  mergeApplicationConfig,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { ANALYTICS_CONFIG, ANALYTICS_CONFIG_STATE } from './core/analytics/analytics-config';
import { API_BASE_URL } from './core/api-base-url';
import { SITE_ORIGIN } from './core/seo/seo.service';
import { TURNSTILE_KEY_STATE, TURNSTILE_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from './core/turnstile/turnstile';

/** API origin for server-side requests: the Compose service in production, the local API under `ng serve`. */
function apiInternalUrl(): string {
  return (
    process.env['API_INTERNAL_URL'] ?? (isDevMode() ? 'http://localhost:8080' : 'http://api:8080')
  );
}

/**
 * The origin visitors' browsers use. Production sets SITE_BASE_URL (behind Cloudflare the request reaches
 * Node over plain HTTP, so the request URL would say http); locally the request's own origin is right.
 */
function publicOrigin(): string {
  const configured = process.env['SITE_BASE_URL'];
  if (configured) {
    return new URL(configured).origin;
  }
  const request = inject(REQUEST, { optional: true });
  return request ? new URL(request.url).origin : 'http://localhost';
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: API_BASE_URL, useFactory: apiInternalUrl },
    { provide: SITE_ORIGIN, useFactory: publicOrigin },
    // SSR calls http://api:8080/api/..., the browser calls https://<site>/api/...; mapping the origin gives both
    // the same transfer-cache key, so the browser reuses the server's response instead of requesting it again.
    // Public Turnstile site key from the environment, passed on to the browser (contact page only).
    {
      provide: TURNSTILE_SITE_KEY,
      useFactory: () => {
        const key = process.env['TURNSTILE_SITE_KEY'] || TURNSTILE_TEST_SITE_KEY;
        inject(TransferState).set(TURNSTILE_KEY_STATE, key);
        return key;
      },
    },
    // Public PostHog project key from the environment (docs/ANALYTICS.md), handed to the browser on every page.
    {
      provide: ANALYTICS_CONFIG,
      useFactory: () => {
        const key = process.env['POSTHOG_KEY'];
        const config = key ? { key } : null;
        inject(TransferState).set(ANALYTICS_CONFIG_STATE, config);
        return config;
      },
    },
    provideEnvironmentInitializer(() => inject(ANALYTICS_CONFIG)),
    {
      provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
      useFactory: () => ({ [new URL(apiInternalUrl()).origin]: publicOrigin() }),
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
