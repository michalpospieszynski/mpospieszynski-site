import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// Acceptance criteria of docs/screens/public/04-project-detail.md, against the dev sample content.
// "System przetwarzania zamówień" (101) has a cover, a two-image gallery and a Java code block.

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

test('a Polish case study renders server-side with every section that has content', async ({
  request,
}) => {
  const html = await (await request.get('/projekty/system-zamowien')).text();
  for (const heading of ['Problem', 'Rozwiązanie', 'Rezultat', 'Wnioski', 'Galeria']) {
    expect(html).toContain(`>${heading}</h2>`);
  }
  expect(html).toContain('System przetwarzania zamówień</h1>');
  expect(html).toMatch(/<meta property="og:type" content="article">/);
  expect(html).toContain('"@type":"CreativeWork"');
});

test('code blocks are highlighted in the SSR HTML', async ({ request }) => {
  const html = await (await request.get('/projekty/system-zamowien')).text();
  expect(html).toMatch(/<code class="hljs language-java">/);
  expect(html).toMatch(/<span class="hljs-keyword">public<\/span>/);
});

test('optional parts are left out when empty', async ({ page }) => {
  await open(page, '/en/projects/how-this-site-is-built');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How this site is built');
  await expect(page.getByTestId('gallery')).toHaveCount(0);
  await expect(page.getByTestId('cover')).toHaveCount(0);
});

test('the English counterpart renders at its slug and the switcher links both ways', async ({
  page,
}) => {
  await open(page, '/projekty/system-zamowien');
  await expect(page.getByTestId('switch-en')).toHaveAttribute(
    'href',
    '/en/projects/order-processing-api',
  );
  await expect(page.getByTestId('tab-projects')).toHaveAttribute('aria-current', 'page');

  await page.getByTestId('switch-en').click();
  await expect(page).toHaveURL(/\/en\/projects\/order-processing-api$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Order processing system');
  await expect(page.getByTestId('switch-pl')).toHaveAttribute('href', '/projekty/system-zamowien');
});

test('a Polish-only case study switches to the English list with a note', async ({ page }) => {
  await open(page, '/projekty/raporty-sprzedazy');
  await expect(page.getByTestId('switch-en')).toHaveAttribute(
    'href',
    '/en/projects?notTranslated=1',
  );
  await page.getByTestId('switch-en').click();
  await expect(page.getByTestId('not-translated-note')).toBeVisible();
});

test('previous/next stay within the current language', async ({ page }) => {
  await open(page, '/projekty/jak-zbudowana-jest-ta-strona');
  await expect(page.getByTestId('next')).toHaveAttribute('href', '/projekty/raporty-sprzedazy');
  await expect(page.getByTestId('prev')).toHaveAttribute('href', '/projekty/migracja-platnosci');

  await open(page, '/en/projects/how-this-site-is-built');
  await expect(page.getByTestId('next')).toHaveCount(0);
  await page.getByTestId('prev').click();
  await expect(page).toHaveURL(/\/en\/projects\/payments-migration$/);
});

test('the CTA links to the contact form with topic and project', async ({ page }) => {
  await open(page, '/projekty/system-zamowien');
  await expect(page.getByTestId('cta').getByRole('link')).toHaveAttribute(
    'href',
    '/kontakt?topic=PROJECT&project=system-zamowien',
  );
});

test.describe('gallery viewer', () => {
  test('works with mouse and keyboard', async ({ page }) => {
    await open(page, '/projekty/system-zamowien');
    const viewer = page.getByTestId('viewer');
    const position = page.getByTestId('viewer-position');

    // Mouse: thumbnails are buttons named by their alt text.
    await page.getByRole('button', { name: /Schemat: import zamówień/ }).click();
    await expect(viewer).toBeVisible();
    await expect(position).toHaveText('Obraz 1 z 2');
    await page.getByTestId('viewer-next').click();
    await expect(position).toHaveText('Obraz 2 z 2');
    await expect(page.getByTestId('viewer-image')).toHaveAttribute(
      'src',
      '/media/sample-orders-outbox.svg',
    );
    await page.getByTestId('viewer-close').click();
    await expect(viewer).toBeHidden();
    await expect(page.getByTestId('thumb-0')).toBeFocused();

    // Keyboard only.
    await page.getByTestId('thumb-1').focus();
    await page.keyboard.press('Enter');
    await expect(position).toHaveText('Obraz 2 z 2');
    await page.keyboard.press('ArrowRight');
    await expect(position).toHaveText('Obraz 1 z 2');
    await page.keyboard.press('ArrowLeft');
    await expect(position).toHaveText('Obraz 2 z 2');
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(page.getByTestId('thumb-1')).toBeFocused();
  });

  test.describe('on a touch screen', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 800 } });

    test('swipes between images', async ({ page }) => {
      await open(page, '/projekty/system-zamowien');
      await page.getByTestId('thumb-0').tap();
      const position = page.getByTestId('viewer-position');
      await expect(position).toHaveText('Obraz 1 z 2');

      const image = await page.getByTestId('viewer-image').boundingBox();
      const y = image!.y + image!.height / 2;
      const swipe = async (from: number, to: number) => {
        await page
          .getByTestId('viewer')
          .dispatchEvent('pointerdown', { pointerType: 'touch', clientX: from, clientY: y });
        await page
          .getByTestId('viewer')
          .dispatchEvent('pointerup', { pointerType: 'touch', clientX: to, clientY: y });
      };
      await swipe(300, 100);
      await expect(position).toHaveText('Obraz 2 z 2');
      await swipe(100, 300);
      await expect(position).toHaveText('Obraz 1 z 2');
    });
  });
});

test.describe('accessibility', () => {
  for (const url of [
    '/projekty/system-zamowien',
    '/en/projects/order-processing-api',
    '/projekty/raporty-sprzedazy',
  ]) {
    test(`axe finds nothing on ${url}`, async ({ page }) => {
      await open(page, url);
      await expectNoAxeViolations(page);
    });
  }
});
