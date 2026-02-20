const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Capture ALL console messages
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    // Print errors and warnings immediately
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[${msg.type()}] ${text}`);
    }
  });
  page.on('pageerror', err => {
    logs.push(`[PAGE_ERROR] ${err.message}`);
    console.log(`[PAGE_ERROR] ${err.message}`);
  });

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

  // Inject auth AND instrument the reactive system
  await page.addInitScript(([token, user]) => {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));

    // Instrument queueMicrotask to count calls
    let mtTotal = 0;
    let mtPerSecond = 0;
    const origQMT = window.queueMicrotask.bind(window);
    window.queueMicrotask = function(fn) {
      mtTotal++;
      mtPerSecond++;
      if (mtTotal <= 5 || mtTotal % 1000 === 0) {
        // Get stack trace to see WHO is scheduling
        const stack = new Error().stack;
        console.warn(`[QMT #${mtTotal}] caller: ${stack?.split('\n')[2]?.trim() || 'unknown'}`);
      }
      return origQMT(fn);
    };

    // Log microtask rate every second
    setInterval(() => {
      if (mtPerSecond > 0) {
        console.warn(`[QMT RATE] ${mtPerSecond}/sec (total: ${mtTotal})`);
        mtPerSecond = 0;
      }
    }, 1000);

    // Instrument Proxy to see what state keys are being set
    let proxySetCount = 0;
    const origProxy = window.Proxy;
    window.Proxy = function(target, handler) {
      const origSet = handler.set;
      if (origSet) {
        handler.set = function(t, prop, value, receiver) {
          proxySetCount++;
          if (proxySetCount <= 20 || proxySetCount % 5000 === 0) {
            console.warn(`[PROXY SET #${proxySetCount}] prop="${String(prop)}" on target with keys: ${Object.keys(t).slice(0, 5).join(',')}`);
          }
          return origSet.call(this, t, prop, value, receiver);
        };
      }
      return new origProxy(target, handler);
    };
  }, [auth.token, auth.user]);

  await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('Page loaded, waiting 10 seconds...');

  // Wait 10 seconds to capture the loop behavior
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Try to check if page is responsive
  console.log('\nChecking page responsiveness...');
  try {
    const result = await Promise.race([
      page.evaluate(() => ({
        activePage: document.querySelector('.page.active')?.id || 'none',
        appClasses: document.querySelector('.app')?.className || 'none',
      })),
      new Promise((_, reject) => setTimeout(() => reject(new Error('FROZEN')), 5000))
    ]);
    console.log('PAGE RESPONSIVE:', JSON.stringify(result));
  } catch (e) {
    console.log('PAGE FROZEN:', e.message);
  }

  // Print summary of all logs
  console.log(`\n=== LOG SUMMARY (${logs.length} total) ===`);
  // Count by type
  const errorLogs = logs.filter(l => l.startsWith('[error]') || l.startsWith('[PAGE_ERROR]'));
  const warnLogs = logs.filter(l => l.startsWith('[warning]'));
  console.log(`Errors: ${errorLogs.length}, Warnings: ${warnLogs.length}`);

  // Show unique errors
  const uniqueErrors = [...new Set(errorLogs.map(l => l.substring(0, 200)))];
  console.log('\n=== UNIQUE ERRORS ===');
  for (const err of uniqueErrors.slice(0, 30)) {
    console.log(err);
  }

  // Show QMT rate logs
  const qmtRateLogs = logs.filter(l => l.includes('[QMT RATE]'));
  console.log('\n=== MICROTASK RATES ===');
  for (const l of qmtRateLogs) {
    console.log(l);
  }

  // Show first 10 QMT caller traces
  const qmtCallerLogs = logs.filter(l => l.includes('[QMT #'));
  console.log('\n=== FIRST QMT CALLERS ===');
  for (const l of qmtCallerLogs.slice(0, 10)) {
    console.log(l);
  }

  // Show proxy set logs
  const proxyLogs = logs.filter(l => l.includes('[PROXY SET'));
  console.log('\n=== PROXY SET SAMPLES ===');
  for (const l of proxyLogs.slice(0, 20)) {
    console.log(l);
  }

  await browser.close();
  console.log('\nDone!');
})();
