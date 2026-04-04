const { chromium } = require('./node_modules/@playwright/test');
const fs = require('fs');

const screenshotsDir = '/tmp/playwright-screenshots';
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];
  const allNetworkActivity = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({ type, text, url: page.url() });
    }
  });

  page.on('response', async response => {
    const status = response.status();
    const url = response.url();
    if (url.includes('/api/')) {
      allNetworkActivity.push({ status, url });
      if (!response.ok() && status !== 304) {
        let body = '';
        try { body = await response.text(); } catch(e) {}
        networkErrors.push({ status, url, body: body.substring(0, 500) });
        console.log(`[NET ERROR] ${status} ${url} - ${body.substring(0, 300)}`);
      } else {
        console.log(`[NET OK] ${status} ${url}`);
      }
    }
  });

  page.on('requestfailed', request => {
    const err = { failure: request.failure()?.errorText, url: request.url() };
    networkErrors.push(err);
    console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });

  const BASE = 'http://wit.just-bake.it:5200';

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"]', 'steffansson18@sent.com');
  await page.fill('input[type="password"]', 'TestPass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${screenshotsDir}/01-login.png` });
  console.log('Login URL:', page.url());

  // Navigate to test chat and reset it first
  console.log('\n=== Navigate to test chat and reset ===');
  await page.goto(`${BASE}/teacher/courses/2/test-chat`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${screenshotsDir}/02-test-chat-initial.png` });
  
  // Click Reset to get a fresh session
  const resetBtn = page.locator('button:has-text("Reset")').first();
  if (await resetBtn.count() > 0) {
    console.log('Clicking Reset button...');
    await resetBtn.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotsDir}/03-after-reset.png` });
    console.log('After reset URL:', page.url());
  }
  
  // Re-navigate to get fresh state
  await page.goto(`${BASE}/teacher/courses/2/test-chat`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(5000); // Wait for intro message to load
  await page.screenshot({ path: `${screenshotsDir}/04-fresh-chat.png` });
  
  const initialText = await page.locator('body').textContent();
  console.log('Initial chat content (first 3000):', initialText?.substring(0, 3000));

  // Type and send message
  console.log('\n=== Send message ===');
  const chatInput = page.locator('input[placeholder="Skriv din fråga..."]');
  await chatInput.fill('En enhet saknas, till exempel meter (m). Utan enhet vet vi inte hur lång bron faktiskt är.');
  await page.screenshot({ path: `${screenshotsDir}/05-typed.png` });
  
  const sendBtn = page.locator('button:has-text("Skicka")');
  await sendBtn.click();
  console.log('Message sent. Waiting for AI response...');
  
  // Wait for the full streaming response
  await page.waitForTimeout(20000);
  await page.screenshot({ path: `${screenshotsDir}/06-response-received.png` });
  
  const afterSendText = await page.locator('body').textContent();
  console.log('After send content (first 5000):', afterSendText?.substring(0, 5000));

  // Check if there's a next message slot and send another
  console.log('\n=== Send follow-up message ===');
  const chatInput2 = page.locator('input[placeholder="Skriv din fråga..."]');
  const isEnabled2 = await chatInput2.isEnabled();
  console.log('Input enabled after response:', isEnabled2);
  
  if (isEnabled2) {
    await chatInput2.fill('Vad är SI-systemet?');
    const sendBtn2 = page.locator('button:has-text("Skicka")');
    await sendBtn2.click();
    console.log('Follow-up message sent. Waiting for response...');
    
    await page.waitForTimeout(20000);
    await page.screenshot({ path: `${screenshotsDir}/07-followup-response.png` });
    
    const followupText = await page.locator('body').textContent();
    console.log('After follow-up (first 5000):', followupText?.substring(0, 5000));
  }

  // Check student-side with enrolled student
  console.log('\n=== Check student accounts ===');
  // Get list of students from API
  const students = await page.evaluate(async () => {
    const token = localStorage.getItem('token');
    const resp = await fetch('http://49.12.195.247:5210/api/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return resp.json();
  });
  console.log('Students:', JSON.stringify(students).substring(0, 1000));

  // Get student enrolled in course 2
  const enrollments = await page.evaluate(async () => {
    const token = localStorage.getItem('token');
    const resp = await fetch('http://49.12.195.247:5210/api/courses/2/enrollments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return resp.json();
  });
  console.log('Enrollments for course 2:', JSON.stringify(enrollments).substring(0, 1000));

  // Final screenshot
  await page.screenshot({ path: `${screenshotsDir}/99-final.png` });

  console.log('\n\n=== FINAL SUMMARY ===');
  console.log('Console errors (', consoleErrors.length, '):', JSON.stringify(consoleErrors, null, 2));
  console.log('Network errors (', networkErrors.length, '):', JSON.stringify(networkErrors, null, 2));
  console.log('All API calls:', allNetworkActivity.map(r => `${r.status} ${r.url}`).join('\n'));

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
