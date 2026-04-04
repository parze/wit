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
  const allNetworkResponses = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({ type, text, url: page.url() });
    }
    console.log(`[CONSOLE ${type}] ${text}`);
  });

  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    allNetworkResponses.push({ status, url });
    if (!response.ok() && status !== 304) {
      networkErrors.push({ status, url });
      console.log(`[NETWORK ERROR] ${status} ${url}`);
    }
  });

  page.on('requestfailed', request => {
    const err = { failure: request.failure()?.errorText, url: request.url() };
    networkErrors.push(err);
    console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });

  const BASE = 'http://wit.just-bake.it:5200';

  // Step 1: Navigate to login page
  console.log('\n=== STEP 1: Navigate to login page ===');
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  } catch(e) {
    console.log('Navigation error:', e.message);
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await page.screenshot({ path: `${screenshotsDir}/01-login-page.png` });
  console.log('Login page URL:', page.url());
  console.log('Login page title:', await page.title());
  const loginHtml = await page.content();
  console.log('Login page HTML snippet (first 2000):', loginHtml.substring(0, 2000));

  // Step 2: Try to login
  const passwords = ['TestPass123'];
  let loggedIn = false;
  let workingPwd = null;

  for (const pwd of passwords) {
    console.log(`\nTrying password: ${pwd}`);
    
    // Wait for email input to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 5000 }).catch(() => {});
    
    await page.fill('input[type="email"]', 'steffansson18@sent.com');
    await page.fill('input[type="password"]', pwd);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('URL after attempt:', currentUrl);

    if (!currentUrl.includes('/login')) {
      console.log(`SUCCESS with password: ${pwd}`);
      loggedIn = true;
      workingPwd = pwd;
      break;
    } else {
      // Check for error message
      const bodyText = await page.locator('body').textContent().catch(() => '');
      const errorSnippet = bodyText.substring(0, 300);
      console.log('Body text:', errorSnippet);
    }
  }

  if (!loggedIn) {
    console.log('\n!!! Could not login with any tested password !!!');
    await page.screenshot({ path: `${screenshotsDir}/02-login-failed.png` });
    await browser.close();
    console.log('\n=== CONSOLE ERRORS ===');
    consoleErrors.forEach(e => console.log(JSON.stringify(e)));
    console.log('\n=== NETWORK ERRORS ===');
    networkErrors.forEach(e => console.log(JSON.stringify(e)));
    return;
  }

  await page.screenshot({ path: `${screenshotsDir}/03-logged-in.png` });
  console.log('\n=== STEP 3: After login ===');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  console.log('Current URL:', page.url());

  const pageContent = await page.locator('body').textContent();
  console.log('Page content after login (first 2000):', pageContent?.substring(0, 2000));

  // Collect all links
  const linkElements = await page.locator('a[href]').all();
  const links = [];
  for (const el of linkElements) {
    const href = await el.getAttribute('href');
    const text = (await el.textContent()).trim();
    links.push({ href, text });
  }
  console.log('All links on page:', JSON.stringify(links, null, 2));

  // Step 4: Navigate to courses
  console.log('\n=== STEP 4: Navigate to courses ===');
  
  // Try teacher dashboard first
  await page.goto(`${BASE}/teacher/courses`, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
    await page.goto(`${BASE}/teacher/courses`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  });
  await page.screenshot({ path: `${screenshotsDir}/04-teacher-courses.png` });
  console.log('Teacher courses URL:', page.url());
  
  const teacherCoursesText = await page.locator('body').textContent();
  console.log('Teacher courses page (first 2000):', teacherCoursesText?.substring(0, 2000));

  // Find course links
  const courseLinks = await page.locator('a[href*="/courses/"]').all();
  console.log(`Found ${courseLinks.length} course links`);
  
  let courseId = null;
  if (courseLinks.length > 0) {
    const href = await courseLinks[0].getAttribute('href');
    console.log('First course link:', href);
    const match = href.match(/courses\/(\d+)/);
    if (match) courseId = match[1];
    
    await courseLinks[0].click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    console.log('URL after clicking course:', page.url());
    await page.screenshot({ path: `${screenshotsDir}/05-course-page.png` });
    
    const coursePageText = await page.locator('body').textContent();
    console.log('Course page content (first 3000):', coursePageText?.substring(0, 3000));
  } else {
    console.log('No course links found on teacher courses page. Trying to find courses differently...');
    
    // Look for any clickable items that might be courses
    const buttons = await page.locator('button, [role="button"]').allTextContents();
    console.log('Buttons:', buttons);
    
    const cards = await page.locator('[class*="card"], [class*="course"]').allTextContents();
    console.log('Cards:', cards.slice(0, 10));
  }

  // Step 5: Look for test chat (teacher mode)
  console.log('\n=== STEP 5: Look for test/chat functionality ===');
  
  const testChatLink = page.locator('a[href*="test"], button:has-text("Test"), button:has-text("Testa"), a:has-text("Testa")').first();
  if (await testChatLink.count() > 0) {
    console.log('Found test chat button!');
    await testChatLink.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    console.log('URL after clicking test chat:', page.url());
    await page.screenshot({ path: `${screenshotsDir}/06-test-chat-page.png` });
  }

  // Step 6: Try to find and use chat
  console.log('\n=== STEP 6: Find chat input ===');
  
  // Look for chat input elements
  const textareas = await page.locator('textarea').all();
  const chatInputs = await page.locator('input[type="text"]').all();
  console.log(`Found ${textareas.length} textareas and ${chatInputs.length} text inputs`);

  const allInputs = await page.locator('textarea, input[type="text"]').all();
  for (let i = 0; i < allInputs.length; i++) {
    const placeholder = await allInputs[i].getAttribute('placeholder');
    const name = await allInputs[i].getAttribute('name');
    console.log(`Input ${i}: placeholder="${placeholder}" name="${name}"`);
  }

  const chatInput = page.locator('textarea').first();
  const chatInputCount = await chatInput.count();
  
  if (chatInputCount > 0) {
    console.log('Found textarea, trying to send message...');
    await chatInput.fill('Hej! Vad handlar det här momentet om?');
    await page.screenshot({ path: `${screenshotsDir}/06-chat-typed.png` });
    
    // Find send button
    const sendButton = page.locator('button[type="submit"], button:has-text("Skicka"), button:has-text("Send")').first();
    if (await sendButton.count() > 0) {
      console.log('Clicking send button...');
      await sendButton.click();
      
      // Wait and collect response
      await page.waitForTimeout(8000);
      await page.screenshot({ path: `${screenshotsDir}/07-after-send.png` });
      console.log('URL after send:', page.url());
      
      const afterSendText = await page.locator('body').textContent();
      console.log('Page after send (first 3000):', afterSendText?.substring(0, 3000));
    } else {
      // Try pressing Enter
      console.log('No send button, trying Enter key...');
      await chatInput.press('Enter');
      await page.waitForTimeout(8000);
      await page.screenshot({ path: `${screenshotsDir}/07-after-enter.png` });
    }
  } else {
    console.log('No chat input found!');
    // Try navigating directly to a course page as student
    if (courseId) {
      console.log(`Trying student course page for course ${courseId}...`);
      await page.goto(`${BASE}/student/courses/${courseId}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      console.log('URL:', page.url());
      await page.screenshot({ path: `${screenshotsDir}/06-student-course.png` });
      const txt = await page.locator('body').textContent();
      console.log('Student course page:', txt?.substring(0, 2000));
    }
  }

  // Final state
  await page.screenshot({ path: `${screenshotsDir}/99-final.png` });

  console.log('\n\n=== FINAL CONSOLE ERRORS ===');
  consoleErrors.forEach(e => console.log(JSON.stringify(e)));
  console.log('\n=== FINAL NETWORK ERRORS ===');
  networkErrors.forEach(e => console.log(JSON.stringify(e)));
  console.log('\n=== ALL NETWORK RESPONSES (non-200) ===');
  allNetworkResponses.filter(r => r.status >= 400).forEach(r => console.log(JSON.stringify(r)));

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
