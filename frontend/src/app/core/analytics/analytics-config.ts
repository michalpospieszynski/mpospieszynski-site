import { InjectionToken, TransferState, inject, makeStateKey } from '@angular/core';

/**
 * PostHog settings (docs/ANALYTICS.md). Only the project key varies per environment (POSTHOG_KEY on the SSR server);
 * without it analytics is off: no banner, no footer link, no requests (development, CI, e2e).
 */
export interface AnalyticsConfig {
  /** The public project key (`phc_…`); public by design, like the Supabase publishable key. */
  key: string;
}

export const ANALYTICS_CONFIG = new InjectionToken<AnalyticsConfig | null>('ANALYTICS_CONFIG');

/** The server reads the key from its environment and hands it to the browser through TransferState. */
export const ANALYTICS_CONFIG_STATE = makeStateKey<AnalyticsConfig | null>('ANALYTICS_CONFIG');

/** PostHog Cloud EU: events are proxied there (src/server-analytics.ts); the app links point to its UI. */
export const POSTHOG_API_HOST = 'https://eu.i.posthog.com';
export const POSTHOG_ASSETS_HOST = 'https://eu-assets.i.posthog.com';
export const POSTHOG_UI_HOST = 'https://eu.posthog.com';

/** Same-origin path of the reverse proxy in src/server.ts. */
export const POSTHOG_PROXY_PATH = '/ingest';

export function browserAnalyticsConfig(): AnalyticsConfig | null {
  return inject(TransferState).get(ANALYTICS_CONFIG_STATE, null);
}
