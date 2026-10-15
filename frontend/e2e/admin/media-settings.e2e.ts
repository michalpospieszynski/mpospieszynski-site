import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from '../axe';
import { MAILPIT, adminApi, confirm, signIn, snack } from './admin';

// Acceptance criteria of docs/screens/admin/09-media.md and 10-settings.md.

/** A 3×2 PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAEUlEQVR42mP8z8Dwn4EIwDiqEAD/7wP9P5wqhgAAAABJRU5ErkJggg==',
  'base64',
);
const USED_MEDIA_URL = '/media/sample-orders-before-after.svg';

test.describe('media', () => {
  test('upload with dimensions, alt texts in both languages, served with long caching, delete', async ({
    page,
  }) => {
    const name = `test-${Date.now()}.png`;
    await signIn(page, '/admin/pliki');
    await page
      .getByTestId('media-file')
      .setInputFiles({ name, mimeType: 'image/png', buffer: PNG });
    // The details open for the uploaded file.
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('media-dimensions')).toHaveText('3×2');
    await dialog.getByTestId('media-alt-pl').fill('Trzy piksele na dwa.');
    await dialog.getByTestId('lang-tab-en').click();
    await dialog.getByTestId('media-alt-en').fill('Three pixels by two.');
    await dialog.getByTestId('media-save').click();
    await expect(dialog).toHaveCount(0);

    const card = page.getByTestId('media-card').filter({ hasText: name });
    await expect(card).toContainText('ALT PL: jest');
    await expect(card).toContainText('ALT EN: jest');
    await expect(card.getByTestId('media-usage')).toHaveText('nieużywany');

    const src = await card.locator('img').getAttribute('src');
    const served = await page.request.get(src!);
    expect(served.status()).toBe(200);
    expect(served.headers()['cache-control']).toContain('immutable');

    await card.click();
    await dialog.getByTestId('media-delete').click();
    await confirm(page);
    await expect(card).toHaveCount(0);
  });

  test('other types and files over 5 MB are rejected with clear messages', async ({ page }) => {
    await signIn(page, '/admin/pliki');
    await page.getByTestId('media-file').setInputFiles([
      { name: 'animacja.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') },
      { name: 'duzy.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) },
    ]);
    const errors = page.getByTestId('media-upload-error');
    await expect(errors.nth(0)).toHaveText(
      'Nieobsługiwany typ pliku: animacja.gif. Dozwolone: JPG, PNG, WebP.',
    );
    await expect(errors.nth(1)).toHaveText('Plik duzy.png jest za duży (maks. 5 MB).');
  });

  test('a used file lists its usages and cannot be deleted', async ({ page }) => {
    await signIn(page, '/admin/pliki');
    await page.locator(`[data-testid="media-card"]:has(img[src="${USED_MEDIA_URL}"])`).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('media-usages')).toContainText('Projekt „');
    await expect(dialog.getByTestId('media-delete')).toBeDisabled();
    await expect(dialog).toContainText('Plik jest używany i nie można go usunąć.');
    await expectNoAxeViolations(page);
  });
});

test.describe('settings', () => {
  interface Profile {
    version: number;
    fullName: string;
    availability: { status: string; from?: string; visible: boolean };
    translations: { pl: Record<string, string>; en: Record<string, string> | null };
    [key: string]: unknown;
  }

  /** Puts the profile back as it was, whatever the test changed. */
  async function restore(
    request: Parameters<typeof adminApi>[0],
    original: Profile,
  ): Promise<void> {
    const api = await adminApi(request);
    const current = await api.get<Profile>('/profile');
    const { enStatus: _ignored, ...input } = original as Profile & { enStatus?: string };
    await api.send('PUT', '/profile', { ...input, version: current.version });
  }

  test('partially filled English blocks saving with a specific message', async ({ page }) => {
    await signIn(page, '/admin/ustawienia?lang=en');
    await expect(page.getByTestId('lang-tab-en').first()).toHaveAttribute('aria-selected', 'true');
    await page.getByTestId('headline-en').fill('');
    await page.getByTestId('save').click();
    await expect(
      page.getByText('Wymagane, gdy wersja angielska jest wypełniona.').first(),
    ).toBeVisible();
    await expect(page.getByTestId('headline-en')).toBeFocused();
    await page.getByTestId('nav-dashboard').click();
    await confirm(page);
  });

  test('availability changes appear on Services and disappear when hidden', async ({
    page,
    request,
  }) => {
    const original = await (await adminApi(request)).get<Profile>('/profile');
    try {
      await signIn(page, '/admin/ustawienia#dostepnosc');
      await page.getByTestId('availability-OPEN').click();
      await page.getByTestId('save').click();
      await expect(page.getByTestId('save-status')).toContainText('Zapisano o');
      await page.goto('/uslugi');
      await expect(page.getByTestId('availability')).toContainText('Przyjmuję nowe projekty');

      await page.goto('/admin/ustawienia');
      await page.getByTestId('availability-visible').click();
      await page.getByTestId('save').click();
      await expect(page.getByTestId('save-status')).toContainText('Zapisano o');
      await page.goto('/kontakt');
      await expect(page.getByTestId('availability')).toHaveCount(0);
    } finally {
      await restore(request, original);
    }
  });

  test('the test auto-reply arrives in the chosen language with {name} replaced', async ({
    page,
    request,
  }) => {
    const original = await (await adminApi(request)).get<Profile>('/profile');
    const marker = `Cześć {name}, test ${Date.now()}.`;
    try {
      await signIn(page, '/admin/ustawienia#autoodpowiedz');
      await page.locator('#settings-pl-autoreplyBodyMd').fill(marker);
      await page.getByTestId('test-mail').click();
      await expect(snack(page)).toHaveText('Wysłano wiadomość testową.');

      const expected = marker.replace('{name}', original.fullName);
      await expect
        .poll(
          async () => {
            const search = await request.get(
              `${MAILPIT}/search?query=${encodeURIComponent(`subject:"${original.translations.pl['autoreplySubject']}"`)}`,
            );
            const { messages } = (await search.json()) as { messages: { ID: string }[] };
            for (const m of messages.slice(0, 5)) {
              const text = (
                (await (await request.get(`${MAILPIT}/message/${m.ID}`)).json()) as { Text: string }
              ).Text;
              if (text.includes(expected)) return true;
            }
            return false;
          },
          { timeout: 15_000 },
        )
        .toBe(true);
      // axe measures the toast mid-entrance (scaled surface); check the page once it has gone.
      await expect(snack(page)).toHaveCount(0, { timeout: 10_000 });
      await expectNoAxeViolations(page);
    } finally {
      await restore(request, original);
    }
  });
});
