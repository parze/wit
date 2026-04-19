import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const parentEmail = `dash_parent_${timestamp}@test.com`;
let registered = false;

test('parent can access dashboard page', async ({ page }) => {
  // Register
  await page.goto('/register');
  await page.fill('input[type="text"]', 'Dashboard Förälder');
  await page.fill('input[type="email"]', parentEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/parent/courses');

  // Create a course (goes directly to editor)
  await page.click('button:has-text("Nytt arbetsområde")');
  await page.waitForURL(/\/parent\/courses\/(\d+)/);
  const courseUrl = page.url();

  // Navigate to dashboard
  await page.goto(courseUrl + '/dashboard');

  await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  await expect(page.locator('text=Inga barn inskrivna ännu')).toBeVisible();
});
