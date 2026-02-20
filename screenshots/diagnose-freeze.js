const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Capture ALL console messages from the page
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[PAGE ${type}] ${text}`);
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  page.on('crash', () => {
    console.log('[PAGE CRASH]');
  });

  // Step 1: Test WITHOUT auth first - does the login page even load?
  console.log('=== TEST 1: Loading page WITHOUT auth ===');
  await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 10000 });

  // Wait a bit for JS to execute
  await page.waitForTimeout(3000);

  // Try evaluate with timeout
  try {
    const result = await Promise.race([
      page.evaluate(() => {
        return {
          title: document.title,
          loginOverlay: !!document.getElementById('login-overlay'),
          authHidden: document.querySelector('.app')?.classList.contains('auth-hidden'),
          bodyClasses: document.body.className,
          scripts: document.querySelectorAll('script').length,
        };
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('evaluate timeout 5s')), 5000))
    ]);
    console.log('Page state (no auth):', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('FROZEN even without auth! Error:', e.message);
    // Try to capture what we can via CDP
    try {
      const cdp = await page.context().newCDPSession(page);
      const heap = await cdp.send('Runtime.getHeapUsage');
      console.log('Heap usage:', JSON.stringify(heap));
    } catch {}
  }

  // Step 2: Test WITH auth
  console.log('\n=== TEST 2: Loading page WITH auth ===');

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
  console.log('Auth token obtained');

  // Navigate to a fresh page with auth
  const page2 = await ctx.newPage();
  page2.on('console', msg => console.log(`[P2 ${msg.type()}] ${msg.text()}`));
  page2.on('pageerror', err => console.log(`[P2 ERROR] ${err.message}`));

  // Inject console timing markers into init flow
  await page2.addInitScript(([token, user]) => {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));

    // Monkey-patch to trace init timing
    const origAddEventListener = document.addEventListener.bind(document);
    document.addEventListener = function(type, fn, ...args) {
      if (type === 'DOMContentLoaded') {
        console.log('[TRACE] DOMContentLoaded listener registered');
        const wrappedFn = async function(...fnArgs) {
          console.log('[TRACE] DOMContentLoaded fired - init() starting');
          const start = performance.now();
          try {
            const result = fn.apply(this, fnArgs);
            if (result && typeof result.then === 'function') {
              result.then(() => {
                console.log(`[TRACE] init() resolved after ${(performance.now() - start).toFixed(0)}ms`);
              }).catch(err => {
                console.log(`[TRACE] init() rejected after ${(performance.now() - start).toFixed(0)}ms: ${err}`);
              });
            }
          } catch (err) {
            console.log(`[TRACE] init() threw: ${err}`);
          }
        };
        return origAddEventListener(type, wrappedFn, ...args);
      }
      return origAddEventListener(type, fn, ...args);
    };
  }, [auth.token, auth.user]);

  await page2.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('Page navigated, waiting 5s for init...');

  await page2.waitForTimeout(5000);

  // Try evaluate with increasing timeouts
  for (const timeout of [2000, 5000, 10000]) {
    console.log(`\nTrying evaluate with ${timeout}ms timeout...`);
    try {
      const state = await Promise.race([
        page2.evaluate(() => {
          return {
            appClasses: document.querySelector('.app')?.className,
            loginOverlay: !!document.getElementById('login-overlay'),
            navBtns: [...document.querySelectorAll('.nav-btn')].map(b => b.textContent?.trim()),
            activePage: document.querySelector('.page.active')?.id || 'none',
            errorElements: [...document.querySelectorAll('.error, .toast-error')].map(e => e.textContent),
          };
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout ${timeout}ms`)), timeout))
      ]);
      console.log('SUCCESS! DOM state:', JSON.stringify(state, null, 2));
      break;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }

  // If page is frozen, try to get CPU profile
  try {
    const cdp = await page2.context().newCDPSession(page2);

    // Check if there are infinite requestAnimationFrame calls
    const heap = await cdp.send('Runtime.getHeapUsage');
    console.log('\nHeap:', JSON.stringify(heap));

    // Try to break execution
    console.log('Attempting to pause JS execution via debugger...');
    await cdp.send('Debugger.enable');
    await cdp.send('Debugger.pause');

    // Get current call stack
    await new Promise(resolve => {
      cdp.on('Debugger.paused', async (params) => {
        console.log('Paused! Call stack:');
        for (const frame of params.callFrames.slice(0, 10)) {
          console.log(`  ${frame.functionName || '(anonymous)'} at ${frame.url}:${frame.location.lineNumber}:${frame.location.columnNumber}`);
        }
        await cdp.send('Debugger.resume');
        resolve();
      });
      setTimeout(resolve, 3000);
    });
  } catch (e) {
    console.log('CDP error:', e.message);
  }

  await browser.close();
  console.log('\nDone!');
})();
