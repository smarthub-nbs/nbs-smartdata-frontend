import { expect, test } from '@playwright/test';

test.describe('Home smoke', () => {
  test('loads hero and navigates to search from hero search', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: 'Official open statistics for Tanzania',
      }),
    ).toBeVisible();

    const search = page.getByRole('searchbox', {
      name: 'Search official statistics',
    });
    await search.fill('population census');
    await search.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=population(?:\+|%20)census/);
    await expect(
      page.getByRole('heading', { name: 'Search datasets' }),
    ).toBeVisible();
  });

  test('browse datasets pathway opens catalog', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Browse datasets/i }).click();

    await expect(page).toHaveURL('/datasets');
    await expect(page.getByRole('heading', { name: 'Datasets' })).toBeVisible();
  });
});
