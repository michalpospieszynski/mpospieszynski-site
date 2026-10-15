import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// Acceptance criteria of docs/screens/public/10-not-found.md.

for (const [url, lang, title] of [
  ['/nie-ma-takiej-strony', 'pl', 'Ta strona nie istnieje'],
  ['/en/missing', 'en', "This page doesn't exist"],
] as const) {
  test(`${url} answers 404 in ${lang}, noindex, without alternates`, async ({ request, page }) => {
    const response = await request.get(url);
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toMatch(new RegExp(`<html[^>]*\\blang="${lang}"`));
    expect(html).toMatch(/<meta name="robots" content="noindex">/);
    expect(html).not.toMatch(/<link rel="alternate"/);
    expect(html).not.toMatch(/<link rel="canonical"/);

    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page).toHaveURL(new RegExp(`${url}$`));
    await expectNoAxeViolations(page);
  });
}

test('/projekty/unknown-slug answers 404 and keeps the URL', async ({ request, page }) => {
  expect((await request.get('/projekty/unknown-slug')).status()).toBe(404);
  await page.goto('/projekty/unknown-slug');
  await expect(page).toHaveURL(/\/projekty\/unknown-slug$/);
  await expect(page.getByTestId('not-found')).toBeVisible();
});
