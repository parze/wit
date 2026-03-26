import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const teacherEmail = `t_${timestamp}@test.com`;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/register');
  await page.fill('input[type="text"]', 'Lärare');
  await page.fill('input[type="email"]', teacherEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.selectOption('select', 'teacher');
  await page.click('button[type="submit"]');
  await page.waitForURL('/teacher/courses');
  await page.close();
});

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', teacherEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/teacher/courses');
});

test('create a course', async ({ page }) => {
  await page.click('button:has-text("Ny kurs")');
  await page.fill('input[placeholder=""]', 'Testmatematik');
  await page.fill('textarea', 'En testkurs i matematik');
  await page.click('button:has-text("Skapa")');
  await expect(page.locator('text=Testmatematik')).toBeVisible();
});

test('create a section and add it', async ({ page }) => {
  // Go to a course
  await page.click('text=Testmatematik');
  await page.waitForURL(/\/teacher\/courses\/\d+/);

  // Add section
  await page.fill('input[placeholder="Nytt avsnitt..."]', 'Kapitel 1');
  await page.click('button:has-text("Lägg till avsnitt")');
  await expect(page.locator('text=Kapitel 1')).toBeVisible();
});

test('upload document to section', async ({ page }) => {
  await page.click('text=Testmatematik');
  await page.waitForURL(/\/teacher\/courses\/\d+/);

  // Create a test file
  const fileContent = 'Detta är testinnehåll för matematikkursen.';
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('input[type="file"]');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(fileContent),
  });
  await page.click('button:has-text("Ladda upp")');
  await expect(page.locator('text=test.txt')).toBeVisible({ timeout: 10000 });
});

test('add quiz question', async ({ page }) => {
  await page.click('text=Testmatematik');
  await page.waitForURL(/\/teacher\/courses\/\d+/);

  // Fill in quiz question form
  await page.fill('input[placeholder="Fråga..."]', 'Vad är 2+2?');
  const optionInputs = page.locator('input[placeholder^="Alternativ"]');
  await optionInputs.nth(0).fill('3');
  await optionInputs.nth(1).fill('4');
  await optionInputs.nth(2).fill('5');
  await optionInputs.nth(3).fill('6');

  // Select correct answer (index 1 = "4")
  await page.locator('input[type="radio"]').nth(1).click();
  await page.click('button:has-text("Lägg till fråga")');
  await expect(page.locator('text=Vad är 2+2?')).toBeVisible({ timeout: 5000 });
});
