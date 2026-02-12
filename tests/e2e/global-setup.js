// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');

/**
 * Global setup for Playwright: performs a real user login flow
 * (email + magic code) once, then saves storageState for all tests.
 */
module.exports = async config => {
  const baseURL = process.env.BASE_URL || (config?.projects?.[0]?.use?.baseURL) || 'http://localhost:5050';

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Open app root — should show login overlay when no token is present
  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });

  // Wait for login overlay
  await page.waitForSelector('#login-overlay', { timeout: 15000 });

  // Anti-reload-loop guard uses 3s window; ensure enough time passes before login completes
  await page.waitForTimeout(3500);

  // 2. Enter email and request magic code
  const email = process.env.BT_E2E_EMAIL || 'test@example.com';
  await page.fill('#login-email', email);
  await page.click('#send-code-btn');

  // 3. Wait for code step
  await page.waitForSelector('#login-step-code', { state: 'visible', timeout: 15000 });

  // In dev mode backend returns devCode and login.ts auto-fills #login-code.
  // Wait until the input has a 6-digit value.
  await page.waitForFunction(() => {
    const input = document.getElementById('login-code');
    return input && input.value && input.value.length === 6;
  }, null, { timeout: 15000 });

  // 4. Submit code — handleAuthResponse will set token and call window.location.reload()
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.click('#verify-code-btn')
  ]);

  // 5. Debug: what's the state after reload?
  await page.waitForTimeout(5000);
  const debug = await page.evaluate(() => ({
    hasToken: !!localStorage.getItem('bt_token'),
    hasUser: !!localStorage.getItem('bt_user'),
    appClass: document.querySelector('.app')?.className || 'NO .app FOUND',
    hasLoginOverlay: !!document.getElementById('login-overlay'),
    loginError: document.getElementById('login-error')?.textContent || '',
    codeError: document.getElementById('login-code-error')?.textContent || '',
    url: location.href,
    btRl: sessionStorage.getItem('_bt_rl'),
  }));
  console.log('=== GLOBAL SETUP DEBUG ===', JSON.stringify(debug, null, 2));

  if (debug.appClass.includes('auth-hidden')) {
    throw new Error('App still auth-hidden after login. Debug: ' + JSON.stringify(debug));
  }

  await page.waitForSelector('.nav-btn', { state: 'visible', timeout: 15000 });

  // 6. Save authenticated storage state for reuse in all tests
  const storageDir = 'tests/e2e/storage';
  fs.mkdirSync(storageDir, { recursive: true });
  await page.context().storageState({ path: storageDir + '/auth.json' });

  await browser.close();
};
