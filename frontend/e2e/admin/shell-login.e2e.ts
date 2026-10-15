import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from '../axe';
import { ADMIN, MFA_ADMIN, PLAIN_USER, adminApi, signIn } from './admin';

// Acceptance criteria of docs/screens/admin/01-admin-shell.md and 02-login.md, against local Supabase Auth.

async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

/** Rewrites the stored supabase-js session (localStorage `sb-…-auth-token`). */
async function corruptSession(
  page: Page,
  fields: { access?: boolean; refresh?: boolean },
): Promise<void> {
  await page.evaluate((f) => {
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (!key) throw new Error('no supabase session in localStorage');
    const session = JSON.parse(localStorage.getItem(key)!);
    if (f.access)
      session.access_token = 'invalid.' + session.access_token.split('.')[1] + '.signature';
    if (f.refresh) session.refresh_token = 'not-a-refresh-token';
    localStorage.setItem(key, JSON.stringify(session));
  }, fields);
}

test('an admin route without a session goes to login and back after sign-in', async ({ page }) => {
  await page.goto('/admin/projekty?status=DRAFT');
  await expect(page).toHaveURL(
    /\/admin\/logowanie\?returnUrl=%2Fadmin%2Fprojekty%3Fstatus%3DDRAFT/,
  );
  await fillLogin(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin\/projekty\?status=DRAFT$/);
  await expect(page.getByTestId('admin-email')).toHaveText(ADMIN.email);
});

test('a wrong password shows the message, clears the password and focuses it', async ({ page }) => {
  await page.goto('/admin/logowanie');
  await fillLogin(page, ADMIN.email, 'wrong-password');
  await expect(page.getByTestId('login-error')).toHaveText('Nieprawidłowy e-mail lub hasło.');
  await expect(page.getByTestId('login-password')).toHaveValue('');
  await expect(page.getByTestId('login-password')).toBeFocused();
});

test('an account without the admin role is signed out with the no-access message', async ({
  page,
}) => {
  await page.goto('/admin/logowanie');
  await fillLogin(page, PLAIN_USER.email, PLAIN_USER.password);
  await expect(page.getByTestId('login-error')).toHaveText('To konto nie ma dostępu do panelu.');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/logowanie/);
});

test('TOTP: a wrong code is refused, the right one signs in', async ({ page }) => {
  await page.goto('/admin/logowanie');
  await fillLogin(page, MFA_ADMIN.email, MFA_ADMIN.password);
  const code = page.getByTestId('mfa-code');
  await expect(code).toBeFocused();
  await expect(code).toHaveAttribute('inputmode', 'numeric');
  await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
  await code.fill('000000');
  await expect(page.getByTestId('login-error')).toHaveText('Nieprawidłowy kod. Spróbuj ponownie.');
  // Password alone (aal1) is not enough for the admin routes.
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/logowanie/);

  await signIn(page, '/admin/pliki', MFA_ADMIN);
  await expect(page.getByTestId('admin-email')).toHaveText(MFA_ADMIN.email);
});

test('an outside returnUrl is ignored', async ({ page }) => {
  await page.goto('/admin/logowanie?returnUrl=https://evil.example');
  await fillLogin(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/logowanie?returnUrl=//evil.example/admin');
  await expect(page).toHaveURL(/\/admin$/);
});

test('a refused access token is refreshed once and the call retried transparently', async ({
  page,
}) => {
  await signIn(page, '/admin');
  let refused = false;
  await page.route('**/api/v1/admin/projects*', (route) => {
    if (refused) return route.continue();
    refused = true;
    return route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: '{"title":"Unauthorized"}',
    });
  });
  const refresh = page.waitForRequest((r) =>
    r.url().includes('/auth/v1/token?grant_type=refresh_token'),
  );
  await page.getByTestId('nav-projects').click();
  await refresh;
  await expect(page.getByTestId('project-row').first()).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/projekty$/);
});

test('a corrupt stored session never opens the admin', async ({ page }) => {
  await signIn(page, '/admin');
  await corruptSession(page, { access: true, refresh: true });
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/logowanie/);
});

test('a refused token mid-session signs out with the session-expired message', async ({ page }) => {
  await signIn(page, '/admin/pliki');
  // Every admin call answers 401 from now on: the refresh succeeds, the retry fails again.
  await page.route('**/api/v1/admin/**', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: '{"title":"Unauthorized"}',
    }),
  );
  await page.getByTestId('nav-projects').click();
  await expect(page).toHaveURL(/\/admin\/logowanie\?returnUrl=%2Fadmin%2Fprojekty/);
  await expect(page.getByTestId('login-notice')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
});

test('the badge shows the number of new messages', async ({ page, request }) => {
  const api = await adminApi(request);
  const { newMessages } = await api.get<{ newMessages: number }>('/dashboard');
  await signIn(page, '/admin/pliki');
  if (newMessages > 0) {
    await expect(page.getByTestId('nav-badge')).toContainText(String(newMessages));
  } else {
    await expect(page.getByTestId('nav-badge')).toHaveCount(0);
  }
});

test('leaving an editor with unsaved changes asks first', async ({ page }) => {
  await signIn(page, '/admin/ustawienia');
  await page.getByTestId('fullName').fill('Zmienione nazwisko');
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('confirm-message')).toHaveText(
    'Masz niezapisane zmiany. Opuścić stronę bez zapisywania?',
  );
  await page.getByRole('button', { name: 'Anuluj' }).click();
  await expect(page.getByTestId('confirm')).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/ustawienia/);
  await page.getByTestId('nav-dashboard').click();
  await page.getByTestId('confirm').click();
  await expect(page).toHaveURL(/\/admin$/);
});

test('SSR for /admin contains no admin code or data', async ({ request }) => {
  const html = await (await request.get('/admin')).text();
  expect(html).not.toContain('adm-shell');
  expect(html).not.toContain('Panel strony');
  expect(html).not.toContain('Pulpit');
  expect(html).not.toContain('admin.css');
});

for (const scheme of ['dark', 'light'] as const) {
  test(`login and dashboard pass axe (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/admin/logowanie');
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    await expectNoAxeViolations(page);
    await signIn(page, '/admin');
    await expectNoAxeViolations(page);
  });
}

test('the theme toggle in the top bar switches the admin and the site', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await signIn(page, '/admin');
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('the panel switches to English and back, keeps the choice and asks the API in it', async ({
  page,
}) => {
  await page.goto('/admin/logowanie');
  const switchLang = page.getByTestId('admin-lang');
  await expect(switchLang).toHaveText('EN');
  await switchLang.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Site admin');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(switchLang).toHaveText('PL');

  await signIn(page, '/admin');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
  await expect(page.getByTestId('nav-projects')).toHaveText('Projects');

  // The choice survives a reload, and admin calls carry it for the API's messages.
  const call = page.waitForRequest((r) => r.url().includes('/api/v1/admin/'));
  await page.reload();
  expect((await call).headers()['accept-language']).toBe('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');

  await page.getByTestId('admin-lang').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pulpit');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
});
