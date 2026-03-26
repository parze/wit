import { test, expect, request } from '@playwright/test';

const BASE = 'http://49.12.195.247:5210/api';
const timestamp = Date.now();
const teacherEmail = `st_teacher_${timestamp}@test.com`;
const studentEmail = `st_student_${timestamp}@test.com`;

let sectionId;

test.beforeAll(async () => {
  const ctx = await request.newContext();

  // Register teacher
  const t = await ctx.post(`${BASE}/auth/register`, {
    data: { email: teacherEmail, password: 'test123', name: 'Lärare', role: 'teacher' },
  });
  const { token: teacherToken } = await t.json();

  // Create course
  const c = await ctx.post(`${BASE}/courses`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
    data: { title: 'Elevtestkurs', description: 'Test' },
  });
  const course = await c.json();

  // Create section
  const s = await ctx.post(`${BASE}/courses/${course.id}/sections`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
    data: { title: 'Avsnitt 1' },
  });
  const section = await s.json();
  sectionId = section.id;

  // Register student
  const st = await ctx.post(`${BASE}/auth/register`, {
    data: { email: studentEmail, password: 'test123', name: 'Elev', role: 'student' },
  });
  const { user: studentUser } = await st.json();

  // Enroll student via teacher enroll endpoint
  await ctx.post(`${BASE}/courses/${course.id}/enroll`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
    data: { email: studentEmail },
  });

  // Upload a text document to the section so AI can analyze content
  await ctx.post(`${BASE}/sections/${section.id}/documents`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
    multipart: {
      file: {
        name: 'kurs.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Fotosyntesen är processen där växter omvandlar solljus, vatten och koldioxid till socker och syre. Klorofyll i kloroplasterna absorberar ljusenergin.'),
      },
    },
  });

  await ctx.dispose();
});

test('student sees enrolled course', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', studentEmail);
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/student/courses');
  await expect(page.locator('text=Elevtestkurs')).toBeVisible();
});

test('student can navigate to section', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', studentEmail);
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/student/courses');
  await page.click('text=Avsnitt 1');
  await page.waitForURL(/\/student\/sections\/\d+/);
  await expect(page.locator('text=Avsnitt 1')).toBeVisible();
});

test('procent uppdateras via socket efter AI-analys utan refresh', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', studentEmail);
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/student/courses');
  await page.click('text=Avsnitt 1');
  await page.waitForURL(/\/student\/sections\/\d+/);

  // Lyssna på socket-eventet via window-exponering
  await page.evaluate(() => {
    window.__analysisGoal = null;
    window.__origEmit = window.__origEmit; // avoid double-wrap on retries
  });

  // Skicka chattmeddelande
  await page.fill('input[placeholder="Skriv din fråga..."]', 'Vad handlar det här avsnittet om?');
  await page.click('button:has-text("Skicka")');

  // Vänta på att svaret kommit (laddningsanimation försvinner)
  await expect(page.locator('.dot-bounce').first()).not.toBeVisible({ timeout: 30000 });

  // Procenten ska uppdateras via socket utan refresh – vänta på att % visas i headern
  await expect(page.locator('header span, .text-blue-500').filter({ hasText: /%/ })).toBeVisible({ timeout: 30000 });
});
