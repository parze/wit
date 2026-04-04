const { chromium } = require('./node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

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
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({ type, text, url: page.url() });
    }
    console.log(`[CONSOLE ${type}] ${text}`);
  });

  page.on('response', response => {
    if (!response.ok() && response.status() !== 304) {
      networkErrors.push({ status: response.status(), url: response.url() });
      console.log(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
    }
  });

  page.on('requestfailed', request => {
    networkErrors.push({ failure: request.failure()?.errorText, url: request.url() });
    console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });

  const BASE = 'http://wit.just-bake.it:5200';

  // Step 1: Navigate to login page
  console.log('\n=== STEP 1: Navigate to login page ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${screenshotsDir}/01-login-page.png` });
  console.log('Login page URL:', page.url());
  console.log('Login page title:', await page.title());

  // Step 2: Try to login with different passwords
  const passwords = ['larmig', 'Test1234!', 'password123', 'test', 'password', '1234', 'admin', 'larmig123', 'Larmig1!'];
  let loggedIn = false;

  for (const pwd of passwords) {
    console.log(`\n=== STEP 2: Trying password: ${pwd} ===`);
    await page.fill('input[type="email"]', 'steffansson18@sent.com');
    await page.fill('input[type="password"]', pwd);
    await page.screenshot({ path: `${screenshotsDir}/02-login-filled-${pwd.replace(/[^a-z0-9]/gi, '_')}.png` });
    await page.click('button[type="submit"]');

    try {
      await page.waitForNavigation({ timeout: 5000 });
    } catch(e) {}

    const currentUrl = page.url();
    console.log('URL after login attempt:', currentUrl);

    if (!currentUrl.includes('/login')) {
      console.log(`SUCCESS! Logged in with password: ${pwd}`);
      loggedIn = true;
      await page.screenshot({ path: `${screenshotsDir}/03-logged-in.png` });
      break;
    } else {
      // Check for error message
      const errorText = await page.locator('.error, [class*="error"], [class*="alert"], [role="alert"]').textContent().catch(() => null);
      if (errorText) console.log('Error message:', errorText);
      // Clear for next try
      await page.fill('input[type="email"]', '');
      await page.fill('input[type="password"]', '');
    }
  }

  if (!loggedIn) {
    console.log('\nFailed to login with any password. Taking screenshot of current state...');
    await page.screenshot({ path: `${screenshotsDir}/02-login-failed.png` });
    
    // Try to get visible text on page
    const bodyText = await page.locator('body').textContent();
    console.log('Page body text (first 500 chars):', bodyText?.substring(0, 500));
    await browser.close();
    
    console.log('\n=== SUMMARY ===');
    console.log('Console errors:', JSON.stringify(consoleErrors, null, 2));
    console.log('Network errors:', JSON.stringify(networkErrors, null, 2));
    return;
  }

  // Step 3: Navigate and find a course/chat
  console.log('\n=== STEP 3: Look for courses ===');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  await page.screenshot({ path: `${screenshotsDir}/03-after-login.png` });

  // Get page content
  const bodyText = await page.locator('body').textContent();
  console.log('Page body (first 1000 chars):', bodyText?.substring(0, 1000));

  // Look for course links
  const links = await page.locator('a').allTextContents();
  console.log('All links:', links);

  // Try to navigate to teacher courses
  if (currentUrl.includes('/teacher')) {
    console.log('On teacher page. Looking for courses...');
    const courseLinks = await page.locator('a[href*="course"], button').allTextContents();
    console.log('Course-related elements:', courseLinks.slice(0, 20));
  }

  // Step 4: Navigate to a course - try to find and click one
  console.log('\n=== STEP 4: Navigate to a course ===');
  
  // Look for clickable course items
  const courseItem = page.locator('[href*="courses/"], [href*="course/"]').first();
  const courseItemExists = await courseItem.count();
  
  if (courseItemExists > 0) {
    const href = await courseItem.getAttribute('href');
    console.log('Found course link:', href);
    await courseItem.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    console.log('Course URL:', page.url());
    await page.screenshot({ path: `${screenshotsDir}/04-course-page.png` });
  } else {
    console.log('No course links found directly. Trying /teacher/courses...');
    await page.goto(`${BASE}/teacher/courses`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: `${screenshotsDir}/04-teacher-courses.png` });
    console.log('Teacher courses URL:', page.url());
    const pageText = await page.locator('body').textContent();
    console.log('Page content:', pageText?.substring(0, 2000));
  }

  // Step 5: Find a chat view
  console.log('\n=== STEP 5: Look for chat functionality ===');
  
  // Get all links on current page
  const allLinks = await page.locator('a').all();
  const linkData = [];
  for (const link of allLinks) {
    const href = await link.getAttribute('href').catch(() => null);
    const text = await link.textContent().catch(() => '');
    linkData.push({ href, text: text?.trim() });
  }
  console.log('All links:', JSON.stringify(linkData, null, 2));

  await page.screenshot({ path: `${screenshotsDir}/05-before-chat.png` });

  // Try clicking on first course
  const firstCourseLink = page.locator('a[href*="/courses/"]').first();
  const firstCourseLinkCount = await firstCourseLink.count();
  if (firstCourseLinkCount > 0) {
    const href = await firstCourseLink.getAttribute('href');
    console.log('Clicking course:', href);
    await firstCourseLink.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    console.log('URL after clicking course:', page.url());
    await page.screenshot({ path: `${screenshotsDir}/05-course-detail.png` });
    
    const courseText = await page.locator('body').textContent();
    console.log('Course page content:', courseText?.substring(0, 2000));
  }

  // Step 6: Find chat input and send message
  console.log('\n=== STEP 6: Try sending a chat message ===');
  
  // Look for chat-related elements
  const chatInput = page.locator('textarea, input[placeholder*="Skriv"], input[placeholder*="skriv"], input[placeholder*="message"], input[placeholder*="meddelande"]').first();
  const chatInputCount = await chatInput.count();
  
  if (chatInputCount > 0) {
    console.log('Found chat input!');
    await chatInput.fill('Hej! Kan du hjälpa mig?');
    await page.screenshot({ path: `${screenshotsDir}/06-chat-filled.png` });
    
    // Find send button
    const sendBtn = page.locator('button[type="submit"], button:has-text("Skicka"), button:has-text("Send")').first();
    const sendBtnCount = await sendBtn.count();
    
    if (sendBtnCount > 0) {
      console.log('Found send button, clicking...');
      await sendBtn.click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${screenshotsDir}/07-after-send.png` });
      console.log('URL after sending message:', page.url());
      
      const afterSendText = await page.locator('body').textContent();
      console.log('Page after send:', afterSendText?.substring(0, 2000));
    } else {
      console.log('No send button found!');
      await page.screenshot({ path: `${screenshotsDir}/06-no-send-button.png` });
    }
  } else {
    console.log('No chat input found on this page!');
    // Check if there are any form elements
    const formElements = await page.locator('input, textarea, button').allTextContents();
    console.log('All form elements:', formElements);
    await page.screenshot({ path: `${screenshotsDir}/06-no-chat-input.png` });
    
    // Try to navigate to a chat page directly
    // Maybe the teacher needs to open the test chat
    console.log('Looking for test chat or "Testa" button...');
    const testaBtn = page.locator('button:has-text("Testa"), a:has-text("Testa"), button:has-text("Test")').first();
    if (await testaBtn.count() > 0) {
      await testaBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      console.log('URL after clicking Testa:', page.url());
      await page.screenshot({ path: `${screenshotsDir}/06-test-chat.png` });
    }
  }

  // Final screenshot
  await page.screenshot({ path: `${screenshotsDir}/99-final.png` });

  console.log('\n=== FINAL SUMMARY ===');
  console.log('Console errors:', JSON.stringify(consoleErrors, null, 2));
  console.log('Network errors:', JSON.stringify(networkErrors.slice(0, 30), null, 2));

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
