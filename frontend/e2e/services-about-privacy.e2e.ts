import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// Acceptance criteria of docs/screens/public/06-services.md, 07-about.md and 09-privacy.md,
// against the dev sample content (four active services, 304 Polish only; availability LIMITED from 2026-12-01).

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

test.describe('services', () => {
  test('active services appear in order with deliverables and price notes', async ({ page }) => {
    await open(page, '/uslugi');
    const offerings = page.getByTestId('offering');
    await expect(offerings.getByRole('heading', { level: 2 })).toHaveText([
      'Nowy backend',
      'Przyspieszenie systemu',
      'Konsultacje',
      'Audyt bezpieczeństwa API',
    ]);
    await expect(offerings.first()).toContainText('Implementacja i testy');
    await expect(offerings.first().getByTestId('price-note')).toHaveText('Wycena po rozmowie');
    await expect(page.getByText('Usługa wycofana')).toHaveCount(0);

    await open(page, '/en/services');
    await expect(page.getByTestId('offering').first().getByTestId('price-note')).toHaveText(
      'Quoted after a call',
    );
  });

  test('"Ask about this service" preselects it on the contact form', async ({ page }) => {
    await open(page, '/uslugi');
    const ask = page.getByTestId('offering').nth(1).getByTestId('ask').getByRole('link');
    await expect(ask).toHaveAttribute(
      'href',
      '/kontakt?topic=PROJECT&service=00000000-0000-4000-8000-000000000302',
    );
  });

  test('more details toggle with aria-expanded', async ({ page }) => {
    await open(page, '/uslugi');
    const first = page.getByTestId('offering').first();
    const toggle = first.getByTestId('details-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(first.getByTestId('details')).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(first.getByTestId('details')).toContainText('Zaczynam od modelu danych');
    // No description, no toggle.
    await expect(page.getByTestId('offering').nth(1).getByTestId('details-toggle')).toHaveCount(0);
  });

  test('availability shows the localised month', async ({ page }) => {
    await open(page, '/uslugi');
    await expect(page.getByTestId('availability')).toHaveText(
      /Ograniczona dostępność\s*· od grudnia 2026/,
    );
    await open(page, '/en/services');
    await expect(page.getByTestId('availability')).toHaveText(
      /Limited availability\s*· from December 2026/,
    );
  });

  test('the English page falls back to Polish service texts with lang="pl"', async ({ page }) => {
    await open(page, '/en/services');
    const polish = page.getByTestId('offering').nth(3);
    await expect(polish).toHaveAttribute('lang', 'pl');
    await expect(polish.getByTestId('ask')).toHaveAttribute('lang', 'en');
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the FAQ opens', async ({ page }) => {
      await page.goto('/uslugi');
      const item = page.getByTestId('faq').locator('details').first();
      await expect(item.getByText('Tak, z klientami z całej Europy.')).toBeHidden();
      await item.locator('summary').click();
      await expect(item.getByText('Tak, z klientami z całej Europy.')).toBeVisible();
    });
  });
});

test.describe('about', () => {
  test('about and approach render from settings in the page language', async ({ page }) => {
    await open(page, '/o-mnie');
    await expect(page.getByTestId('about-text')).toContainText('Od lat buduję systemy');
    await expect(page.getByTestId('approach')).toContainText('Zaczynam od pomiaru');
    await open(page, '/en/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
    await expect(page.getByTestId('approach')).toContainText('How I work');
  });

  test('links and CTA render; the email address can be copied', async ({ page }) => {
    await open(page, '/o-mnie');
    const links = page.getByTestId('links');
    await expect(links.getByRole('link', { name: 'E-mail' })).toHaveAttribute(
      'href',
      'mailto:pospieszynski.michal@gmail.com',
    );
    await expect(links).toContainText('pospieszynski.michal@gmail.com');
    await expect(page.getByTestId('portrait')).toHaveCount(0);
  });

  test('no CV or job-seeking language', async ({ page }) => {
    await open(page, '/o-mnie');
    const text = (await page.locator('main').innerText()).toLowerCase();
    for (const word of ['cv', 'curriculum', 'szukam pracy', 'zatrudnienie']) {
      expect(text).not.toContain(word);
    }
  });
});

test.describe('privacy', () => {
  for (const [url, first] of [
    ['/polityka-prywatnosci', 'Administrator danych'],
    ['/en/privacy', 'Data controller'],
  ] as const) {
    test(`${url} renders server-side with a working table of contents`, async ({
      request,
      page,
    }) => {
      const html = await (await request.get(url)).text();
      expect(html).toContain(`>${first}</h2>`);

      await open(page, url);
      const toc = page.getByTestId('toc').getByRole('link');
      await expect(toc).toHaveCount(8);
      const href = (await toc.nth(4).getAttribute('href')) ?? '';
      expect(href.startsWith(url + '#')).toBe(true);
      await toc.nth(4).click();
      await expect(page).toHaveURL(new RegExp(`${url}#`));
      await expect(page.locator(`h2#${href.split('#')[1]}`)).toBeInViewport();
    });
  }

  test('all processors named in the architecture are listed', async ({ page }) => {
    await open(page, '/polityka-prywatnosci');
    for (const processor of ['Supabase', 'Cloudflare', 'SMTP']) {
      await expect(page.locator('main')).toContainText(processor);
    }
  });

  test('the footer link opens the policy in the same language', async ({ page }) => {
    await open(page, '/en');
    await page.getByTestId('footer').getByRole('link', { name: 'Privacy policy' }).click();
    await expect(page).toHaveURL(/\/en\/privacy$/);
  });
});

test.describe('accessibility', () => {
  for (const url of [
    '/uslugi',
    '/en/services',
    '/o-mnie',
    '/en/about',
    '/polityka-prywatnosci',
    '/en/privacy',
  ]) {
    test(`axe finds nothing on ${url}`, async ({ page }) => {
      await open(page, url);
      await expectNoAxeViolations(page);
    });
  }
});
