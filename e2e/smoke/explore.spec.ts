import { expect, test } from '@playwright/test';

test.describe('Explore smoke', () => {
  test('loads indicator charts', async ({ page }) => {
    await page.goto('/explore');

    await expect(
      page.getByRole('heading', { name: 'Explore data' }),
    ).toBeVisible();
    await expect(page.getByText(/trend chart/i).first()).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});
