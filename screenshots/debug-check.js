const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('PAGE_ERROR: ' + err.message));

  // Check network failures
  const failedRequests = [];
  page.on('response', resp => {
    if (resp.status() >= 400) {
      failedRequests.push(`${resp.status()} ${resp.url()}`);
    }
  });

  console.log('Opening http://localhost:5000...');
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'screenshots/debug-1-initial.png', fullPage: false });
  console.log('Screenshot 1 taken');

  // Wait for JS to execute
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/debug-2-after-wait.png', fullPage: false });
  console.log('Screenshot 2 taken');

  // Check DOM state
  const state = await page.evaluate(() => {
    const app = document.querySelector('.app');
    const loginOverlay = document.querySelector('#login-overlay') || document.querySelector('.login-overlay');
    return {
      title: document.title,
      hasApp: !!app,
      appClasses: app ? app.className : 'N/A',
      hasLoginOverlay: !!loginOverlay,
      loginOverlayDisplay: loginOverlay ? getComputedStyle(loginOverlay).display : 'N/A',
      navBtnsCount: document.querySelectorAll('.nav-btn').length,
      bodyClasses: document.body.className,
      localStorage_token: !!localStorage.getItem('bt_token'),
      localStorage_user: !!localStorage.getItem('bt_user'),
      visibleText: document.body.innerText.substring(0, 500)
    };
  });

  console.log('\n=== DOM State ===');
  console.log(JSON.stringify(state, null, 2));

  console.log('\n=== Console Errors ===');
  consoleErrors.forEach(e => console.log('  ' + e));

  console.log('\n=== Failed Requests ===');
  failedRequests.forEach(r => console.log('  ' + r));

  await browser.close();
})();
