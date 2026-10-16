import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

import {
  STATIC_HEADERS,
  addNonce,
  contentSecurityPolicy,
  createNonce,
  staticCacheControl,
} from './server-security';

declare const ngDevMode: unknown;

const browserDistFolder = join(import.meta.dirname, '../browser');
/** Public by design (the browser uses them). Defaults: the local Supabase stack (`npm run supabase:start`). */
const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SUPABASE_PUBLISHABLE_KEY =
  process.env['SUPABASE_PUBLISHABLE_KEY'] ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
/** The dev server injects its own scripts (Vite), so the CSP applies to production builds only. */
const ENFORCE_CSP = typeof ngDevMode === 'undefined' || !ngDevMode;

const app = express();
const angularApp = new AngularNodeAppEngine();
app.disable('x-powered-by');

/** Headers for every response; the page CSP is added per render below. */
app.use((_req, res, next) => {
  res.set(STATIC_HEADERS);
  next();
});

/** Liveness for the container health check: no rendering, no API call. */
app.get('/healthz', (_req, res) => {
  res.set('Cache-Control', 'no-store').type('text/plain').send('ok');
});

/** Static files of the browser build: hashed ones for a year, fixed names (favicons) hourly. */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => res.setHeader('Cache-Control', staticCacheControl(filePath)),
  }),
);

/**
 * Runtime settings for the client-only admin (docs/screens/admin/01-admin-shell.md): read from the environment so
 * one image works everywhere; production sets SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
 */
app.get('/config.json', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({
    supabaseUrl: SUPABASE_URL,
    supabasePublishableKey: SUPABASE_PUBLISHABLE_KEY,
  });
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(async (response) => {
      if (!response) {
        return next();
      }
      if (!response.headers.get('content-type')?.includes('text/html')) {
        return writeResponseToNodeResponse(response, res);
      }
      // Pages are buffered (they are small) so every script gets this request's nonce.
      let html = await response.text();
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      if (ENFORCE_CSP) {
        const nonce = createNonce();
        html = addNonce(html, nonce);
        headers.set(
          'Content-Security-Policy',
          contentSecurityPolicy(req.path, nonce, SUPABASE_URL),
        );
      }
      return writeResponseToNodeResponse(
        new Response(html, { status: response.status, headers }),
        res,
      );
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
