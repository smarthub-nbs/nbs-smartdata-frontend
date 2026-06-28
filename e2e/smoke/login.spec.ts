import { expect, test } from '@playwright/test';
import { mockLoginFailure, mockLoginSuccess } from '../fixtures/auth';

test.describe('Login smoke', () => {
  const mainContent = '#main-content';

  test('shows validation errors for empty submit', async ({ page }) => {
    await page.goto('/login');

    await page
      .locator(mainContent)
      .getByRole('button', { name: 'Sign in' })
      .click();

    await expect(page.getByText('This field is required.')).toHaveCount(2);
  });

  test('shows API error for invalid credentials', async ({ page }) => {
    await mockLoginFailure(page);
    await page.goto('/login');

    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('bad-password');
    await page
      .locator(mainContent)
      .getByRole('button', { name: 'Sign in' })
      .click();

    await expect(page.getByRole('alert')).toContainText(
      'Invalid email or password.',
    );
  });

  test('signs in and returns to home', async ({ page }) => {
    await mockLoginSuccess(page, 'member');
    await page.goto('/login?returnUrl=%2F');

    await page.getByLabel('Email').fill('member@e2e.test');
    await page.getByLabel('Password').fill('password');
    await page
      .locator(mainContent)
      .getByRole('button', { name: 'Sign in' })
      .click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('E2E Member')).toBeVisible();
  });
});
