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
  const chatResponses = [];

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
      if (url.includes('/chat')) {
        // This is a SSE stream - just log status
        chatResponses.push({ status, url });
        console.log(`[CHAT RESPONSE] ${status} ${url}`);
      } else if (!response.ok() && status !== 304) {
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

  // Intercept SSE responses for chat
  await page.route('**/api/chat/**', async (route, request) => {
    console.log(`[CHAT REQUEST] ${request.method()} ${request.url()}`);
    console.log(`[CHAT BODY] ${request.postData()}`);
    await route.continue();
  });

  const BASE = 'http://wit.just-bake.it:5200';

  // Login
  console.log('\n=== STEP 1: Login ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"]', 'steffansson18@sent.com');
  await page.fill('input[type="password"]', 'TestPass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('Login URL:', page.url());
  await page.screenshot({ path: `${screenshotsDir}/01-login.png` });

  // Navigate to test chat for course 2
  console.log('\n=== STEP 2: Navigate to test chat ===');
  await page.goto(`${BASE}/teacher/courses/2/test-chat`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000); // Wait for intro to load
  console.log('Test chat URL:', page.url());
  await page.screenshot({ path: `${screenshotsDir}/02-test-chat.png` });
  
  const pageText = await page.locator('body').textContent();
  console.log('Test chat initial content (first 2000):', pageText?.substring(0, 2000));

  // Find the chat input
  console.log('\n=== STEP 3: Find chat input ===');
  const chatInput = page.locator('input[placeholder="Skriv din fråga..."]');
  const inputCount = await chatInput.count();
  console.log('Chat inputs found:', inputCount);

  if (inputCount > 0) {
    const isVisible = await chatInput.isVisible();
    const isEnabled = await chatInput.isEnabled();
    console.log(`Input visible: ${isVisible}, enabled: ${isEnabled}`);
    
    await page.screenshot({ path: `${screenshotsDir}/03-before-type.png` });
    
    // Type a message
    console.log('\n=== STEP 4: Type and send message ===');
    await chatInput.fill('En enhet saknas! Det spelar roll för att vi ska kunna förstå hur lång bron är.');
    await page.screenshot({ path: `${screenshotsDir}/04-typed.png` });
    
    // Find and click send button
    const sendBtn = page.locator('button:has-text("Skicka")');
    const sendBtnCount = await sendBtn.count();
    console.log('Send buttons found:', sendBtnCount);
    
    if (sendBtnCount > 0) {
      const sendVisible = await sendBtn.isVisible();
      const sendEnabled = await sendBtn.isEnabled();
      console.log(`Send button visible: ${sendVisible}, enabled: ${sendEnabled}`);
      
      console.log('Clicking send button...');
      await sendBtn.click();
      
      // Wait and capture what happens
      console.log('Waiting for response (30 seconds)...');
      
      let responseReceived = false;
      const initialText = await page.locator('body').textContent();
      
      // Poll every 2 seconds for changes
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(2000);
        const newText = await page.locator('body').textContent();
        if (newText !== initialText) {
          console.log(`Response detected after ${(i+1)*2} seconds!`);
          responseReceived = true;
          break;
        }
        console.log(`... waiting (${(i+1)*2}s)`);
      }
      
      await page.screenshot({ path: `${screenshotsDir}/05-after-send.png` });
      
      const afterText = await page.locator('body').textContent();
      console.log('Page after send (first 4000):', afterText?.substring(0, 4000));
      
      if (!responseReceived) {
        console.log('NO RESPONSE RECEIVED after 30 seconds!');
      }
      
      // Check for any error elements
      const errorElements = await page.locator('[class*="error"], [class*="Error"], [class*="alert"], [role="alert"]').allTextContents();
      console.log('Error elements on page:', errorElements);
      
      // Check for loading indicators
      const loadingElements = await page.locator('[class*="loading"], [class*="Loading"], [class*="spinner"]').allTextContents();
      console.log('Loading elements:', loadingElements);
      
    } else {
      console.log('No send button found!');
      const allBtns = await page.locator('button').allTextContents();
      console.log('All buttons:', allBtns);
    }
  } else {
    console.log('NO CHAT INPUT FOUND!');
    // Debug the DOM structure
    const allInputs = await page.locator('input, textarea, [contenteditable]').all();
    for (const inp of allInputs) {
      const type = await inp.getAttribute('type');
      const placeholder = await inp.getAttribute('placeholder');
      const visible = await inp.isVisible();
      const tag = await inp.evaluate(el => el.tagName);
      console.log(`Element: <${tag}> type=${type} placeholder=${placeholder} visible=${visible}`);
    }
  }

  // Final screenshot
  await page.screenshot({ path: `${screenshotsDir}/99-final.png` });

  console.log('\n\n=== FINAL SUMMARY ===');
  console.log('Console errors:', JSON.stringify(consoleErrors, null, 2));
  console.log('Network errors:', JSON.stringify(networkErrors, null, 2));
  console.log('Chat responses:', JSON.stringify(chatResponses, null, 2));

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
