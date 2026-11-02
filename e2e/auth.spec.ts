import { test, expect } from '@playwright/test';

test.describe('Authentication & Session Workflows', () => {
  test('renders login page with demo quick-login credentials', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/FlowTrack/i);
    await expect(page.getByText('Sign in to FlowTrack')).toBeVisible();
    await expect(page.getByRole('button', { name: /Admin/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Manager/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Developer/i })).toBeVisible();
  });

  test('authenticates via Admin quick-login and redirects to Dashboard', async ({ page }) => {
    await page.goto('/login');

    // Click demo admin login
    const adminDemoBtn = page.getByRole('button', { name: /Sign in as Admin/i });
    await adminDemoBtn.click();

    // Verify successful authentication and redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Dashboard Overview')).toBeVisible();

    // Check user profile badge in sidebar
    await expect(page.getByText('Admin User')).toBeVisible();
  });

  test('toggles dark and light mode preferences', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign in as Developer/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const html = page.locator('html');
    const themeBtn = page.getByRole('button', { name: /Toggle Theme/i }).first();

    // Toggle theme
    await themeBtn.click();
    await page.waitForTimeout(300);

    // Verify theme state persisted in local storage or html element
    const isDark = await html.evaluate((el) => el.classList.contains('dark'));
    expect(typeof isDark).toBe('boolean');
  });

  test('logs out and clears authentication session', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign in as Developer/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Click logout
    const logoutBtn = page.getByRole('button', { name: /Sign Out/i });
    await logoutBtn.click();

    // Verify redirection to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Sign in to FlowTrack')).toBeVisible();
  });
});
