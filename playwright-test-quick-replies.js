const { chromium } = require('/home/pars/.npm/_npx/bc46ece8a1067505/node_modules/playwright');

(async () => {
  // Fresh browser context - no cache, no storage
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    storageState: undefined, // no stored state
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Collect network requests to /api/ and /socket.io/
  const networkRequests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('/socket.io/')) {
      networkRequests.push(`REQUEST: ${request.method()} ${url}`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('/socket.io/')) {
      networkRequests.push(`RESPONSE: ${response.status()} ${url}`);
    }
  });

  try {
    console.log('=== STEP 1: Navigate to login page ===');
    await page.goto('http://wit.just-bake.it:5200/login', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Current URL:', page.url());

    console.log('\n=== STEP 2: Login ===');
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="e-post" i]', 'steffansson18@sent.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button[type="submit"], button:has-text("Logga in"), button:has-text("Login")');

    await page.waitForNavigation({ timeout: 15000 }).catch(() => console.log('Navigation timeout (may be ok)'));
    console.log('After login URL:', page.url());

    console.log('\n=== STEP 3: Navigate to test-chat ===');
    await page.goto('http://wit.just-bake.it:5200/teacher/courses/2/test-chat', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Test-chat URL:', page.url());

    // Check window.location.href
    const locationHref = await page.evaluate(() => window.location.href);
    console.log('window.location.href:', locationHref);

    // Check what URL fetch('/api/chat/2') would resolve to
    const fetchUrl = await page.evaluate(() => {
      const url = new URL('/api/chat/2', window.location.href);
      return url.href;
    });
    console.log('fetch("/api/chat/2") resolves to:', fetchUrl);

    // Wait for page to fully load
    await page.waitForTimeout(3000);

    console.log('\n=== STEP 4: Find and click Reset button ===');
    // Look for reset button
    const resetButtonTexts = ['Reset båda chattar', 'Rensa', 'Reset', 'Återställ'];
    let resetClicked = false;

    for (const text of resetButtonTexts) {
      const btn = page.locator(`button:has-text("${text}")`).first();
      const count = await btn.count();
      if (count > 0) {
        console.log(`Found reset button with text: "${text}"`);
        await btn.click();
        resetClicked = true;
        console.log('Clicked reset button');
        break;
      }
    }

    if (!resetClicked) {
      // Try to find any button with reset-like text
      const buttons = await page.locator('button').all();
      console.log('All buttons on page:');
      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log(' - Button:', text?.trim());
      }
    }

    await page.waitForTimeout(2000);

    console.log('\n=== STEP 5: Wait for intro message to finish streaming ===');
    // Wait for intro message - look for AI response in chat
    try {
      await page.waitForSelector('[class*="message"], [class*="chat"], .message, .ai-message, [data-role="assistant"]', { timeout: 20000 });
      console.log('Chat message element found');
    } catch (e) {
      console.log('Could not find chat message element:', e.message);
    }

    // Wait for streaming to finish (look for no loading indicators)
    await page.waitForTimeout(5000);

    // Check if there's a streaming/loading indicator
    const loadingExists = await page.locator('[class*="loading"], [class*="streaming"], .typing-indicator').count();
    console.log('Loading indicators:', loadingExists);

    console.log('\n=== STEP 6: Send message "Vad är en storhet?" ===');
    // Find the input field
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      '[placeholder*="Skriv"]',
      '[placeholder*="meddelande"]',
      '[placeholder*="message"]',
      'input[placeholder]'
    ];

    let inputFound = false;
    for (const sel of inputSelectors) {
      const inp = page.locator(sel).first();
      const count = await inp.count();
      if (count > 0) {
        console.log(`Found input with selector: ${sel}`);
        await inp.click();
        await inp.fill('Vad är en storhet?');
        inputFound = true;
        break;
      }
    }

    if (!inputFound) {
      console.log('Could not find input field!');
    }

    // Send the message
    await page.keyboard.press('Enter');
    console.log('Message sent');

    console.log('\n=== STEP 7: Wait for AI response (up to 20 seconds) ===');
    await page.waitForTimeout(20000);

    console.log('\n=== STEP 8: Wait additional 10 seconds for socket events ===');
    await page.waitForTimeout(10000);

    console.log('\n=== STEP 9: Check for quick reply buttons ===');
    // Look for quick reply buttons - various possible selectors
    const quickReplySelectors = [
      '[class*="quick-reply"]',
      '[class*="quickReply"]',
      '[class*="quick_reply"]',
      '[class*="suggestion"]',
      '[class*="chip"]',
      'button[data-quick-reply]',
    ];

    for (const sel of quickReplySelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        console.log(`FOUND quick reply buttons with selector "${sel}": ${count} button(s)`);
        const texts = await page.locator(sel).allTextContents();
        console.log('Quick reply texts:', texts);
      }
    }

    // Also check all buttons after the response
    console.log('\nAll buttons currently on page:');
    const allButtons = await page.locator('button').all();
    for (const btn of allButtons) {
      const text = await btn.textContent();
      const isVisible = await btn.isVisible();
      if (isVisible) {
        console.log(`  Visible button: "${text?.trim()}"`);
      }
    }

    // Take screenshot
    console.log('\n=== Taking screenshot ===');
    await page.screenshot({ path: '/tmp/quick-replies-test.png', fullPage: true });
    console.log('Screenshot saved to /tmp/quick-replies-test.png');

    // Print HTML of chat area for debugging
    console.log('\n=== Page HTML (chat area) ===');
    const chatHtml = await page.evaluate(() => {
      // Try to find the chat container
      const selectors = ['[class*="chat"]', '[class*="message"]', 'main', '#root'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el.innerHTML.substring(0, 3000);
      }
      return document.body.innerHTML.substring(0, 3000);
    });
    console.log(chatHtml);

  } catch (error) {
    console.error('ERROR:', error.message);
    await page.screenshot({ path: '/tmp/quick-replies-error.png', fullPage: true });
    console.log('Error screenshot saved to /tmp/quick-replies-error.png');
  } finally {
    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== Network Requests ===');
    networkRequests.forEach(req => console.log(req));

    await browser.close();
  }
})();
