import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from '../axe';
import { adminApi, confirm, createMessage, signIn, snack, unique } from './admin';

// Acceptance criteria of docs/screens/admin/03-dashboard.md and 04-messages.md.

interface Dashboard {
  newMessages: number;
  draftProjects: number;
  missingTranslations: { type: string; id: string; label: string }[];
}

test.describe('dashboard', () => {
  test('counts match the data of each section', async ({ page, request }) => {
    const api = await adminApi(request);
    const dashboard = await api.get<Dashboard>('/dashboard');
    const drafts = await api.get<unknown[]>('/projects?status=DRAFT');
    const messages = await api.get<{ counts: Record<string, number> }>('/messages?status=NEW');
    expect(dashboard.draftProjects).toBe(drafts.length);
    expect(dashboard.newMessages).toBe(messages.counts['NEW'] ?? 0);

    await signIn(page, '/admin');
    await expect(page.getByTestId('card-messages')).toContainText(String(dashboard.newMessages));
    await expect(page.getByTestId('card-drafts')).toContainText(String(dashboard.draftProjects));
    await expect(page.getByTestId('card-missing')).toContainText(
      String(dashboard.missingTranslations.length),
    );
    await expect(page.getByTestId('missing-translations').locator('li')).toHaveCount(
      dashboard.missingTranslations.length,
    );

    await page.getByTestId('card-drafts').click();
    await expect(page).toHaveURL(/\/admin\/projekty\?status=DRAFT$/);
    await expect(page.getByTestId('project-row')).toHaveCount(drafts.length);
  });

  test('every missing-translation item opens its editor on the English tab', async ({
    page,
    request,
  }) => {
    const { missingTranslations } = await adminApi(request).then((api) =>
      api.get<Dashboard>('/dashboard'),
    );
    const types = [...new Set(missingTranslations.map((m) => m.type))];
    expect(types.length).toBeGreaterThan(0);
    await signIn(page, '/admin');
    for (const type of types) {
      const gap = missingTranslations.find((m) => m.type === type)!;
      await page.goto('/admin');
      await page
        .getByRole('link', { name: `Edytuj: ${gap.label}`, exact: true })
        .first()
        .click();
      // The editor (page, side panel or details dialog) shows its English tab selected.
      await expect(
        page.locator('[data-testid="lang-tab-en"][aria-selected="true"]').first(),
      ).toBeVisible();
    }
  });

  test('empty states', async ({ page }) => {
    await signIn(page, '/admin/pliki');
    await page.route('**/api/v1/admin/dashboard', (route) =>
      route.fulfill({
        json: {
          newMessages: 0,
          draftProjects: 0,
          availability: { status: 'OPEN', visible: true },
          recentMessages: [],
          missingTranslations: [],
        },
      }),
    );
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('no-messages')).toHaveText('Brak nowych wiadomości.');
    await expect(page.getByTestId('all-translated')).toHaveText('Wszystko przetłumaczone.');
  });
});

test.describe('messages', () => {
  test('tabs filter, search narrows, opening marks read, status changes and deletion', async ({
    page,
    request,
  }) => {
    const name = unique('Testowa Osoba');
    await createMessage(request, { name });
    await signIn(page, '/admin/wiadomosci?status=NEW');
    const items = page.getByTestId('message-item');
    await expect(items.first()).toBeVisible();
    for (const item of await items.all()) {
      await expect(item).toHaveClass(/unread/);
    }
    const badgeBefore = Number(
      await page.getByTestId('nav-badge').locator('[aria-hidden]').textContent(),
    );

    await page.getByTestId('messages-search').fill(name);
    await expect(page).toHaveURL(/q=/);
    await expect(items).toHaveCount(1);
    await items.first().click();
    await expect(page.getByTestId('message-detail')).toContainText(name);
    // Opened: read now, and the badge follows.
    await expect(page.getByTestId('nav-badge').locator('[aria-hidden]')).toHaveText(
      String(badgeBefore - 1),
    );
    await page.getByTestId('tab-READ').click();
    await expect(items).toHaveCount(1);
    await items.first().click();

    await page.getByTestId('archive').click();
    await expect(snack(page)).toContainText('Archiwum');
    await page.getByTestId('tab-ARCHIVED').click();
    await expect(items).toHaveCount(1);
    await items.first().click();

    await page.getByTestId('delete').click();
    await expect(page.getByTestId('confirm-message')).toContainText(name);
    await confirm(page);
    await expect(page.getByTestId('messages-empty')).toBeVisible();
  });

  test('reply opens the mail client in the visitor language with the message quoted', async ({
    page,
    request,
  }) => {
    const name = unique('English Visitor');
    await createMessage(request, { name, locale: 'en', topic: 'CONSULTATION' });
    await signIn(page, `/admin/wiadomosci?q=${encodeURIComponent(name)}`);
    await page.getByTestId('message-item').first().click();
    await expect(page.getByTestId('message-locale')).toHaveText('angielski');
    const href = await page.getByTestId('reply').getAttribute('href');
    expect(href).toMatch(/^mailto:english-visitor/);
    const query = new URLSearchParams(href!.split('?')[1]);
    expect(query.get('subject')).toBe('Re: A consultation or code review');
    expect(query.get('body')).toContain('> Wiadomość testowa panelu administracyjnego');

    await page
      .getByTestId('reply')
      .evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
    await page.getByTestId('reply').click();
    await expect(page.getByTestId('mark-replied')).toHaveClass(/suggested/);
    await page.getByTestId('mark-replied').click();
    await expect(page.getByTestId('mark-replied')).toHaveCount(0);

    await page.getByTestId('delete').click();
    await confirm(page);
  });

  test('budget and timeline show their Polish labels', async ({ page }) => {
    await signIn(page, '/admin/wiadomosci/00000000-0000-4000-8000-000000000501');
    await expect(page.getByTestId('message-budget')).toHaveText('10 000–30 000 zł');
    await expect(page.getByTestId('message-topic')).toHaveText('Projekt lub współpraca');
    await expectNoAxeViolations(page);
  });

  test('pagination moves through pages', async ({ page }) => {
    await signIn(page, '/admin/pliki');
    const item = (i: number) => ({
      id: `00000000-0000-4000-8000-${String(900000000000 + i)}`,
      name: `Osoba ${i}`,
      email: 'x@example.test',
      topic: 'OTHER',
      locale: 'pl',
      status: 'READ',
      preview: 'Podgląd',
      createdAt: new Date().toISOString(),
    });
    await page.route('**/api/v1/admin/messages?*', (route) => {
      const pageNo = Number(new URL(route.request().url()).searchParams.get('page') ?? 0);
      return route.fulfill({
        json: {
          items: Array.from({ length: 20 }, (_, i) => item(pageNo * 20 + i)),
          total: 45,
          page: pageNo,
          size: 20,
          counts: { READ: 45 },
        },
      });
    });
    await page.getByTestId('nav-messages').click();
    await expect(page.getByTestId('pager-label')).toHaveText('Strona 1 z 3');
    await page.getByRole('button', { name: 'Następna strona' }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(page.getByTestId('pager-label')).toHaveText('Strona 2 z 3');
    await expect(page.getByTestId('message-item').first()).toContainText('Osoba 20');
  });
});
