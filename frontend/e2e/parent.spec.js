import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const parentEmail = `tp_${timestamp}@test.com`;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('http://49.12.195.247:5200/register');
  await page.fill('input[type="text"]', 'Förälder');
  await page.fill('input[type="email"]', parentEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/parent/courses');
  await page.close();
});

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="text"]', parentEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/parent/courses');
});

test('create a course goes to editor', async ({ page }) => {
  await page.click('button:has-text("Nytt arbetsområde")');
  await page.waitForURL(/\/parent\/courses\/\d+/);
  await expect(page.locator('text=Nytt arbetsområde')).toBeVisible();
  await expect(page.locator('text=Arbetsområdeseditor')).toBeVisible();
});

test('editor shows steps 1-3', async ({ page }) => {
  // Create a new draft and land in editor
  await page.click('button:has-text("Nytt arbetsområde")');
  await page.waitForURL(/\/parent\/courses\/\d+/);

  // Steps 1-3 visible
  await expect(page.locator('h3:has-text("Inställningar")')).toBeVisible();
  await expect(page.locator('h3:has-text("Ladda upp läromedel")')).toBeVisible();
  await expect(page.locator('h3:has-text("Förbered undervisningsmaterial")')).toBeVisible();
});

test('create a child via Barn page', async ({ page }) => {
  await page.click('text=Barn');
  await page.waitForURL('/parent/children');

  await page.click('button:has-text("Nytt barn")');
  const form = page.locator('form');
  const inputs = form.locator('input[type="text"]');
  await inputs.nth(0).fill('Test Barn');         // Namn
  await inputs.nth(1).fill(`barn_${timestamp}`);  // Användarnamn
  await inputs.nth(2).fill('barn123');            // Lösenord
  await form.locator('input[type="number"]').fill('2015');
  await form.locator('button:has-text("Skapa barn")').click();
  await expect(page.locator('text=Test Barn skapad!')).toBeVisible({ timeout: 10000 });
});
