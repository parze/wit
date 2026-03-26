import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const teacherEmail = `teacher_${timestamp}@test.com`;
const studentEmail = `student_${timestamp}@test.com`;

test('register teacher account', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[type="text"]', 'Test Lärare');
  await page.fill('input[type="email"]', teacherEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.selectOption('select', 'teacher');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/teacher/courses');
});

test('register student account', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[type="text"]', 'Test Elev');
  await page.fill('input[type="email"]', studentEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.selectOption('select', 'student');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/student/courses');
});

test('login as teacher', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', teacherEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/teacher/courses');
});

test('login as student', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', studentEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/student/courses');
});

test('redirect to login when not authenticated', async ({ page }) => {
  await page.goto('/teacher/courses');
  await expect(page).toHaveURL('/login');
});
