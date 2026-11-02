import { test, expect } from '@playwright/test';

test.describe('Platform Navigation & Core Modules', () => {
  test.beforeEach(async ({ page }) => {
    // Quick login before each test
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign in as Admin/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('navigates to Projects and renders project management views', async ({ page }) => {
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByPlaceholder(/Search projects/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /New Project/i })).toBeVisible();
  });

  test('navigates to Issues tracker and displays filter toolbar', async ({ page }) => {
    await page.getByRole('link', { name: 'Issues' }).click();
    await expect(page).toHaveURL(/\/issues/);
    await expect(page.getByRole('button', { name: /Create Issue/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Search issues/i)).toBeVisible();
  });

  test('navigates to Kanban board and verifies workflow columns', async ({ page }) => {
    await page.getByRole('link', { name: 'Kanban Board' }).click();
    await expect(page).toHaveURL(/\/kanban/);
    await expect(page.getByText('To Do')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
  });

  test('navigates to Legacy Task Tracker and verifies delivery stages', async ({ page }) => {
    await page.getByRole('link', { name: 'Task Tracker' }).click();
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.getByRole('button', { name: /New Task/i })).toBeVisible();
  });

  test('navigates to Clients and verifies client directory', async ({ page }) => {
    await page.getByRole('link', { name: 'Clients' }).click();
    await expect(page).toHaveURL(/\/clients/);
    await expect(page.getByRole('button', { name: /Add Client/i })).toBeVisible();
  });

  test('opens in-app notification center from navbar bell', async ({ page }) => {
    const bellBtn = page.getByLabel('Open notifications').first();
    await bellBtn.click();

    await expect(page.getByText('Notifications')).toBeVisible();
  });
});
