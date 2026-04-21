import { test, expect, request } from '@playwright/test';

const BASE = 'http://49.12.195.247:5210/api';
const timestamp = Date.now();
const parentEmail = `qr_${timestamp}@test.com`;
const childUsername = `qr_child_${timestamp}`;

let courseId;
let parentToken;

test.describe.configure({ timeout: 180_000 });

test.beforeAll(async () => {
  const ctx = await request.newContext();

  const reg = await ctx.post(`${BASE}/auth/register`, {
    data: { email: parentEmail, password: 'test123', name: 'QR Förälder' },
  });
  ({ token: parentToken } = await reg.json());

  const c = await ctx.post(`${BASE}/courses`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    data: { title: 'Quick Reply Test', description: 'Test' },
  });
  const course = await c.json();
  courseId = course.id;

  await ctx.put(`${BASE}/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    data: { title: 'Quick Reply Test', description: 'Test', enable_quick_replies: true },
  });

  await ctx.post(`${BASE}/courses/${courseId}/documents`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    multipart: {
      file: {
        name: 'material.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(
          '## Fotosyntesen\nFotosyntesen är processen där växter omvandlar solljus, vatten och koldioxid till socker och syre.\n\n## Cellandningen\nCellandningen är processen där celler bryter ner socker för att frigöra energi i form av ATP.'
        ),
      },
    },
  });

  const compile = await ctx.post(`${BASE}/courses/${courseId}/compile`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    timeout: 120_000,
  });
  expect(compile.ok()).toBeTruthy();

  const ch = await ctx.post(`${BASE}/children`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    data: { name: 'QR Barn', username: childUsername, password: 'barn123' },
  });
  const child = await ch.json();

  await ctx.post(`${BASE}/courses/${courseId}/enroll`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    data: { child_id: child.id },
  });

  await ctx.dispose();
});

const qrLearn = 'button.border-blue-300';
const qrQuiz = 'button.border-purple-300';
const qrAny = `${qrLearn}, ${qrQuiz}`;
const assistantBubble = 'div.rounded-tl-sm';

test('quick replies clear correctly when switching modes', async ({ page }) => {
  // Login and open course
  await page.goto('/login');
  await page.fill('input[type="text"]', childUsername);
  await page.fill('input[type="password"]', 'barn123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/child/courses');
  await page.click('text=Quick Reply Test');
  await page.waitForURL(/\/child\/courses\/\d+/);

  // ── Phase 1: Learn mode intro ──
  console.log('\n── Phase 1: Learn mode intro');
  await expect(page.locator(assistantBubble).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(qrLearn).first()).toBeVisible({ timeout: 45_000 });
  const learnBefore = await page.locator(qrLearn).count();
  console.log(`  Learn (blue) buttons: ${learnBefore}`);
  expect(learnBefore).toBeGreaterThan(0);

  // ── Phase 2: Switch to Förhör mig ──
  console.log('── Phase 2: Switch to Förhör mig');
  await page.click('button:has-text("Förhör mig")');

  // Learn (blue) buttons should vanish immediately
  await expect(page.locator(qrLearn).first()).not.toBeVisible({ timeout: 2_000 });
  console.log('  Blue buttons cleared ✓');

  // Wait for quiz intro to complete (sends a message, Haiku generates replies)
  // The quiz intro auto-fires on first switch
  await page.waitForTimeout(20_000);

  const blueInQuiz = await page.locator(qrLearn).count();
  const purpleInQuiz = await page.locator(qrQuiz).count();
  console.log(`  After quiz intro — blue: ${blueInQuiz}, purple: ${purpleInQuiz}`);

  // KEY: NO blue (learn) buttons should exist in quiz mode
  expect(blueInQuiz).toBe(0);

  // ── Phase 3: Switch back to Lär mig ──
  console.log('── Phase 3: Switch back to Lär mig');

  // Wait for send to finish if quiz intro is still streaming
  await expect(page.locator('button:has-text("Lär mig")')).toBeEnabled({ timeout: 30_000 });
  await page.click('button:has-text("Lär mig")');

  // All quick replies should vanish
  await expect(page.locator(qrAny).first()).not.toBeVisible({ timeout: 2_000 });
  console.log('  All buttons cleared ✓');

  await page.waitForTimeout(5_000);
  const blueAfterReturn = await page.locator(qrLearn).count();
  const purpleAfterReturn = await page.locator(qrQuiz).count();
  console.log(`  5s after return — blue: ${blueAfterReturn}, purple: ${purpleAfterReturn}`);

  // No quiz (purple) buttons should remain in learn mode
  expect(purpleAfterReturn).toBe(0);

  // ── Phase 4: Switch to Förhör mig again ──
  console.log('── Phase 4: Switch to Förhör mig again');
  await page.click('button:has-text("Förhör mig")');

  await page.waitForTimeout(3_000);
  const blueOnReturn = await page.locator(qrLearn).count();
  const purpleOnReturn = await page.locator(qrQuiz).count();
  console.log(`  3s after second switch — blue: ${blueOnReturn}, purple: ${purpleOnReturn}`);

  // No stale learn buttons
  expect(blueOnReturn).toBe(0);

  console.log('\n✓ All quick-reply mode-switch checks passed');
});

test('quick replies persist across page reload', async ({ page }) => {
  // Login and open course
  await page.goto('/login');
  await page.fill('input[type="text"]', childUsername);
  await page.fill('input[type="password"]', 'barn123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/child/courses');
  await page.click('text=Quick Reply Test');
  await page.waitForURL(/\/child\/courses\/\d+/);

  // Wait for assistant message and quick replies (loaded from DB after previous test)
  await expect(page.locator(assistantBubble).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(qrLearn).first()).toBeVisible({ timeout: 45_000 });

  const replies = await page.locator(qrLearn).allTextContents();
  console.log('Quick replies before reload:', replies);
  expect(replies.length).toBeGreaterThan(0);

  // Wait for DB persist to complete before reload
  await page.waitForTimeout(2_000);

  // Reload — quick replies should appear from DB, not socket
  await page.reload();
  await expect(page.locator(assistantBubble).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(qrLearn).first()).toBeVisible({ timeout: 5_000 });

  const repliesAfterReload = await page.locator(qrLearn).allTextContents();
  console.log('Quick replies after reload:', repliesAfterReload);
  expect(repliesAfterReload).toEqual(replies);

  console.log('\n✓ Quick replies persisted across page reload');
});

test('learn and quiz quick replies are different', async ({ page }) => {
  // Login and open course
  await page.goto('/login');
  await page.fill('input[type="text"]', childUsername);
  await page.fill('input[type="password"]', 'barn123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/child/courses');
  await page.click('text=Quick Reply Test');
  await page.waitForURL(/\/child\/courses\/\d+/);

  // ── Learn mode: wait for quick replies ──
  console.log('\n── Learn mode: waiting for quick replies');
  await expect(page.locator(assistantBubble).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(qrLearn).first()).toBeVisible({ timeout: 45_000 });

  const learnReplies = await page.locator(qrLearn).allTextContents();
  console.log('  Learn quick replies:', learnReplies);
  expect(learnReplies.length).toBeGreaterThan(0);

  // ── Switch to Förhör mig: no QR initially, then quiz QR appear ──
  console.log('── Förhör mig: checking no QR immediately after switch');
  await page.click('button:has-text("Förhör mig")');

  // Immediately after switch: no quick replies of either color
  const anyAfterSwitch = await page.locator(qrAny).count();
  console.log(`  QR immediately after switch: ${anyAfterSwitch}`);
  expect(anyAfterSwitch).toBe(0);

  // Wait for quiz quick replies (purple) to appear
  await expect(page.locator(qrQuiz).first()).toBeVisible({ timeout: 60_000 });

  const quizReplies = await page.locator(qrQuiz).allTextContents();
  console.log('  Quiz quick replies:', quizReplies);
  expect(quizReplies.length).toBeGreaterThan(0);

  // ── Switch back to Lär mig: no QR immediately ──
  console.log('── Lär mig: checking no QR immediately after switch');
  await expect(page.locator('button:has-text("Lär mig")')).toBeEnabled({ timeout: 30_000 });
  await page.click('button:has-text("Lär mig")');

  const anyAfterLearnSwitch = await page.locator(qrAny).count();
  console.log(`  QR immediately after switch back: ${anyAfterLearnSwitch}`);
  expect(anyAfterLearnSwitch).toBe(0);

  // Learn QR should reappear (restored from saved)
  await expect(page.locator(qrLearn).first()).toBeVisible({ timeout: 5_000 });
  console.log('  Learn QR restored ✓');

  // ── Round 2: Switch to Förhör again ──
  console.log('── Förhör mig (round 2): checking no QR immediately');
  await page.click('button:has-text("Förhör mig")');

  const anyRound2Quiz = await page.locator(qrAny).count();
  console.log(`  QR immediately after switch: ${anyRound2Quiz}`);
  expect(anyRound2Quiz).toBe(0);

  await expect(page.locator(qrQuiz).first()).toBeVisible({ timeout: 5_000 });
  const quizReplies2 = await page.locator(qrQuiz).allTextContents();
  console.log('  Quiz QR (round 2):', quizReplies2);
  expect(quizReplies2).toEqual(quizReplies);

  // ── Round 2: Switch back to Lär mig ──
  console.log('── Lär mig (round 2): checking no QR immediately');
  await page.click('button:has-text("Lär mig")');

  const anyRound2Learn = await page.locator(qrAny).count();
  console.log(`  QR immediately after switch: ${anyRound2Learn}`);
  expect(anyRound2Learn).toBe(0);

  await expect(page.locator(qrLearn).first()).toBeVisible({ timeout: 5_000 });
  const learnReplies2 = await page.locator(qrLearn).allTextContents();
  console.log('  Learn QR (round 2):', learnReplies2);
  expect(learnReplies2).toEqual(learnReplies);

  // ── Compare: learn vs quiz must be different ──
  const learnSet = new Set(learnReplies);
  const quizSet = new Set(quizReplies);
  const identical = learnReplies.length === quizReplies.length &&
    learnReplies.every(r => quizSet.has(r)) &&
    quizReplies.every(r => learnSet.has(r));

  console.log(`  Learn vs Quiz identical: ${identical}`);
  expect(identical).toBe(false);

  console.log('\n✓ Learn and quiz quick replies are different and stable across switches');
});
