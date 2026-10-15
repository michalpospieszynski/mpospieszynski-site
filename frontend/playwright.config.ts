import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (docs/CONVENTIONS.md, Testing): every acceptance criterion of a screen spec, plus axe.
 * They run against `ng serve` (SSR included) and need the dev API on :8080 with its sample data:
 *   docker compose -f infra/docker-compose.dev.yml up -d
 *   cd backend && ./gradlew bootRun --args='--spring.profiles.active=dev'
 * Set E2E_BASE_URL to test another server (e.g. `npm run serve:ssr` on :4000).
 * The installed Chrome is used, so no browser download is needed (`channel: 'chrome'`).
 */
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: 'admin/**',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      // Admin tests change the shared sample content (and put it back), so they start after the public tests.
      // They also need the local Supabase stack: npm run supabase:start (seed users in supabase/seed.sql).
      name: 'admin',
      testMatch: 'admin/**/*.e2e.ts',
      dependencies: ['desktop'],
      // One at a time: the tests count and list shared data (dashboard, lists) that others change.
      fullyParallel: false,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: process.env['E2E_BASE_URL']
    ? undefined
    : { command: 'npm start', url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
