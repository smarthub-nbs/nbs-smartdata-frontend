import { expect, test } from '@playwright/test';
import { mockLoginSuccess } from '../fixtures/auth';
import { mockAdminWorkspace } from '../fixtures/api-mocks';

test.describe('Admin workspace smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoginSuccess(page, 'admin');
    await mockAdminWorkspace(page);
    await page.goto('/login?returnUrl=%2Fadmin');
    await page.getByLabel('Email').fill('admin@e2e.test');
    await page.getByLabel('Password').fill('password');
    await page
      .locator('#main-content')
      .getByRole('button', { name: 'Sign in' })
      .click();
  });

  test('loads publishing queue for admin', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Publishing workspace' }),
    ).toBeVisible();
    await expect(page.getByText('Publishing queue')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: 'Consumer price index draft',
      }),
    ).toBeVisible();
  });

  test('opens dataset workflow detail from queue', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: 'Consumer price index draft',
      }),
    ).toBeVisible();
    await expect(page.getByText('1/3 ready')).toBeVisible();
  });
});
