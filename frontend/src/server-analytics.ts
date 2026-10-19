import type { RequestHandler } from 'express';

import { POSTHOG_API_HOST, POSTHOG_ASSETS_HOST } from './app/core/analytics/analytics-config';

/**
 * Reverse proxy for PostHog (docs/ANALYTICS.md §3): the browser sends events to /ingest on the site's own origin,
 * so the CSP needs no PostHog origins and fewer requests are lost to blockers. Mounted only when POSTHOG_KEY is set.
 */

/** Paths PostHog serves from its assets host: scripts (`/static/`) and the project's remote config (`/array/`). */
const ASSET_PATH = /^\/(static|array)\//;

/** PostHog URL for a path below /ingest: assets from the assets host, everything else from the API host. */
export function posthogTarget(pathAndQuery: string): string {
  const host = ASSET_PATH.test(pathAndQuery) ? POSTHOG_ASSETS_HOST : POSTHOG_API_HOST;
  return host + pathAndQuery;
}

/** Request headers PostHog needs; cookies and everything else from the visitor stay here. */
const FORWARDED_REQUEST_HEADERS = ['content-type', 'content-encoding', 'user-agent', 'accept'];
/** Response headers passed back (fetch has already decoded the body, so no encoding or length). */
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'cache-control'];

export function posthogProxy(): RequestHandler {
  return async (req, res) => {
    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = req.get(name);
      if (value) {
        headers.set(name, value);
      }
    }
    // The visitor's IP (Cloudflare puts it in CF-Connecting-IP) lets PostHog resolve the country before the
    // project setting "Discard client IP data" drops it; without it every visit would come from the VPS.
    const ip = req.get('cf-connecting-ip') ?? req.ip;
    if (ip) {
      headers.set('x-forwarded-for', ip);
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body);
    try {
      const response = await fetch(posthogTarget(req.url), {
        method: req.method,
        headers,
        body: hasBody ? new Uint8Array(req.body as Buffer) : undefined,
      });
      res.status(response.status);
      for (const name of FORWARDED_RESPONSE_HEADERS) {
        const value = response.headers.get(name);
        if (value) {
          res.set(name, value);
        }
      }
      res.send(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.sendStatus(502);
    }
  };
}
