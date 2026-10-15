import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// Acceptance criteria of docs/screens/public/03-projects-list.md, against the dev sample content:
// four published projects (three featured, "Raporty sprzedaży" Polish only) and one draft.

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

test('lists published projects only, featured first, in both languages', async ({ page }) => {
  await open(page, '/projekty');
  await expect(page.getByTestId('project-features').getByRole('heading')).toHaveText([
    'System przetwarzania zamówień',
    'Migracja płatności',
    'Jak zbudowana jest ta strona',
  ]);
  await expect(page.getByTestId('project-items').getByRole('link')).toHaveCount(1);
  await expect(page.getByText('Szkic projektu')).toHaveCount(0);

  await open(page, '/en/projects');
  await expect(page.getByTestId('project-features').getByRole('heading')).toHaveText([
    'Order processing system',
    'Payments migration',
    'How this site is built',
  ]);
  await expect(page.getByText('Draft project')).toHaveCount(0);
});

test('?kind=CLIENT&tech=spring-boot filters and survives a reload', async ({ page }) => {
  await open(page, '/projekty?kind=CLIENT&tech=spring-boot');
  await expect(page.getByTestId('result-count')).toHaveText('Znaleziono 2 projekty');
  await expect(page.getByTestId('project-items').getByRole('link')).toHaveCount(2);
  await expect(page.getByTestId('kind-CLIENT')).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('tech-filter')).toHaveValue('spring-boot');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('result-count')).toHaveText('Znaleziono 2 projekty');
});

test('filters by clicking and clears them', async ({ page }) => {
  await open(page, '/projekty');
  await page.getByTestId('kind-OPEN_SOURCE').click();
  await expect(page).toHaveURL(/\/projekty\?kind=OPEN_SOURCE$/);
  await expect(page.getByTestId('result-count')).toHaveText('Znaleziono 1 projekt');

  await page.getByTestId('tech-filter').selectOption('java');
  await expect(page).toHaveURL(/kind=OPEN_SOURCE/);
  await expect(page).toHaveURL(/tech=java/);
  await expect(page.getByText('Żaden projekt nie pasuje do wybranych filtrów.')).toBeVisible();

  await page.getByTestId('clear-filters').click();
  await expect(page).toHaveURL(/\/projekty$/);
  await expect(page.getByTestId('project-features').getByRole('heading')).toHaveCount(3);
});

test('unknown filter values are ignored', async ({ page }) => {
  await open(page, '/projekty?kind=SECRET&tech=cobol');
  await expect(page.getByTestId('project-features').getByRole('heading')).toHaveCount(3);
  await expect(page.getByTestId('result-count')).toHaveText('');
});

test('Polish-only projects are labelled and linked to the Polish page on /en/projects', async ({
  page,
}) => {
  await open(page, '/en/projects');
  const row = page.getByTestId('project-items').getByRole('link');
  await expect(row).toHaveAttribute('href', '/projekty/raporty-sprzedazy');
  await expect(row).toHaveAttribute('hreflang', 'pl');
  await expect(row).toContainText('Polish only');
  await expect(row.locator('[lang="pl"]')).toHaveText('Raporty sprzedaży');
});

test('?notTranslated=1 shows the note on the English page only', async ({ page }) => {
  await open(page, '/en/projects?notTranslated=1');
  await expect(page.getByTestId('not-translated-note')).toBeVisible();
  await open(page, '/projekty?notTranslated=1');
  await expect(page.getByTestId('not-translated-note')).toHaveCount(0);
});

test('filtered views are noindex; the unfiltered view is indexable with alternates', async ({
  request,
}) => {
  const plain = await (await request.get('/projekty')).text();
  expect(plain).not.toMatch(/name="robots"/);
  expect(plain).toMatch(/<link rel="canonical" href="[^"]*\/projekty">/);
  expect(plain).toMatch(/hreflang="en" href="[^"]*\/en\/projects"/);

  const filtered = await (await request.get('/projekty?kind=CLIENT')).text();
  expect(filtered).toMatch(/<meta name="robots" content="noindex, follow">/);
  expect(filtered).toMatch(/<link rel="canonical" href="[^"]*\/projekty">/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('filters work through links and the GET form', async ({ page }) => {
    await page.goto('/projekty');
    await page.getByTestId('kind-CLIENT').click();
    await expect(page).toHaveURL(/kind=CLIENT/);
    await expect(page.getByTestId('result-count')).toHaveText('Znaleziono 2 projekty');

    await page.getByTestId('tech-filter').selectOption('docker');
    await page.getByTestId('tech-apply').click();
    await expect(page).toHaveURL(/kind=CLIENT/);
    await expect(page).toHaveURL(/tech=docker/);
    await expect(page.getByTestId('result-count')).toHaveText('Znaleziono 1 projekt');
  });
});

test.describe('accessibility', () => {
  for (const url of [
    '/projekty',
    '/en/projects',
    '/projekty?kind=CLIENT&tech=java',
    '/projekty?tech=angular&kind=OPEN_SOURCE',
  ]) {
    test(`axe finds nothing on ${url}`, async ({ page }) => {
      await open(page, url);
      await expectNoAxeViolations(page);
    });
  }

  test('axe finds nothing on /en/projects with the not-translated note', async ({ page }) => {
    await open(page, '/en/projects?notTranslated=1');
    await expectNoAxeViolations(page);
  });
});
