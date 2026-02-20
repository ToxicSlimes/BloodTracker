const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // VISIBLE browser
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

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
  console.log('Authenticated');

  await page.addInitScript(([token, user]) => {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));
  }, [auth.token, auth.user]);

  await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 15000 });

  try {
    await page.waitForSelector('.app:not(.auth-hidden)', { timeout: 15000 });
    console.log('App loaded - auth OK');
  } catch {
    console.log('WARN: auth-hidden still present');
  }

  await page.waitForTimeout(2000);

  // Test interactions WITHOUT screenshots
  const state = await page.evaluate(() => {
    return {
      appClasses: document.querySelector('.app')?.className,
      navBtns: [...document.querySelectorAll('.nav-btn')].map(b => b.textContent.trim()),
      activePage: document.querySelector('.page.active')?.id || 'none',
    };
  });
  console.log('DOM state:', JSON.stringify(state));

  // Click nav buttons
  const navBtns = await page.locator('.nav-btn').all();
  for (const btn of navBtns) {
    const text = (await btn.textContent()).trim();
    await btn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    const activePage = await page.evaluate(() => document.querySelector('.page.active')?.id || 'none');
    console.log(`Nav: ${text} → page: ${activePage}`);
  }

  // Check if page is responsive
  console.log('\nTesting responsiveness...');
  const t1 = Date.now();
  await page.evaluate(() => document.title);
  console.log(`evaluate latency: ${Date.now() - t1}ms`);

  // Try screenshot with very short timeout to see if it blocks
  console.log('Trying screenshot...');
  try {
    await page.screenshot({ path: 'screenshots/test.png', timeout: 5000 });
    console.log('Screenshot OK!');
  } catch (e) {
    console.log('Screenshot FAILED (timeout) - CSS effects blocking rendering');

    // Try with reduced CSS
    await page.evaluate(() => {
      document.querySelectorAll('.flicker-overlay, .vignette-overlay, .noise-overlay').forEach(el => el.remove());
      document.body.classList.remove('crt');
      document.querySelector('.app')?.classList.remove('scanline-move', 'crt-text');
    });
    await page.waitForTimeout(500);

    try {
      await page.screenshot({ path: 'screenshots/test-no-crt.png', timeout: 5000 });
      console.log('Screenshot OK after removing CRT effects!');
    } catch {
      console.log('Still fails. Deeper issue.');
    }
  }

  await browser.close();
  console.log('Done!');
})();
