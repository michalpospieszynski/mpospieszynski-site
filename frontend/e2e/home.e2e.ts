import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// Acceptance criteria of docs/screens/public/02-home.md, against the dev sample content.

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

const chip = (page: Page, name: string) =>
  page.getByTestId('chips').getByRole('button', { name, exact: true });

test('/ and /en render server-side with headline and intro from settings', async ({ request }) => {
  const pl = await (await request.get('/')).text();
  expect(pl).toMatch(/<h1[^>]*>Spokojne systemy dla ważnych procesów<\/h1>/);
  expect(pl).toContain('Projektuję i rozwijam backendy w Javie i Spring Boot');
  expect(pl).toContain(
    '<title>Michał Pospieszyński – Spokojne systemy dla ważnych procesów</title>',
  );
  const en = await (await request.get('/en')).text();
  expect(en).toMatch(/<h1[^>]*>Calm systems for processes that matter<\/h1>/);
  expect(en).toContain('"@type":"Person"');
});

test('every published project is a chip and a row in the projects band, in order', async ({
  page,
}) => {
  await open(page, '/');
  const titles = [
    'System przetwarzania zamówień',
    'Migracja płatności',
    'Jak zbudowana jest ta strona',
    'Raporty sprzedaży',
  ];
  await expect(page.getByTestId('chips').getByRole('button')).toHaveText(titles);
  const rows = page.getByTestId('project-row');
  await expect(rows.getByRole('heading')).toHaveText(titles);
  await expect(rows.first().getByRole('link')).toHaveAttribute('href', '/projekty/system-zamowien');

  // English page: the Polish-only project keeps its Polish title, lang and link.
  await open(page, '/en');
  const polishOnly = page.getByTestId('project-row').nth(3).getByRole('link');
  await expect(polishOnly).toHaveText('Raporty sprzedaży');
  await expect(polishOnly).toHaveAttribute('lang', 'pl');
  await expect(polishOnly).toHaveAttribute('href', '/projekty/raporty-sprzedazy');
});

test('a chip selects its project and opens the panel; again or close clears it', async ({
  page,
}) => {
  await open(page, '/');
  const payments = chip(page, 'Migracja płatności');
  await payments.click();
  await expect(payments).toHaveAttribute('aria-pressed', 'true');
  const panel = page.getByTestId('panel');
  await expect(panel.getByRole('heading')).toHaveText('Migracja płatności');
  await expect(panel.getByTestId('panel-link')).toHaveAttribute(
    'href',
    '/projekty/migracja-platnosci',
  );

  // Another chip moves the selection.
  await chip(page, 'Raporty sprzedaży').click();
  await expect(payments).toHaveAttribute('aria-pressed', 'false');
  await expect(panel.getByRole('heading')).toHaveText('Raporty sprzedaży');

  // Pressing the selected chip again clears it.
  await chip(page, 'Raporty sprzedaży').click();
  await expect(page.getByTestId('panel')).toHaveCount(0);

  // Close returns focus to the chip.
  await payments.click();
  await page.getByTestId('panel-close').click();
  await expect(page.getByTestId('panel')).toHaveCount(0);
  await expect(payments).toBeFocused();
  await expect(payments).toHaveAttribute('aria-pressed', 'false');
});

test('"Pokaż na grafie" selects the project, brings the hero into view and focuses its chip', async ({
  page,
}) => {
  await open(page, '/');
  const row = page.getByTestId('project-row').nth(2);
  await row.scrollIntoViewIfNeeded();
  await row.getByTestId('show-on-graph').click();

  const target = chip(page, 'Jak zbudowana jest ta strona');
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  await expect(target).toBeFocused();
  await expect(page.getByTestId('panel').getByRole('heading')).toHaveText(
    'Jak zbudowana jest ta strona',
  );
  await expect(page.getByTestId('graph')).toBeInViewport();
});

test('the graph is drawn in the browser and stops when leaving the page', async ({ page }) => {
  await open(page, '/');
  const canvas = page.getByTestId('graph').locator('canvas');
  await expect(canvas).toHaveAttribute('role', 'img');
  // Something was painted: the canvas is not blank.
  const painted = await canvas.evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    return data.some((v, i) => i % 4 === 3 && v > 0);
  });
  expect(painted).toBe(true);

  // Animation frames run only while the graph is on screen, and none after navigation.
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number };
    w.__frames = 0;
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.__frames++;
      return original(cb);
    };
  });
  const frames = () => page.evaluate(() => (window as unknown as { __frames: number }).__frames);
  let before = await frames();
  await page.waitForTimeout(300);
  expect(await frames()).toBeGreaterThan(before + 5);

  await page.getByTestId('home-contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  before = await frames();
  await page.waitForTimeout(500);
  expect((await frames()) - before).toBeLessThanOrEqual(1);

  await page.getByTestId('tab-services').click();
  await expect(page).toHaveURL(/\/uslugi$/);
  await page.waitForTimeout(300);
  before = await frames();
  await page.waitForTimeout(500);
  expect((await frames()) - before).toBeLessThanOrEqual(1);
});

test('active services appear as rows with a link to all services', async ({ page }) => {
  await open(page, '/');
  const services = page.getByTestId('services');
  // The sample's inactive service is left out.
  await expect(services.getByRole('heading', { level: 3 })).toHaveText([
    'Nowy backend',
    'Przyspieszenie systemu',
    'Konsultacje',
    'Audyt bezpieczeństwa API',
  ]);
  await expect(services.getByRole('link', { name: 'Wszystkie usługi' })).toHaveAttribute(
    'href',
    '/uslugi',
  );
});

test('the hero links lead to the contact and projects sections', async ({ page }) => {
  await open(page, '/');
  const contact = page.getByTestId('hero-contact').getByRole('link');
  await expect(contact).toHaveAttribute('href', '/#kontakt');
  await expect(page.getByTestId('hero-projects').getByRole('link')).toHaveAttribute(
    'href',
    '/#projekty',
  );
  await contact.click();
  await expect(page.getByTestId('home-contact')).toBeInViewport();
});

// Delivery (stored message, both mails) is covered against the real API in contact.e2e.ts; here the API is stubbed
// so the suite stays under the contact rate limit (5 messages per hour per IP).
test('the contact form validates and sends with topic OTHER', async ({ page }) => {
  await page.route('**/api/v1/public/contact', (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: '{"id":"x"}' }),
  );
  await open(page, '/en');
  const form = page.getByTestId('home-contact');
  await form.getByTestId('submit').click();
  await expect(page.locator('#home-contact-name')).toBeFocused();
  await expect(page.locator('#home-contact-name-error')).toHaveText('This field is required.');

  const sent = page.waitForRequest('**/api/v1/public/contact');
  await page.locator('#home-contact-name').fill('Anna Testowa');
  await page.locator('#home-contact-email').fill('anna@example.test');
  await page
    .locator('#home-contact-message')
    .fill('I need help speeding up a nightly order import.');
  await page.locator('#home-contact-consent').check();
  await form.getByTestId('submit').click();

  expect((await sent).postDataJSON()).toMatchObject({
    topic: 'OTHER',
    locale: 'en',
    name: 'Anna Testowa',
    consent: true,
  });
  const success = form.getByTestId('success');
  await expect(success).toBeVisible({ timeout: 20_000 });
  await expect(success.getByRole('heading')).toBeFocused();
  await expect(success).toContainText('anna@example.test');
});

test('there is no CV, job-seeking or availability messaging', async ({ page }) => {
  await open(page, '/');
  const text = (await page.locator('main').innerText()).toLowerCase();
  for (const word of ['cv', 'curriculum', 'szukam pracy', 'dostępn', 'przyjmuję nowe']) {
    expect(text).not.toContain(word);
  }
});

test.describe('accessibility', () => {
  for (const url of ['/', '/en']) {
    test(`axe finds nothing on ${url}`, async ({ page }) => {
      await open(page, url);
      await expectNoAxeViolations(page);
    });
  }

  test('axe finds nothing with the panel open and form errors shown', async ({ page }) => {
    await open(page, '/');
    await chip(page, 'Migracja płatności').click();
    await page.getByTestId('home-contact').getByTestId('submit').click();
    await expectNoAxeViolations(page);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the page and the selection still work', async ({ page }) => {
      await open(page, '/');
      await chip(page, 'Migracja płatności').click();
      await expect(page.getByTestId('panel')).toBeVisible();
      await expect(page.getByTestId('graph').locator('canvas')).toBeVisible();
    });
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 800 } });

    test('one column, a 440px graph card, nothing overflows', async ({ page }) => {
      await open(page, '/');
      const hero = await page.getByTestId('hero').locator('h1').boundingBox();
      const graph = await page.getByTestId('graph').boundingBox();
      expect(graph!.y).toBeGreaterThan(hero!.y);
      expect(Math.round(graph!.height)).toBe(440);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expectNoAxeViolations(page);
    });
  });
});
