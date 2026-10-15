import { APIRequestContext, Locator, Page, expect } from '@playwright/test';
import { authenticator } from 'otplib';

// Admin e2e helpers. They need the local Supabase stack (`npm run supabase:start`, seed users from
// supabase/seed.sql) besides the dev API, Mailpit and `ng serve` (see playwright.config.ts).

export const SUPABASE_URL = 'http://127.0.0.1:54321';
/** The Supabase CLI's fixed local publishable key (public by design; never a production value). */
const LOCAL_PUBLISHABLE_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

export interface TestUser {
  email: string;
  password: string;
  totpSecret?: string;
}

/** Seed users of supabase/seed.sql (local test accounts only). */
export const ADMIN: TestUser = { email: 'admin@localhost.test', password: 'local-admin-password' };
export const MFA_ADMIN: TestUser = {
  email: 'mfa-admin@localhost.test',
  password: 'local-admin-password',
  totpSecret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
};
export const PLAIN_USER: TestUser = {
  email: 'user@localhost.test',
  password: 'local-user-password',
};

export const MAILPIT = 'http://localhost:8025/api/v1';

export function totp(user: TestUser): string {
  return authenticator.generate(user.totpSecret ?? '');
}

/** Signs in through the login page and waits for the admin path it was sent back to. */
export async function signIn(page: Page, path = '/admin', user: TestUser = ADMIN): Promise<void> {
  await page.goto(`/admin/logowanie?returnUrl=${encodeURIComponent(path)}`);
  await page.getByTestId('login-email').fill(user.email);
  await page.getByTestId('login-password').fill(user.password);
  await page.getByTestId('login-submit').click();
  if (user.totpSecret) {
    await page.getByTestId('mfa-code').fill(totp(user));
  }
  await page.waitForURL((url) => url.pathname === path.split(/[?#]/)[0]);
  await page.waitForLoadState('networkidle');
}

/** The last snackbar message. */
export function snack(page: Page): Locator {
  return page.locator('.mat-mdc-snack-bar-label').last();
}

export async function confirm(page: Page): Promise<void> {
  await page.getByTestId('confirm').click();
}

async function accessToken(request: APIRequestContext, user: TestUser = ADMIN): Promise<string> {
  const response = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: LOCAL_PUBLISHABLE_KEY },
    data: { email: user.email, password: user.password },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { access_token: string }).access_token;
}

export interface AdminApi {
  get<T = unknown>(path: string): Promise<T>;
  send<T = unknown>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
  ): Promise<T>;
}

/** The admin API as the seeded admin, for test setup and clean-up (paths below /api/v1/admin). */
export async function adminApi(request: APIRequestContext): Promise<AdminApi> {
  const headers = { Authorization: `Bearer ${await accessToken(request)}` };
  const url = (path: string) => `/api/v1/admin${path}`;
  return {
    async get<T>(path: string): Promise<T> {
      const response = await request.get(url(path), { headers });
      expect(response.ok(), `GET ${path}: ${response.status()}`).toBeTruthy();
      return (await response.json()) as T;
    },
    async send<T>(
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      path: string,
      data?: unknown,
    ): Promise<T> {
      const response = await request.fetch(url(path), { method, headers, data });
      const text = await response.text();
      expect(response.ok(), `${method} ${path}: ${response.status()} ${text}`).toBeTruthy();
      return (text ? JSON.parse(text) : undefined) as T;
    },
  };
}

/** A fresh contact message through the public endpoint; a unique client IP keeps the rate limit out of the way. */
export async function createMessage(
  request: APIRequestContext,
  fields: { name: string; locale?: 'pl' | 'en'; topic?: string },
): Promise<void> {
  const response = await request.post('/api/v1/public/contact', {
    headers: { 'CF-Connecting-IP': `198.51.100.${Math.floor(Math.random() * 250) + 1}` },
    data: {
      locale: fields.locale ?? 'pl',
      topic: fields.topic ?? 'OTHER',
      name: fields.name,
      email: `${fields.name.toLowerCase().replace(/\W+/g, '-')}@example.test`,
      message: 'Wiadomość testowa panelu administracyjnego, wystarczająco długa.',
      consent: true,
      turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/** A unique name for things a test creates. */
export function unique(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}
