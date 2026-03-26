import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const teacherEmail = `dash_teacher_${timestamp}@test.com`;

test.beforeEach(async ({ page }) => {
  // Register and login as teacher if needed
  await page.goto('/register');
  await page.fill('input[type="text"]', 'Dashboard Lärare');
  await page.fill('input[type="email"]', teacherEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.selectOption('select', 'teacher');
  await page.click('button[type="submit"]');
  await page.waitForURL('/teacher/courses');
});

test('teacher can access dashboard page', async ({ page }) => {
  // Create a course first
  await page.click('button:has-text("Ny kurs")');
  await page.fill('input[placeholder=""]', 'Dashboard Kurs');
  await page.click('button:has-text("Skapa")');

  // Navigate to dashboard
  const courseCard = page.locator('text=Dashboard Kurs').first();
  await courseCard.waitFor();

  // Click Dashboard link on the course card
  await page.locator('text=Dashboard').first().click();
  await page.waitForURL(/\/teacher\/courses\/\d+\/dashboard/);

  await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  await expect(page.locator('text=Inga elever inskrivna ännu')).toBeVisible();
});
