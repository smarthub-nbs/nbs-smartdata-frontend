import { expect, test } from '@playwright/test';

test.describe('Datasets smoke', () => {
  test('lists mock catalog datasets', async ({ page }) => {
    await page.goto('/datasets');

    await expect(
      page.getByRole('heading', { name: 'Datasets' }),
    ).toBeVisible();
    await expect(
      page.getByText('Population and Housing Census 2022'),
    ).toBeVisible();
    await expect(page.getByText(/\d+ datasets?/)).toBeVisible();
  });

  test('filters datasets by search query', async ({ page }) => {
    await page.goto('/datasets');

    await page
      .getByPlaceholder('Title, keyword, region…')
      .fill('GDP');

    await expect(
      page.getByText('Gross Domestic Product — quarterly national accounts'),
    ).toBeVisible();
    await expect(page.getByText('1 dataset')).toBeVisible();
  });

  test('opens dataset detail page', async ({ page }) => {
    await page.goto('/datasets/pop-census-2022');

    await expect(
      page.getByRole('heading', {
        name: 'Population and Housing Census 2022',
      }),
    ).toBeVisible();
    await expect(page.getByText('Data preview')).toBeVisible();
  });
});
