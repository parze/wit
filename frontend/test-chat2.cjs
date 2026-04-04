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
  const allResponses = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({ type, text, url: page.url() });
    }
    console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
  });

  page.on('response', async response => {
    const status = response.status();
    const url = response.url();
    // Capture interesting API responses
    if (url.includes('/api/') && status !== 304) {
      let body = '';
      try { body = await response.text(); } catch(e) {}
      allResponses.push({ status, url, body: body.substring(0, 500) });
      if (!response.ok()) {
        networkErrors.push({ status, url, body: body.substring(0, 500) });
        console.log(`[NET ERROR] ${status} ${url} - ${body.substring(0, 200)}`);
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
  const API = 'http://wit.just-bake.it:5210';

  // Step 1: Login
  console.log('\n=== STEP 1: Login ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${screenshotsDir}/01-login.png` });
  
  await page.fill('input[type="email"]', 'steffansson18@sent.com');
  await page.fill('input[type="password"]', 'TestPass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('URL after login:', page.url());
  await page.screenshot({ path: `${screenshotsDir}/02-after-login.png` });

  if (page.url().includes('/login')) {
    console.log('LOGIN FAILED!');
    await browser.close();
    return;
  }
  console.log('Login successful!');

  // Step 2: Look at courses page and get course IDs
  console.log('\n=== STEP 2: Courses page ===');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  
  // Get the full HTML to understand the structure
  const html = await page.content();
  // Find course-related elements - look for buttons, divs with onclick, etc.
  const courseButtons = await page.locator('button').allTextContents();
  console.log('All buttons:', courseButtons);
  
  // Get all clickable elements text
  const allClickable = await page.locator('button, [role="button"], [onclick]').all();
  for (const el of allClickable) {
    const text = await el.textContent();
    console.log('Clickable:', text?.trim());
  }

  await page.screenshot({ path: `${screenshotsDir}/03-courses-page.png` });

  // Step 3: Get course IDs from API directly using the token
  // First get the token from localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  console.log('\n=== STEP 3: Get courses via API ===');
  console.log('Token available:', !!token);

  // Navigate to first course via "Redigera" button
  const redigeraBtn = page.locator('button:has-text("Redigera")').first();
  if (await redigeraBtn.count() > 0) {
    console.log('Clicking first Redigera button...');
    await redigeraBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    console.log('URL after Redigera:', page.url());
    await page.screenshot({ path: `${screenshotsDir}/04-course-editor.png` });
    
    const courseText = await page.locator('body').textContent();
    console.log('Course editor content (first 2000):', courseText?.substring(0, 2000));
    
    // Get all buttons on this page
    const editorButtons = await page.locator('button').allTextContents();
    console.log('Editor page buttons:', editorButtons);
    
    // Get all links
    const editorLinks = await page.locator('a').all();
    for (const link of editorLinks) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      console.log('Link:', href, '-', text?.trim());
    }

    // Step 4: Find "Testa" button to access test chat
    console.log('\n=== STEP 4: Find test chat ===');
    const testaBtn = page.locator('button:has-text("Testa"), a:has-text("Testa"), button:has-text("Test")').first();
    if (await testaBtn.count() > 0) {
      console.log('Found Testa button!');
      await testaBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      console.log('URL after Testa:', page.url());
      await page.screenshot({ path: `${screenshotsDir}/05-test-chat-page.png` });
      
      const chatPageText = await page.locator('body').textContent();
      console.log('Test chat page content (first 3000):', chatPageText?.substring(0, 3000));
    } else {
      // Look for step 4 tab or navigation
      console.log('No Testa button. Looking for step navigation...');
      const stepButtons = await page.locator('[class*="step"], [data-step], button').allTextContents();
      console.log('Step/nav buttons:', stepButtons);
      
      // Try clicking "Steg 4" or "Testa"
      const step4 = page.locator('button:has-text("4"), [class*="step-4"]').first();
      if (await step4.count() > 0) {
        await step4.click();
        await page.waitForTimeout(2000);
        console.log('URL after step4:', page.url());
        await page.screenshot({ path: `${screenshotsDir}/05-step4.png` });
      }
    }
  }

  // Step 5: Try to access test chat page directly
  console.log('\n=== STEP 5: Navigate to test chat directly ===');
  const currentUrl = page.url();
  const courseIdMatch = currentUrl.match(/courses\/(\d+)/);
  let courseId = courseIdMatch ? courseIdMatch[1] : null;
  
  if (!courseId) {
    // Get course list from API
    const coursesResp = await page.evaluate(async (apiBase) => {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${apiBase}/api/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return resp.json();
    }, BASE.replace(':5200', ':5210'));
    console.log('Courses from API:', JSON.stringify(coursesResp));
    if (Array.isArray(coursesResp) && coursesResp.length > 0) {
      courseId = coursesResp[0].id;
    }
  }
  
  console.log('Course ID:', courseId);
  
  if (courseId) {
    // Try the test chat URL
    const testChatUrl = `${BASE}/teacher/courses/${courseId}/test-chat`;
    console.log('Navigating to test chat:', testChatUrl);
    await page.goto(testChatUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
      await page.goto(testChatUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    });
    console.log('URL:', page.url());
    await page.screenshot({ path: `${screenshotsDir}/06-test-chat-direct.png` });
    
    const tcText = await page.locator('body').textContent();
    console.log('Test chat direct URL content (first 3000):', tcText?.substring(0, 3000));
    
    // Look for textarea
    const textarea = page.locator('textarea').first();
    const textareaCount = await textarea.count();
    console.log('Textareas found:', textareaCount);
    
    if (textareaCount > 0) {
      // Step 6: Send a chat message
      console.log('\n=== STEP 6: Send chat message ===');
      await textarea.fill('Hej! Vad handlar kursen om?');
      await page.screenshot({ path: `${screenshotsDir}/07-chat-typed.png` });
      
      const sendBtn = page.locator('button[type="submit"], button:has-text("Skicka"), button:has-text("Send")').first();
      if (await sendBtn.count() > 0) {
        console.log('Clicking send...');
        await sendBtn.click();
        
        // Watch for response - wait up to 30 seconds for streaming
        console.log('Waiting for AI response...');
        await page.waitForTimeout(15000);
        await page.screenshot({ path: `${screenshotsDir}/08-after-send.png` });
        
        const afterText = await page.locator('body').textContent();
        console.log('After send content (first 4000):', afterText?.substring(0, 4000));
      } else {
        console.log('No send button! Looking for all buttons...');
        const allBtns = await page.locator('button').allTextContents();
        console.log('All buttons:', allBtns);
      }
    } else {
      // Get all inputs
      const allInputs = await page.locator('input, textarea').all();
      console.log(`Found ${allInputs.length} inputs total`);
      for (const inp of allInputs) {
        const type = await inp.getAttribute('type');
        const placeholder = await inp.getAttribute('placeholder');
        const visible = await inp.isVisible();
        console.log(`Input: type=${type} placeholder=${placeholder} visible=${visible}`);
      }
      
      // Maybe the chat needs an "intro" first - look for a start button
      const startBtn = page.locator('button:has-text("Start"), button:has-text("Börja"), button:has-text("Starta"), button:has-text("Hälsa")').first();
      if (await startBtn.count() > 0) {
        console.log('Found start button, clicking...');
        await startBtn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${screenshotsDir}/06b-after-start.png` });
        
        // Check for textarea now
        const ta2 = page.locator('textarea').first();
        if (await ta2.count() > 0) {
          await ta2.fill('Hej! Vad handlar kursen om?');
          const sb2 = page.locator('button[type="submit"], button:has-text("Skicka")').first();
          if (await sb2.count() > 0) {
            await sb2.click();
            await page.waitForTimeout(15000);
            await page.screenshot({ path: `${screenshotsDir}/07-after-send.png` });
            const txt = await page.locator('body').textContent();
            console.log('After send:', txt?.substring(0, 4000));
          }
        }
      }
    }
  }

  // Step 7: Also check CoursePage as student view
  console.log('\n=== STEP 7: Check student course page ===');
  if (courseId) {
    await page.goto(`${BASE}/student/courses/${courseId}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    console.log('Student course URL:', page.url());
    await page.screenshot({ path: `${screenshotsDir}/09-student-course.png` });
    const studTxt = await page.locator('body').textContent();
    console.log('Student course content (first 2000):', studTxt?.substring(0, 2000));
  }

  // Final screenshot
  await page.screenshot({ path: `${screenshotsDir}/99-final.png` });

  console.log('\n\n=== FINAL CONSOLE ERRORS ===');
  consoleErrors.forEach(e => console.log(JSON.stringify(e)));
  console.log('\n=== FINAL NETWORK ERRORS ===');
  networkErrors.forEach(e => console.log(JSON.stringify(e)));

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
