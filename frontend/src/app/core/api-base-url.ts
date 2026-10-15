import { InjectionToken } from '@angular/core';

/**
 * Origin prepended to API paths (`/api/...`, `/media/...`).
 * Browser: the page's own origin, so requests go through Cloudflare (or the dev proxy).
 * Server: the API on the Docker network, from `API_INTERNAL_URL` (see app.config.server.ts).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
