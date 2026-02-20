const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  // Auth
  const sendRes = await page.request.post('http://localhost:5000/api/v1/auth/send-code', {
    data: { email: 'e2e@test.com' },
    headers: { 'Content-Type': 'application/json' }
  });
  const { devCode } = await sendRes.json();
  const verifyRes = await page.request.post('http://localhost:5000/api/v1/auth/verify-code', {
    data: { email: 'e2e@test.com', code: devCode },
    headers: { 'Content-Type': 'application/json' }
  });
  const auth = await verifyRes.json();
  console.log('Auth OK');

  await page.addInitScript(([token, user]) => {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));
  }, [auth.token, auth.user]);

  await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('Page loaded');

  // Wait for app to initialize
  try {
    await page.waitForSelector('.app:not(.auth-hidden)', { timeout: 10000 });
    console.log('Auth gate passed');
  } catch {
    console.log('WARN: auth-hidden still present');
  }

  await page.waitForTimeout(3000);

  // Test evaluate
  try {
    const state = await Promise.race([
      page.evaluate(() => ({
        appClasses: document.querySelector('.app')?.className,
        activePage: document.querySelector('.page.active')?.id || 'none',
        navBtns: [...document.querySelectorAll('.nav-btn')].map(b => b.textContent?.trim()),
        dashboardDrugs: document.getElementById('dashboard-drugs')?.children.length || 0,
        courseHeader: document.getElementById('course-name')?.textContent || 'none',
      })),
      new Promise((_, reject) => setTimeout(() => reject(new Error('FROZEN')), 5000))
    ]);
    console.log('PAGE IS RESPONSIVE!');
    console.log('State:', JSON.stringify(state, null, 2));
  } catch (e) {
    console.log('STILL FROZEN:', e.message);
    await browser.close();
    process.exit(1);
  }

  // Test navigation
  console.log('\nTesting navigation...');
  const navBtns = await page.locator('.nav-btn').all();
  for (const btn of navBtns) {
    const text = (await btn.textContent())?.trim();
    try {
      await btn.click({ timeout: 2000 });
      await page.waitForTimeout(300);
      const activePage = await page.evaluate(() => document.querySelector('.page.active')?.id || 'none');
      console.log(`  ${text} → ${activePage}`);
    } catch {
      console.log(`  ${text} → CLICK FAILED`);
    }
  }

  // Screenshot test
  console.log('\nTaking screenshot...');
  try {
    await page.screenshot({ path: 'screenshots/fix-verified.png', timeout: 5000 });
    console.log('Screenshot OK: screenshots/fix-verified.png');
  } catch (e) {
    console.log('Screenshot failed:', e.message);
  }

  await browser.close();
  console.log('\nDone!');
})();
