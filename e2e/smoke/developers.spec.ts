import { expect, test } from '@playwright/test';
import { seedAuthSession } from '../fixtures/auth';
import { mockDeveloperApiKeys } from '../fixtures/api-mocks';

test.describe('Developers API keys smoke', () => {
  test('prompts guests to sign in', async ({ page }) => {
    await page.goto('/developers#api-keys');

    await expect(page.getByRole('heading', { name: 'API keys' })).toBeVisible();
    await expect(
      page.getByText('Sign in to create and manage API keys.'),
    ).toBeVisible();
    await expect(
      page.locator('#api-keys').getByRole('button', { name: 'Sign in' }),
    ).toBeVisible();
  });

  test('creates and revokes an API key', async ({ page }) => {
    await seedAuthSession(page, 'developer');
    await mockDeveloperApiKeys(page);
    await page.goto('/developers#api-keys');

    await expect(page.getByText('Smoke test key')).toBeVisible();

    await page.getByLabel('API key label').fill('CI smoke key');
    await page.getByRole('button', { name: 'Create key' }).click();

    await expect(
      page.getByText('Copy your key now — it will not be shown again:'),
    ).toBeVisible();
    await expect(page.getByText('nbs_e2e_new_secret_key_value')).toBeVisible();

    await page.getByRole('button', { name: 'Dismiss' }).click();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'CI smoke key' })
      .getByRole('button', { name: 'Revoke' })
      .click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('CI smoke key')).not.toBeVisible();
    await expect(page.getByText('Smoke test key')).toBeVisible();
  });
});
