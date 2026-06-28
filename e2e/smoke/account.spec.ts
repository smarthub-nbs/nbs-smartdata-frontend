import { expect, test } from '@playwright/test';
import { seedAuthSession } from '../fixtures/auth';

test.describe('Account smoke', () => {
  test('redirects guests to sign in', async ({ page }) => {
    await page.goto('/account');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('shows account hub for signed-in members', async ({ page }) => {
    await seedAuthSession(page, 'member');
    await page.goto('/account');

    await expect(
      page.getByRole('heading', { name: /Welcome back/i }),
    ).toBeVisible();
    await expect(page.getByText('member@e2e.test')).toBeVisible();
  });
});
