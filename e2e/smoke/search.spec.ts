import { expect, test } from '@playwright/test';

test.describe('Search smoke', () => {
  test('runs a smart search query and shows results', async ({ page }) => {
    await page.goto('/search?q=gdp');

    await expect(
      page.getByRole('heading', { name: 'Search datasets' }),
    ).toBeVisible();
    await expect(page.getByText('Query interpretation')).toBeVisible();
    await expect(
      page.getByText('Gross Domestic Product — quarterly national accounts'),
    ).toBeVisible();
  });
});
