import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// Acceptance criteria of docs/screens/public/05-skills.md, against the dev sample content: three areas,
// Java since 2012 in 3 projects, Spring Boot described in Polish only, Kubernetes hidden.

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

test('areas show their technologies and published evidence in the page language', async ({
  page,
}) => {
  await open(page, '/umiejetnosci');
  const areas = page.getByTestId('area');
  await expect(areas.getByRole('heading', { level: 3 })).toHaveText([
    'Projektowanie API',
    'Wydajność baz danych',
    'Migracje bez przestoju',
  ]);
  const api = areas.first();
  await expect(api.getByRole('link', { name: 'Spring Boot' })).toHaveAttribute(
    'href',
    '/projekty?tech=spring-boot',
  );
  await expect(api.getByRole('link', { name: 'System przetwarzania zamówień' })).toHaveAttribute(
    'href',
    '/projekty/system-zamowien',
  );

  await open(page, '/en/skills');
  const db = page.getByTestId('area').nth(1);
  await expect(db.getByRole('link', { name: 'Order processing system' })).toHaveAttribute(
    'href',
    '/en/projects/order-processing-api',
  );
  const polish = db.getByRole('link', { name: 'Raporty sprzedaży' });
  await expect(polish).toHaveAttribute('href', '/projekty/raporty-sprzedazy');
  await expect(db).toContainText('Polish only');
});

test('technologies show description, since-year and a plural count linking to filtered projects', async ({
  page,
}) => {
  await open(page, '/umiejetnosci');
  const java = page.getByTestId('tech-java');
  await expect(java).toContainText('Główny język, w którym piszę backendy.');
  await expect(java).toContainText('od 2012');
  await expect(java).toContainText('3 projekty');
  await expect(java.getByRole('link', { name: 'Java – 3 projekty' })).toHaveAttribute(
    'href',
    '/projekty?tech=java',
  );

  // Used by one published project.
  await expect(page.getByTestId('tech-angular')).toContainText('1 projekt');
  // Used by no published project: no count and no link.
  const rxjs = page.getByTestId('tech-rxjs');
  await expect(rxjs.getByRole('link')).toHaveCount(0);
  await expect(rxjs).not.toContainText('projekt');
});

test('hidden technologies and empty categories do not appear', async ({ page }) => {
  await open(page, '/umiejetnosci');
  await expect(page.getByTestId('tech-kubernetes')).toHaveCount(0);
  await expect(page.getByTestId('tech-docker')).toBeVisible();
});

test('the English page falls back to Polish descriptions with lang="pl"', async ({ page }) => {
  await open(page, '/en/skills');
  await expect(page.getByTestId('tech-java')).toContainText(
    'The main language I write backends in.',
  );
  const spring = page.getByTestId('tech-spring-boot').locator('[lang="pl"]');
  await expect(spring).toHaveText('Podstawa API i usług: konfiguracja, bezpieczeństwo, testy.');
  await expect(page.getByTestId('tech-java')).toContainText('since 2012');
  await expect(page.getByTestId('tech-java')).toContainText('3 projects');
});

test('there are no skill level indicators', async ({ page }) => {
  await open(page, '/umiejetnosci');
  await expect(page.locator('progress, meter, [role="progressbar"], [role="meter"]')).toHaveCount(
    0,
  );
  await expect(page.locator('main')).not.toContainText('%');
});

test.describe('accessibility', () => {
  for (const url of ['/umiejetnosci', '/en/skills']) {
    test(`axe finds nothing on ${url}`, async ({ page }) => {
      await open(page, url);
      await expectNoAxeViolations(page);
    });
  }
});
