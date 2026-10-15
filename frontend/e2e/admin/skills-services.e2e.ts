import { Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from '../axe';
import { adminApi, confirm, signIn, snack, unique } from './admin';

// Acceptance criteria of docs/screens/admin/07-skills.md and 08-services-faq.md. Items are created by the test
// through the side-panel editor and deleted again; the seeded ones are only read.

const SERVICE_IN_USE = '00000000-0000-4000-8000-000000000302';

async function publicHtml(page: Page, path: string): Promise<string> {
  return (await page.request.get(path)).text();
}

function panel(page: Page) {
  return page.getByRole('dialog');
}

async function selectOption(page: Page, testId: string, option: string): Promise<void> {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: option }).click();
  await page.keyboard.press('Escape');
}

test.describe('skills', () => {
  test('a technology is created in both languages, hidden and shown, then deleted', async ({
    page,
  }) => {
    const name = unique('Testtech');
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await signIn(page, '/admin/umiejetnosci');
    await page.getByTestId('technology-new').click();
    await panel(page).getByTestId('technology-name').fill(name);
    await selectOption(page, 'technology-category', 'Backend');
    await panel(page).getByTestId('technology-pl-description').fill('Opis po polsku.');
    await panel(page).getByTestId('lang-tab-en').click();
    await panel(page).getByTestId('technology-en-description').fill('English description.');
    await panel(page).getByTestId('item-save').click();
    await expect(snack(page)).toHaveText('Zapisano');

    const row = page.getByTestId('technology-row').filter({ hasText: name });
    await expect(row).toContainText('kompletne');
    expect(await publicHtml(page, '/umiejetnosci')).toContain('Opis po polsku.');
    expect(await publicHtml(page, '/en/skills')).toContain('English description.');

    await row.getByTestId('technology-visible').click();
    await expect(snack(page)).toHaveText('Zapisano');
    expect(await publicHtml(page, '/umiejetnosci')).not.toContain(`tech-${slug}`);
    await row.getByTestId('technology-visible').click();
    await expect(snack(page)).toHaveText('Zapisano');
    expect(await publicHtml(page, '/umiejetnosci')).toContain('Opis po polsku.');

    await row.getByTestId('technology-edit').click();
    await panel(page).getByTestId('item-delete').click();
    await expect(page.getByTestId('confirm-message')).toHaveText(`Usunąć „${name}”?`);
    await confirm(page);
    await expect(row).toHaveCount(0);
  });

  test('a technology used by projects cannot be deleted', async ({ page }) => {
    await signIn(page, '/admin/umiejetnosci');
    const java = page
      .getByTestId('technology-row')
      .filter({ has: page.getByRole('button', { name: 'Java', exact: true }) });
    await java.getByTestId('technology-edit').click();
    await panel(page).getByTestId('item-delete').click();
    await confirm(page);
    await expect(snack(page)).toContainText('Tej technologii używa');
    await expect(snack(page)).toContainText(
      'Usuń ją najpierw z projektów albo ukryj ją na stronie.',
    );
    await panel(page).getByRole('button', { name: 'Anuluj' }).click();
  });

  test('reordering works within a selected category', async ({ page }) => {
    await signIn(page, '/admin/umiejetnosci');
    await expect(page.getByText('Wybierz kategorię, aby zmienić kolejność.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Przesuń niżej/ })).toHaveCount(0);
    await selectOption(page, 'category-filter', 'Backend');
    const rows = page.getByTestId('technology-row');
    const first = (await rows.first().getByTestId('technology-edit').textContent())!.trim();
    await rows
      .first()
      .getByRole('button', { name: `Przesuń niżej: ${first}` })
      .click();
    await expect(snack(page)).toHaveText('Kolejność zapisana.');
    await expect(rows.nth(1)).toContainText(first);
    // And back.
    await rows
      .nth(1)
      .getByRole('button', { name: `Przesuń wyżej: ${first}` })
      .click();
    await expect(rows.first()).toContainText(first);
    // axe measures a toast mid-entrance (scaled surface); check once it has gone.
    await expect(snack(page)).toHaveCount(0, { timeout: 10_000 });
    await expectNoAxeViolations(page);
  });

  test('an expertise area is created with technologies and projects, shown publicly, then deleted', async ({
    page,
  }) => {
    const title = unique('Obszar testowy');
    await signIn(page, '/admin/umiejetnosci?tab=obszary');
    await page.getByTestId('area-new').click();
    await panel(page).getByTestId('area-pl-title').fill(title);
    await panel(page).getByTestId('area-pl-summary').fill('Podsumowanie obszaru.');
    await selectOption(page, 'area-technologyIds', 'Java');
    await page.getByTestId('area-projectIds').click();
    await expect(page.getByRole('option', { name: /Szkic projektu/ })).toContainText('Szkic');
    await page.getByRole('option', { name: /System przetwarzania zamówień/ }).click();
    await page.keyboard.press('Escape');
    await panel(page).getByTestId('item-save').click();
    await expect(snack(page)).toHaveText('Zapisano');

    const row = page.getByTestId('area-row').filter({ hasText: title });
    await expect(row).toContainText('1 technologia · 1 projekt');
    expect(await publicHtml(page, '/umiejetnosci')).toContain(title);

    await row.getByTestId('area-edit').click();
    await panel(page).getByTestId('item-delete').click();
    await confirm(page);
    await expect(row).toHaveCount(0);
    expect(await publicHtml(page, '/umiejetnosci')).not.toContain(title);
  });
});

test.describe('services and FAQ', () => {
  test('a service is created, deactivated (hidden publicly) and deleted', async ({ page }) => {
    const title = unique('Usługa testowa');
    await signIn(page, '/admin/uslugi');
    await page.getByTestId('item-new').click();
    await panel(page).getByTestId('service-pl-title').fill(title);
    await panel(page).getByTestId('service-pl-summary').fill('Krótki opis usługi.');
    // Partially filled English is refused.
    await panel(page).getByTestId('lang-tab-en').click();
    await panel(page).getByTestId('service-en-title').fill('Test service');
    await panel(page).getByTestId('item-save').click();
    await expect(
      panel(page).getByText('Wymagane, gdy wersja angielska jest wypełniona.'),
    ).toBeVisible();
    await panel(page).getByTestId('service-en-summary').fill('A short description.');
    await panel(page).getByTestId('item-save').click();
    await expect(snack(page)).toHaveText('Zapisano');

    const row = page.getByTestId('service-row').filter({ hasText: title });
    expect(await publicHtml(page, '/uslugi')).toContain(title);
    expect(await publicHtml(page, '/en/services')).toContain('Test service');

    await row.getByTestId('service-active').click();
    await expect(row).toContainText('Nieaktywna');
    expect(await publicHtml(page, '/uslugi')).not.toContain(title);

    await row.getByTestId('service-edit').click();
    await panel(page).getByTestId('item-delete').click();
    await confirm(page);
    await expect(row).toHaveCount(0);
  });

  test('deleting a service referenced by messages is blocked', async ({ page, request }) => {
    const api = await adminApi(request);
    const services =
      await api.get<{ id: string; translations: { pl: { title: string } } }[]>('/services');
    const title = services.find((s) => s.id === SERVICE_IN_USE)!.translations.pl.title;
    await signIn(page, '/admin/uslugi');
    await page
      .getByTestId('service-row')
      .filter({ hasText: title })
      .getByTestId('service-edit')
      .click();
    await panel(page).getByTestId('item-delete').click();
    await confirm(page);
    await expect(snack(page)).toContainText('Ta usługa jest powiązana z');
    await expect(snack(page)).toContainText('Zamiast usuwać, wyłącz ją.');
    await panel(page).getByRole('button', { name: 'Anuluj' }).click();
  });

  test('FAQ: create, reorder and delete', async ({ page }) => {
    const question = unique('Pytanie testowe');
    await signIn(page, '/admin/uslugi?tab=faq');
    await page.getByTestId('item-new').click();
    await panel(page).getByTestId('faq-pl-question').fill(question);
    await panel(page).locator('#faq-pl-answerMd').fill('Odpowiedź **testowa**.');
    await panel(page).getByTestId('item-save').click();
    await expect(snack(page)).toHaveText('Zapisano');
    expect(await publicHtml(page, '/uslugi')).toContain(question);

    const rows = page.getByTestId('faq-row');
    await expect(rows.last()).toContainText(question);
    await rows
      .last()
      .getByRole('button', { name: `Przesuń wyżej: ${question}` })
      .click();
    await expect(snack(page)).toHaveText('Kolejność zapisana.');
    await page.reload();
    await expect(rows.last()).not.toContainText(question);

    await rows.filter({ hasText: question }).getByTestId('faq-edit').click();
    await panel(page).getByTestId('item-delete').click();
    await confirm(page);
    await expect(rows.filter({ hasText: question })).toHaveCount(0);
    await expect(snack(page)).toHaveCount(0, { timeout: 10_000 });
    await expectNoAxeViolations(page);
  });
});
