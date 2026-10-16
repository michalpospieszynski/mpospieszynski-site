import { localizedUrl } from './app/core/i18n/route-table';

/**
 * Security headers of the SSR server (docs/ARCHITECTURE.md §12; the API sends its own). HSTS comes from Cloudflare.
 * Scripts need a per-request nonce: Angular inlines the event-replay script and index.html the theme script.
 */

const TURNSTILE = 'https://challenges.cloudflare.com';
const CF_ANALYTICS_SCRIPT = 'https://static.cloudflareinsights.com';
const CF_ANALYTICS_BEACON = 'https://cloudflareinsights.com';
/** Pages with the contact form (and so Turnstile): the contact pages and the home pages. */
const FORM_PATHS = new Set(
  (['contact', 'home'] as const).flatMap((key) => [
    localizedUrl(key, 'pl'),
    localizedUrl(key, 'en'),
  ]),
);

/** Same list as the API (SecurityConfig.PERMISSIONS_POLICY). */
export const PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()';

export const STATIC_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': PERMISSIONS_POLICY,
  'X-Frame-Options': 'DENY',
};

/** Angular's output hashing (`outputHashing: all`): `chunk-3PTdXO7p.js`, `manrope-…-73PUZEUA.woff2`. */
const CONTENT_HASH = /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/;

/**
 * Cache-Control for a static file of the browser build. Hashed files never change under their name, so browsers
 * and Cloudflare keep them for a year; files with fixed names (favicons from public/) would otherwise stay stale
 * for a year after a release, so they are revalidated hourly.
 */
export function staticCacheControl(filePath: string): string {
  return CONTENT_HASH.test(filePath)
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=3600';
}

/** 128 random bits, base64 (Web Crypto: global in Node and the browser). */
export function createNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

/**
 * The page's CSP: Turnstile only on the pages with the contact form (home and contact), Supabase Auth only in the admin, Cloudflare Web Analytics
 * everywhere. Styles allow inline because Angular renders component styles and style bindings inline.
 */
export function contentSecurityPolicy(path: string, nonce: string, supabaseUrl: string): string {
  const contact = FORM_PATHS.has(path.replace(/\/$/, '') || '/');
  const admin = path === '/admin' || path.startsWith('/admin/');
  const script = [
    "'self'",
    `'nonce-${nonce}'`,
    CF_ANALYTICS_SCRIPT,
    ...(contact ? [TURNSTILE] : []),
  ];
  const connect = ["'self'", CF_ANALYTICS_BEACON, ...(admin ? [new URL(supabaseUrl).origin] : [])];
  return [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    `frame-src ${contact ? TURNSTILE : "'none'"}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Puts the nonce on every `<script>` the page renders (inline and external). */
export function addNonce(html: string, nonce: string): string {
  return html.replace(/<script(?![^>]*\snonce=)/g, `<script nonce="${nonce}"`);
}
