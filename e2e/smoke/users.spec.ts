import { expect, test } from '@playwright/test';
import { mockLoginSuccess } from '../fixtures/auth';
import { mockUsersWorkspace } from '../fixtures/api-mocks';

test.describe('Users admin smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoginSuccess(page, 'admin');
    await mockUsersWorkspace(page);
    await page.goto('/login?returnUrl=%2Fusers');
    await page.getByLabel('Email').fill('admin@e2e.test');
    await page.getByLabel('Password').fill('password');
    await page
      .locator('#main-content')
      .getByRole('button', { name: 'Sign in' })
      .click();
    await expect(page).toHaveURL((url) => new URL(url).pathname === '/users');
  });

  test('loads user management workspace', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'User management' }),
    ).toBeVisible();
    await expect(page.getByText('Member User')).toBeVisible();
    await expect(page.getByText('1–1 of 1')).toBeVisible();
  });
});
