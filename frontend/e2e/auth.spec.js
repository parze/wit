import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const parentEmail = `parent_${timestamp}@test.com`;

test('register parent account', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[type="text"]', 'Test Förälder');
  await page.fill('input[type="email"]', parentEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/parent/courses');
});

test('login as parent', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="text"]', parentEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/parent/courses');
});

test('redirect to login when not authenticated', async ({ page }) => {
  await page.goto('/parent/courses');
  await expect(page).toHaveURL('/login');
});
