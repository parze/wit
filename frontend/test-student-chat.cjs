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

  // Login as student Anton
  console.log('\n=== STEP 1: Login as student Anton ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"]', 'anton.steffansson@edu.sigtuna.se');
  await page.fill('input[type="password"]', 'TestPass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('Login URL:', page.url());
  await page.screenshot({ path: `${screenshotsDir}/s01-student-login.png` });

  if (page.url().includes('/login')) {
    console.log('STUDENT LOGIN FAILED!');
    const bodyText = await page.locator('body').textContent();
    console.log('Page text:', bodyText?.substring(0, 500));
    await browser.close();
    return;
  }
  console.log('Student login successful!');

  // See student courses
  console.log('\n=== STEP 2: Student courses page ===');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: `${screenshotsDir}/s02-student-courses.png` });
  
  const coursesText = await page.locator('body').textContent();
  console.log('Student courses page (first 2000):', coursesText?.substring(0, 2000));

  // Find course links
  const allLinks = await page.locator('a[href]').all();
  for (const link of allLinks) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    if (href) console.log('Link:', href, '-', text?.trim());
  }
  
  // Look for course items (buttons or divs)
  const allBtns = await page.locator('button').allTextContents();
  console.log('Buttons:', allBtns);

  // Navigate to student course page for course 2
  console.log('\n=== STEP 3: Navigate to student course chat ===');
  await page.goto(`${BASE}/student/courses/2`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(5000);
  console.log('Student course URL:', page.url());
  await page.screenshot({ path: `${screenshotsDir}/s03-student-course.png` });
  
  const courseText = await page.locator('body').textContent();
  console.log('Student course content (first 4000):', courseText?.substring(0, 4000));

  // Look for chat input
  const allInputs = await page.locator('input, textarea').all();
  for (const inp of allInputs) {
    const type = await inp.getAttribute('type');
    const placeholder = await inp.getAttribute('placeholder');
    const visible = await inp.isVisible();
    const tag = await inp.evaluate(el => el.tagName);
    console.log(`Form element: <${tag}> type=${type} placeholder=${placeholder} visible=${visible}`);
  }

  // Find chat input
  const chatInput = page.locator('input[placeholder*="fråga"], input[placeholder*="Skriv"], textarea').first();
  const chatInputCount = await chatInput.count();
  console.log('Chat input found:', chatInputCount > 0);
  
  if (chatInputCount > 0) {
    const isEnabled = await chatInput.isEnabled();
    const isVisible = await chatInput.isVisible();
    console.log(`Chat input: enabled=${isEnabled}, visible=${isVisible}`);
    
    if (isEnabled && isVisible) {
      // Step 4: Send a chat message
      console.log('\n=== STEP 4: Send student chat message ===');
      await chatInput.fill('Hej! Vad är en storhet?');
      await page.screenshot({ path: `${screenshotsDir}/s04-typed.png` });
      
      const sendBtn = page.locator('button[type="submit"], button:has-text("Skicka")').first();
      if (await sendBtn.count() > 0) {
        await sendBtn.click();
        console.log('Message sent. Waiting for response...');
        
        await page.waitForTimeout(20000);
        await page.screenshot({ path: `${screenshotsDir}/s05-response.png` });
        
        const responseText = await page.locator('body').textContent();
        console.log('Response (first 5000):', responseText?.substring(0, 5000));
      }
    } else {
      console.log('Chat input not enabled or visible!');
      // Maybe need to click something to start
      const startBtns = await page.locator('button').allTextContents();
      console.log('Available buttons:', startBtns);
    }
  } else {
    // Check for Moment click to enter
    const momentLinks = await page.locator('button, [class*="moment"], [class*="section"]').all();
    console.log('Potential section/moment elements:', momentLinks.length);
    for (const el of momentLinks) {
      const text = await el.textContent();
      console.log('  Element:', text?.trim());
    }
  }

  await page.screenshot({ path: `${screenshotsDir}/s99-final.png` });

  console.log('\n\n=== FINAL SUMMARY ===');
  console.log('Console errors:', JSON.stringify(consoleErrors, null, 2));
  console.log('Network errors:', JSON.stringify(networkErrors, null, 2));

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
