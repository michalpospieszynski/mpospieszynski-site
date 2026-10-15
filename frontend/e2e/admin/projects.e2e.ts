import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from '../axe';
import { AdminApi, adminApi, confirm, signIn, snack } from './admin';

// Acceptance criteria of docs/screens/admin/05-projects-list.md and 06-project-editor.md. Every test works on
// projects it creates and deletes them afterwards; the seeded ones are only read.

const DRAFT_105 = '00000000-0000-4000-8000-000000000105';
const created: string[] = [];
let api: AdminApi;

test.beforeEach(async ({ request }) => {
  api = await adminApi(request);
});

test.afterEach(async () => {
  for (const id of created.splice(0)) {
    await api.send('DELETE', `/projects/${id}`).catch(() => undefined);
  }
});

function suffix(): string {
  return Date.now().toString(36);
}

async function createDraft(title: string, slug: string): Promise<string> {
  const saved = await api.send<{ id: string }>('POST', '/projects', {
    version: 0,
    translations: { pl: { title, slug } },
  });
  created.push(saved.id);
  return saved.id;
}

function idFromUrl(page: Page): string {
  return page.url().split('/').pop()!.split('?')[0];
}

test.describe('editor', () => {
  test('a draft needs only a Polish title; the slug is transliterated', async ({ page }) => {
    const s = suffix();
    await signIn(page, '/admin/projekty/nowy');
    await page.getByTestId('project-pl-title').fill(`Zażółć gęślą jaźń ${s}`);
    await expect(page.getByTestId('project-pl-slug')).toHaveValue(`zazolc-gesla-jazn-${s}`);
    await page.getByTestId('save').click();
    await expect(page).toHaveURL(/\/admin\/projekty\/[0-9a-f-]{36}$/);
    created.push(idFromUrl(page));
    await expect(page.getByTestId('project-status')).toHaveText('Szkic');
    await expect(page.getByTestId('save-status')).toContainText('Zapisano o');
  });

  test('slugs are checked for uniqueness per language', async ({ page }) => {
    await signIn(page, '/admin/projekty/nowy');
    await page.getByTestId('project-pl-title').fill('Kopia');
    await page.getByTestId('project-pl-slug').fill('system-zamowien');
    await page.getByTestId('project-pl-slug').blur();
    await expect(page.getByText('Ten adres jest już używany.')).toBeVisible();

    await page.getByTestId('lang-tab-en').click();
    await page.getByTestId('project-en-slug').fill('system-zamowien');
    await page.getByTestId('project-en-slug').blur();
    await page.waitForTimeout(800);
    await expect(page.locator('#project-texts mat-error:visible')).toHaveCount(0);
    // Leave without saving.
    await page.getByTestId('nav-projects').click();
    await confirm(page);
  });

  test('partially filled English blocks saving with the specific message', async ({ page }) => {
    const s = suffix();
    const id = await createDraft(`Częściowy ${s}`, `czesciowy-${s}`);
    await signIn(page, `/admin/projekty/${id}?lang=en`);
    await expect(page.getByTestId('lang-tab-en')).toHaveAttribute('aria-selected', 'true');
    await page.getByTestId('project-en-title').fill('Partial');
    await page.getByTestId('save').click();
    await expect(page.getByTestId('en-incomplete')).toHaveText(
      'Uzupełnij tytuł, adres i podsumowanie po angielsku albo wyczyść wersję angielską.',
    );
    // Cleared English saves as null.
    await page.getByTestId('project-en-title').fill('');
    await page.getByTestId('project-en-slug').fill('');
    await page.getByTestId('save').click();
    await expect(page.getByTestId('save-status')).toContainText('Zapisano o');
    expect(
      (await api.get<{ translations: { en: unknown } }>(`/projects/${id}`)).translations.en,
    ).toBeNull();
  });

  test('publishing lists missing fields, then publishes and the public site shows changes', async ({
    page,
    request,
  }) => {
    const s = suffix();
    const slug = `do-publikacji-${s}`;
    const id = await createDraft(`Do publikacji ${s}`, slug);
    await signIn(page, `/admin/projekty/${id}`);

    await page.getByTestId('publish').click();
    await expect(snack(page)).toContainText('Aby opublikować, uzupełnij:');
    await expect(snack(page)).toContainText('Podsumowanie (PL)');
    // The cover is optional.
    await expect(snack(page)).not.toContainText('Okładka');
    await expect(page.locator('#project-pl-summary')).toBeFocused();

    await page.getByTestId('project-pl-summary').fill('Krótkie podsumowanie.');
    for (const field of ['problemMd', 'solutionMd', 'outcomeMd']) {
      await page.locator(`#project-pl-${field}`).fill(`Treść pola ${field}.`);
    }
    await page.getByTestId('startedOn').fill('2024-04');
    await page.getByTestId('project-coverMediaId-pick').click();
    await page.getByRole('dialog').getByTestId('media-card').first().click();
    await page.getByTestId('media-pick').click();
    await page.getByTestId('publish').click();
    await expect(page.getByTestId('project-status')).toHaveText('Opublikowany');

    const html = await (await request.get(`/projekty/${slug}`)).text();
    expect(html).toContain('Krótkie podsumowanie.');

    // A change to a published project is public right after saving.
    await page.getByTestId('project-pl-summary').fill('Zmienione podsumowanie.');
    // "Zapisano o" is already shown from the publish, so wait for this save's own response.
    const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/projects/${id}`));
    await page.getByTestId('save').click();
    expect((await saved).ok()).toBe(true);
    expect(await (await request.get(`/projekty/${slug}`)).text()).toContain(
      'Zmienione podsumowanie.',
    );

    // Every image can be removed from a published project.
    await page.getByTestId('project-coverMediaId-remove').click();
    const withoutCover = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/projects/${id}`));
    await page.getByTestId('save').click();
    expect((await withoutCover).ok()).toBe(true);
    await expect(page.getByTestId('project-status')).toHaveText('Opublikowany');
    expect(await (await request.get(`/projekty/${slug}`)).text()).not.toContain('data-testid="cover"');
  });

  test('a concurrent edit in another tab shows the conflict message', async ({ page, context }) => {
    const s = suffix();
    const id = await createDraft(`Konflikt ${s}`, `konflikt-${s}`);
    await signIn(page, `/admin/projekty/${id}`);
    const other = await context.newPage();
    await other.goto(`/admin/projekty/${id}`);
    await expect(other.getByTestId('project-pl-title')).toHaveValue(`Konflikt ${s}`);

    await page.getByTestId('project-pl-role').fill('Pierwsza karta');
    await page.getByTestId('save').click();
    await expect(page.getByTestId('save-status')).toContainText('Zapisano o');

    await other.getByTestId('project-pl-role').fill('Druga karta');
    await other.getByTestId('save').click();
    await expect(snack(other)).toHaveText(
      'Te dane zostały zmienione w innej karcie. Odśwież, aby zobaczyć najnowszą wersję.',
    );
    await other.getByRole('button', { name: 'Odśwież' }).click();
    await expect(other.getByTestId('project-pl-role')).toHaveValue('Pierwsza karta');
  });

  test('previews of a draft in both languages', async ({ page }) => {
    await signIn(page, `/admin/projekty/${DRAFT_105}/podglad?lang=pl`);
    await expect(page.getByTestId('preview-banner')).toContainText('Podgląd – niepublikowane');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Szkic projektu');
    await page.goto(`/admin/projekty/${DRAFT_105}/podglad?lang=en`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Draft project');
  });

  test('the editor passes axe', async ({ page }) => {
    await signIn(page, '/admin/projekty/00000000-0000-4000-8000-000000000101');
    await expect(page.getByTestId('project-pl-title')).not.toHaveValue('');
    await expectNoAxeViolations(page);
  });
});

test.describe('list', () => {
  test('filters and English status', async ({ page }) => {
    await signIn(page, '/admin/projekty');
    const sales = page.getByTestId('project-row').filter({ hasText: 'Raporty sprzedaży' });
    await expect(sales.getByTestId('en-status')).toHaveText('brak tłumaczenia');
    const orders = page
      .getByTestId('project-row')
      .filter({ hasText: 'System przetwarzania zamówień' });
    await expect(orders.getByTestId('en-status')).toHaveText('kompletne');

    await page.getByTestId('filter-DRAFT').click();
    await expect(page).toHaveURL(/status=DRAFT/);
    await expect(page.getByTestId('project-row').first()).toBeVisible();
    await expect(page.getByTestId('project-row').filter({ hasNotText: 'Szkic' })).toHaveCount(0);
    await page.getByTestId('filter-PUBLISHED').click();
    await expect(page.getByTestId('project-row').filter({ hasText: 'Szkic projektu' })).toHaveCount(
      0,
    );
    await expectNoAxeViolations(page);
  });

  test('reorder, featured, publish errors, archive and delete', async ({ page }) => {
    const s = suffix();
    const title = `Lista ${s}`;
    const id = await createDraft(title, `lista-${s}`);
    await signIn(page, '/admin/projekty');
    const rows = page.getByTestId('project-row');
    const row = rows.filter({ hasText: title });
    await expect(rows.last()).toContainText(title);

    // Moving up is saved right away and survives a reload.
    await row.getByRole('button', { name: `Przesuń wyżej: ${title}` }).click();
    await expect(snack(page)).toHaveText('Kolejność zapisana.');
    await page.reload();
    await expect(rows.last()).not.toContainText(title);

    await row.getByTestId('featured').click();
    await expect(snack(page)).toHaveText('Zapisano');
    await expect
      .poll(async () => (await api.get<{ featured: boolean }>(`/projects/${id}`)).featured)
      .toBe(true);

    await row.getByTestId('project-menu').click();
    await page.getByTestId('menu-publish').click();
    await expect(snack(page)).toContainText('Aby opublikować, uzupełnij:');

    await row.getByTestId('project-menu').click();
    await page.getByTestId('menu-archive').click();
    await expect(row).toContainText('Zarchiwizowany');

    await row.getByTestId('project-menu').click();
    await page.getByTestId('menu-delete').click();
    await expect(page.getByTestId('confirm-message')).toHaveText(
      `Usunąć projekt „${title}”? Tej operacji nie można cofnąć.`,
    );
    await confirm(page);
    await expect(row).toHaveCount(0);
  });
});
