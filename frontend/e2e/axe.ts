import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

/** Runs axe (WCAG 2.2 AA rules) on the page as it is now and fails with a readable list of violations. */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  await settle(page);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const summary = violations.map(
    (v) => `${v.impact} ${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

/** Finishes running CSS transitions so colour checks see the settled state. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
}
