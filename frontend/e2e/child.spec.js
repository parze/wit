import { test, expect, request } from '@playwright/test';

const BASE = 'http://49.12.195.247:5210/api';
const timestamp = Date.now();
const parentEmail = `cp_${timestamp}@test.com`;
const childUsername = `child_${timestamp}`;

let courseId;
let childId;

test.beforeAll(async () => {
  const ctx = await request.newContext();

  // Register parent
  const t = await ctx.post(`${BASE}/auth/register`, {
    data: { email: parentEmail, password: 'test123', name: 'Förälder' },
  });
  const { token: parentToken } = await t.json();

  // Create course
  const c = await ctx.post(`${BASE}/courses`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    data: { title: 'Barntestkurs', description: 'Test' },
  });
  const course = await c.json();
  courseId = course.id;

  // Upload a text document to the course
  await ctx.post(`${BASE}/courses/${course.id}/documents`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    multipart: {
      file: {
        name: 'kurs.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Fotosyntesen är processen där växter omvandlar solljus, vatten och koldioxid till socker och syre. Klorofyll i kloroplasterna absorberar ljusenergin.'),
      },
    },
  });

  // Create child
  const ch = await ctx.post(`${BASE}/children`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    data: { name: 'Test Barn', username: childUsername, password: 'barn123' },
  });
  const child = await ch.json();
  childId = child.id;

  // Enroll child
  await ctx.post(`${BASE}/courses/${course.id}/enroll`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    data: { child_id: childId },
  });

  await ctx.dispose();
});

test('child can login with username', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="text"]', childUsername);
  await page.fill('input[type="password"]', 'barn123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/child/courses');
  await expect(page.locator('text=Barntestkurs')).toBeVisible();
});

test('child can open enrolled course', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="text"]', childUsername);
  await page.fill('input[type="password"]', 'barn123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/child/courses');
  await page.click('text=Barntestkurs');
  await page.waitForURL(/\/child\/courses\/\d+/);
  await expect(page.locator('text=Barntestkurs')).toBeVisible();
});
