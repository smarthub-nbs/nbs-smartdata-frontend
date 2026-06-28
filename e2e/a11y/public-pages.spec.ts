import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicPages = [
  '/',
  '/datasets',
  '/search',
  '/explore',
  '/developers',
  '/login',
];

for (const path of publicPages) {
  test(`public page a11y smoke: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('#main-content')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('#main-content')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
