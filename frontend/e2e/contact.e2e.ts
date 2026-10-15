import { APIRequestContext, Page, expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// Acceptance criteria of docs/screens/public/08-contact.md. Sending uses the real dev stack: Cloudflare's test
// Turnstile keys (always pass), the API and Mailpit (http://localhost:8025) to read the delivered mail.

const MAILPIT = 'http://localhost:8025/api/v1';
const SERVICE_302 = '00000000-0000-4000-8000-000000000302';

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

async function fillValid(page: Page, email: string): Promise<void> {
  await page.locator('#contact-name').fill('Anna Testowa');
  await page.locator('#contact-email').fill(email);
  await page
    .locator('#contact-message')
    .fill('Potrzebuję pomocy przy przyspieszeniu nocnego importu zamówień.');
  await page.locator('#contact-consent').check();
}

async function mailTo(request: APIRequestContext, address: string): Promise<{ Subject: string }[]> {
  const response = await request.get(
    `${MAILPIT}/search?query=${encodeURIComponent(`to:${address}`)}`,
  );
  return ((await response.json()) as { messages: { Subject: string }[] }).messages;
}

test('a valid message is accepted, the owner is notified and the auto-reply is in the form language', async ({
  page,
  request,
}) => {
  const email = `anna-${Date.now()}@example.test`;
  await open(page, '/en/contact');
  await fillValid(page, email);
  const sent = page.waitForRequest('**/api/v1/public/contact');
  await page.getByTestId('submit').click();
  expect((await sent).postDataJSON()).toMatchObject({
    topic: 'PROJECT',
    locale: 'en',
    consent: true,
  });

  const success = page.getByTestId('success');
  await expect(success).toBeVisible({ timeout: 20_000 });
  await expect(success.getByRole('heading', { level: 2 })).toBeFocused();
  await expect(success).toContainText(email);

  // Auto-reply to the visitor in English, notification with the reply-to address to the owner.
  await expect
    .poll(async () => (await mailTo(request, email)).map((m) => m.Subject), { timeout: 15_000 })
    .toEqual(['Thank you for your message']);
  const search = await request.get(
    `${MAILPIT}/search?query=${encodeURIComponent(`subject:"Nowa wiadomość: Anna Testowa"`)}`,
  );
  expect(((await search.json()) as { messages_count: number }).messages_count).toBeGreaterThan(0);

  await page.getByTestId('again').click();
  await expect(page.getByTestId('contact-form')).toBeVisible();
  await expect(page.locator('#contact-name')).toHaveValue('');
  await expect(page.locator('#contact-name')).toBeFocused();
});

test('the query names the service, sends it and adds the project reference', async ({ page }) => {
  await open(page, `/kontakt?topic=CONSULTATION&service=${SERVICE_302}&project=system-zamowien`);
  await expect(page.getByTestId('about-service')).toHaveText(
    'Dotyczy usługi: Przyspieszenie systemu',
  );
  await expect(page.locator('#contact-message')).toHaveValue(
    /^Nawiązuję do projektu „System przetwarzania zamówień”\./,
  );

  await page.route('**/api/v1/public/contact', (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: '{"id":"x"}' }),
  );
  const sent = page.waitForRequest('**/api/v1/public/contact');
  await page.locator('#contact-name').fill('Anna Testowa');
  await page.locator('#contact-email').fill('anna@example.test');
  await page.locator('#contact-consent').check();
  await page.getByTestId('submit').click();
  expect((await sent).postDataJSON()).toMatchObject({
    topic: 'CONSULTATION',
    serviceId: SERVICE_302,
  });

  // Unknown values are ignored.
  await open(page, '/kontakt?topic=JOB&service=nope&project=missing');
  await expect(page.getByTestId('about-service')).toHaveCount(0);
  await expect(page.locator('#contact-message')).toHaveValue('');
});

test('validation messages are localised; on submit the first invalid field takes focus', async ({
  page,
}) => {
  await open(page, '/en/contact');
  await page.locator('#contact-email').fill('nope');
  await page.locator('#contact-email').blur();
  await expect(page.locator('#contact-email-error')).toHaveText(
    "Enter a valid email address – I'll reply to it.",
  );

  await page.getByTestId('submit').click();
  await expect(page.locator('#contact-name')).toBeFocused();
  await expect(page.locator('#contact-name-error')).toHaveText('This field is required.');
  await expect(page.locator('#contact-message-error')).toHaveText('This field is required.');
  await expect(page.locator('#contact-consent-error')).toHaveText(
    'Tick the consent box so I can reply.',
  );
  await expect(page.locator('#contact-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/en\/contact$/);

  await open(page, '/kontakt');
  await page.locator('#contact-message').fill('Za krótko');
  await page.locator('#contact-message').blur();
  await expect(page.locator('#contact-message-error')).toHaveText(
    'Wiadomość powinna mieć od 20 do 5000 znaków.',
  );
});

test('server field errors are shown next to their fields', async ({ page }) => {
  await page.route('**/api/v1/public/contact', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        title: 'Invalid data',
        detail: 'Please correct the highlighted fields.',
        errors: [{ field: 'email', message: "Enter a valid email address – I'll reply to it." }],
      }),
    }),
  );
  await open(page, '/en/contact');
  await fillValid(page, 'anna@example.test');
  await page.getByTestId('submit').click();
  await expect(page.locator('#contact-email-error')).toHaveText(
    "Enter a valid email address – I'll reply to it.",
  );
  await expect(page.locator('#contact-email')).toBeFocused();
});

for (const [status, text] of [
  [
    403,
    'Nie udało się potwierdzić, że wiadomość wysyła człowiek. Odśwież stronę i spróbuj ponownie.',
  ],
  [
    429,
    'Wysłano zbyt wiele wiadomości. Spróbuj ponownie za godzinę albo napisz na pospieszynski.michal@gmail.com.',
  ],
] as const) {
  test(`a ${status} shows the localised message and keeps the input`, async ({ page }) => {
    await page.route('**/api/v1/public/contact', (route) =>
      route.fulfill({
        status,
        contentType: 'application/problem+json',
        body: JSON.stringify({ title: 'x', detail: 'x' }),
      }),
    );
    await open(page, '/kontakt');
    await fillValid(page, 'anna@example.test');
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('failure')).toHaveText(text, { timeout: 20_000 });
    await expect(page.locator('#contact-email')).toHaveValue('anna@example.test');
    await expect(page.locator('#contact-consent')).toBeChecked();
  });
}

test('the Turnstile script loads only on the pages with the form, when the form is near', async ({ page }) => {
  const turnstile = (p: Page) => p.locator('script[src*="challenges.cloudflare.com"]');
  for (const url of ['/projekty', '/uslugi', '/en/about']) {
    await open(page, url);
    await expect(turnstile(page)).toHaveCount(0);
  }
  await page.getByTestId('tab-contact').click();
  await expect(turnstile(page)).toHaveCount(1);

  // On the home page only once the form comes into view.
  await open(page, '/');
  await expect(turnstile(page)).toHaveCount(0);
  await page.getByTestId('home-contact').scrollIntoViewIfNeeded();
  await expect(turnstile(page)).toHaveCount(1);
});

test('there is no job offer option', async ({ page }) => {
  await open(page, '/kontakt');
  const text = (await page.locator('main').innerText()).toLowerCase();
  for (const word of ['oferta pracy', 'rekrutac', 'job offer', 'recruit']) {
    expect(text).not.toContain(word);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the form is rendered with a note and the email address', async ({ page }) => {
    await page.goto('/kontakt');
    await expect(page.getByTestId('contact-form')).toBeVisible();
    await expect(page.getByTestId('noscript')).toContainText('pospieszynski.michal@gmail.com');
  });
});

test('the "needs JavaScript" note disappears once the app runs', async ({ page }) => {
  await open(page, '/kontakt');
  await expect(page.getByTestId('noscript')).toHaveCount(0);
});

test.describe('accessibility', () => {
  for (const url of ['/kontakt', '/en/contact']) {
    test(`axe finds nothing on ${url}`, async ({ page }) => {
      await open(page, url);
      await expectNoAxeViolations(page);
    });
  }

  test('axe finds nothing with errors shown', async ({ page }) => {
    await open(page, '/kontakt');
    await page.getByTestId('submit').click();
    await expectNoAxeViolations(page);
  });
});
