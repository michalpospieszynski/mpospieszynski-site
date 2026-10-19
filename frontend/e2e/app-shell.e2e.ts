import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// Acceptance criteria of docs/screens/public/01-app-shell.md.

/** Waits until the page has hydrated and is interactive (the dev server streams scripts after the HTML). */
async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/** The five page links of the header (the bar also holds the brand and the language pill). */
const tabs = (page: Page) => page.getByTestId('main-nav').locator('[data-testid^="tab-"]');

const TABS = {
  pl: ['Projekty', 'Umiejętności', 'Usługi', 'O mnie', 'Kontakt'],
  en: ['Projects', 'Skills', 'Services', 'About', 'Contact'],
};

test.describe('header', () => {
  for (const [lang, home] of [
    ['pl', '/'],
    ['en', '/en'],
  ] as const) {
    test(`shows the five tabs and the logo link in ${lang}`, async ({ page }) => {
      await open(page, home);
      await expect(tabs(page)).toHaveText(TABS[lang]);
      await expect(page.getByTestId('brand')).toHaveAttribute('href', home);
      await expect(page.getByTestId('main-nav').locator('[aria-current="page"]')).toHaveCount(0);
    });
  }

  test('marks the active tab in both languages, also with filters', async ({ page }) => {
    await open(page, '/projekty?kind=CLIENT');
    await expect(page.getByTestId('tab-projects')).toHaveAttribute('aria-current', 'page');
    await page.getByTestId('tab-projects').click();
    await expect(page).toHaveURL(/\/projekty$/);
    await page.getByTestId('brand').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('main-nav').locator('[aria-current="page"]')).toHaveCount(0);

    await open(page, '/en/projects');
    await expect(page.getByTestId('tab-projects')).toHaveAttribute('aria-current', 'page');
  });

  test('marks "Projekty" active on a case study', async ({ page }) => {
    await open(page, '/projekty/system-zamowien');
    await expect(page.getByTestId('tab-projects')).toHaveAttribute('aria-current', 'page');
  });

  test('switching language keeps query parameters on list pages', async ({ page }) => {
    await open(page, '/projekty?kind=CLIENT&tech=java');
    await expect(page.getByTestId('switch-en')).toHaveAttribute(
      'href',
      '/en/projects?kind=CLIENT&tech=java',
    );
    await page.getByTestId('switch-en').click();
    await expect(page).toHaveURL(/\/en\/projects\?kind=CLIENT&tech=java$/);
    await expect(page.getByTestId('result-count')).toHaveText('2 projects found');
  });

  // The case-study switcher (English slug, or the list with a note) is covered in project-detail.e2e.ts.

  test('the language pill switches Home and back', async ({ page }) => {
    await open(page, '/');
    const toEnglish = page.getByTestId('switch-en');
    await expect(toEnglish).toHaveText('EN');
    await expect(toEnglish).toHaveAttribute('aria-label', 'Switch to English');
    await expect(toEnglish).toHaveAttribute('hreflang', 'en');
    await toEnglish.click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const toPolish = page.getByTestId('switch-pl');
    await expect(toPolish).toHaveText('PL');
    await expect(toPolish).toHaveAttribute('lang', 'pl');
    await toPolish.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });

  test('five Polish tabs fit on one line at 900px', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await open(page, '/');
    const tops = await tabs(page).evaluateAll((links) =>
      links.map((l) => Math.round(l.getBoundingClientRect().top)),
    );
    expect(tops).toHaveLength(5);
    expect(new Set(tops).size).toBe(1);
    const lines = await tabs(page).evaluateAll((links) =>
      links.map((l) => l.getClientRects().length),
    );
    expect(lines.every((rects) => rects === 1)).toBe(true);
  });
});

test.describe('server-rendered language', () => {
  test('<html lang> is pl on Polish pages and en on English pages', async ({ request }) => {
    const pl = await (await request.get('/')).text();
    const en = await (await request.get('/en')).text();
    expect(pl).toMatch(/<html[^>]*\blang="pl"/);
    expect(en).toMatch(/<html[^>]*\blang="en"/);
    expect(pl).toContain('application/ld+json');
  });
});

test.describe('theme', () => {
  const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  for (const [scheme, theme, colour] of [
    ['dark', 'dark', 'rgb(12, 38, 32)'],
    ['light', 'light', 'rgb(246, 241, 231)'],
  ] as const) {
    test(`a first visit follows the system preference (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, '/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await background(page)).toBe(colour);
    });
  }

  test('the toggle switches the theme and the choice persists with no flash', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page, '/');
    const toggle = page.getByTestId('theme-toggle');
    await expect(toggle).toHaveAccessibleName('Włącz jasny motyw');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAccessibleName('Włącz ciemny motyw');

    // Record the attribute as soon as the HTML is parsed, before Angular's scripts run.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        (window as unknown as { themeAtParse: string | null }).themeAtParse =
          document.documentElement.getAttribute('data-theme');
      });
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(() => (window as unknown as { themeAtParse: string | null }).themeAtParse),
    ).toBe('light');
    await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('Włącz ciemny motyw');
  });
});

test.describe('footer', () => {
  test('links the pages, the case study of this site, privacy and the profiles', async ({
    page,
  }) => {
    await open(page, '/en');
    const footer = page.getByTestId('footer');
    await expect(footer.getByTestId('how-built')).toHaveAttribute(
      'href',
      '/en/projects/how-this-site-is-built',
    );
    await expect(footer.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/en/privacy',
    );
    await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'rel',
      'me noopener',
    );
    await expect(footer).toContainText(`© ${new Date().getFullYear()} Michał Pospieszyński`);
  });
});

test.describe('language hint', () => {
  test.use({ locale: 'en-GB' });

  test('appears on Polish pages for English browsers and never again after dismissing', async ({
    page,
  }) => {
    await open(page, '/');
    const hint = page.getByTestId('lang-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute('lang', 'en');

    await page.getByTestId('lang-hint-dismiss').click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('lang-hint')).toHaveCount(0);
  });

  test('"Switch to English" goes to the English page and dismisses the hint', async ({ page }) => {
    await open(page, '/');
    await page.getByTestId('lang-hint-switch').click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByTestId('lang-hint')).toHaveCount(0);
    // The choice is remembered: the bare home address now opens the English home page.
    await open(page, '/');
    await expect(page).toHaveURL(/\/en$/);
    await open(page, '/projekty');
    await expect(page.getByTestId('lang-hint')).toHaveCount(0);
  });

  test('never appears on English pages', async ({ page }) => {
    await open(page, '/en');
    await expect(page.getByTestId('lang-hint')).toHaveCount(0);
  });
});

test.describe('language hint for Polish browsers', () => {
  test.use({ locale: 'pl-PL' });

  test('does not appear', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('lang-hint')).toHaveCount(0);
  });
});

test.describe('menu sheet below 900px', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('works with the keyboard only and returns focus to the Menu button', async ({ page }) => {
    await open(page, '/');
    await expect(tabs(page).first()).toBeHidden();
    await expect(page.getByTestId('switch-en')).toBeVisible();
    const menuButton = page.getByTestId('menu-button');
    await menuButton.focus();
    await page.keyboard.press('Enter');

    const sheet = page.getByTestId('menu-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link')).toHaveText(TABS.pl);
    await expectNoAxeViolations(page);

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(menuButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(sheet).toBeVisible();
    await page.getByTestId('menu-close').focus();
    await page.keyboard.press('Enter');
    await expect(sheet).toBeHidden();
    await expect(menuButton).toBeFocused();
  });
});

test.describe('accessibility', () => {
  for (const url of ['/', '/en']) {
    for (const scheme of ['dark', 'light'] as const) {
      test(`axe finds nothing on ${url} (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await open(page, url);
        await expectNoAxeViolations(page);
      });
    }
  }

  test('the skip link moves focus to the content and stays on the page', async ({ page }) => {
    await open(page, '/projekty');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Przejdź do treści' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#content')).toBeFocused();
    await expect(page).toHaveURL(/\/projekty$/);
  });
});

test.describe('remembered language', () => {
  async function choose(page: Page, lang: 'pl' | 'en'): Promise<void> {
    await open(page, '/en');
    await page.evaluate((value) => localStorage.setItem('lang', value), lang);
  }

  test('after choosing English, the bare home address opens /en and keeps the query', async ({ page }) => {
    await choose(page, 'en');
    await open(page, '/?utm_source=test');
    await expect(page).toHaveURL(/\/en\?utm_source=test$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('deep Polish links stay Polish', async ({ page }) => {
    await choose(page, 'en');
    await open(page, '/projekty');
    await expect(page).toHaveURL(/\/projekty$/);
  });

  test('choosing Polish with the pill keeps / Polish again', async ({ page }) => {
    await choose(page, 'en');
    await page.getByTestId('switch-pl').click();
    await expect(page).toHaveURL(/\/$/);
    await open(page, '/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });

  test('without a choice / is Polish', async ({ page }) => {
    await open(page, '/');
    await expect(page).toHaveURL(/\/$/);
  });
});
