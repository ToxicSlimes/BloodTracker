const { chromium } = require('playwright');

async function testWithOverrides(overrideCode, label) {
  const browser = await chromium.launch({ headless: true });
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

  await page.addInitScript(([token, user, code]) => {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));
    // Apply overrides
    eval(code);
  }, [auth.token, auth.user, overrideCode]);

  let errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(4000);

  try {
    const result = await Promise.race([
      page.evaluate(() => document.querySelector('.page.active')?.id || 'loaded'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('FROZEN')), 3000))
    ]);
    console.log(`[${label}] ✅ OK — active page: ${result}`);
    await browser.close();
    return true;
  } catch (e) {
    console.log(`[${label}] ❌ FROZEN`);
    if (errors.length > 0) console.log(`  Errors: ${errors.join('; ')}`);
    await browser.close();
    return false;
  }
}

(async () => {
  console.log('=== BISECT: Finding the freeze cause ===\n');

  // Test 1: Kill ALL requestAnimationFrame
  await testWithOverrides(`
    window.requestAnimationFrame = function() { return 0; };
  `, 'No rAF');

  // Test 2: Kill rAF + setInterval
  await testWithOverrides(`
    window.requestAnimationFrame = function() { return 0; };
    window.setInterval = function() { return 0; };
  `, 'No rAF + No setInterval');

  // Test 3: Kill rAF + setInterval + MutationObserver
  await testWithOverrides(`
    window.requestAnimationFrame = function() { return 0; };
    window.setInterval = function() { return 0; };
    window.MutationObserver = class { observe() {} disconnect() {} };
  `, 'No rAF + No setInterval + No MutationObserver');

  // Test 4: Kill EVERYTHING async
  await testWithOverrides(`
    window.requestAnimationFrame = function() { return 0; };
    window.setInterval = function() { return 0; };
    window.MutationObserver = class { observe() {} disconnect() {} };
    window.queueMicrotask = function() {};
  `, 'No rAF + No setInterval + No MutationObserver + No queueMicrotask');

  // Test 5: Only kill queueMicrotask (microtask loop theory)
  await testWithOverrides(`
    let mtCount = 0;
    const origQMT = window.queueMicrotask.bind(window);
    window.queueMicrotask = function(fn) {
      mtCount++;
      if (mtCount > 10000) {
        console.error('MICROTASK FLOOD! Count:', mtCount);
        return; // Stop flooding
      }
      origQMT(fn);
    };
  `, 'Microtask flood guard');

  // Test 6: Only kill rAF (animation loop theory)
  await testWithOverrides(`
    let rafCount = 0;
    const origRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function(fn) {
      rafCount++;
      if (rafCount > 1000) {
        console.error('rAF FLOOD! Count:', rafCount);
        return 0;
      }
      return origRAF(fn);
    };
  `, 'rAF flood guard');

  // Test 7: Only kill MutationObserver
  await testWithOverrides(`
    window.MutationObserver = class { observe() {} disconnect() {} };
  `, 'No MutationObserver');

  // Test 8: Only kill setInterval
  await testWithOverrides(`
    window.setInterval = function() { return 0; };
  `, 'No setInterval');

  // Test 9: Kill Service Worker
  await testWithOverrides(`
    navigator.serviceWorker = undefined;
  `, 'No Service Worker');

  // Test 10: Disable Proxy (reactive system)
  await testWithOverrides(`
    // Don't disable entirely, just log
    let proxySetCount = 0;
    const origProxy = window.Proxy;
    window.Proxy = function(target, handler) {
      const origSet = handler.set;
      if (origSet) {
        handler.set = function(t, prop, value, receiver) {
          proxySetCount++;
          if (proxySetCount > 50000) {
            console.error('PROXY SET FLOOD at:', proxySetCount, 'prop:', String(prop));
            return true;
          }
          return origSet.call(this, t, prop, value, receiver);
        };
      }
      return new origProxy(target, handler);
    };
  `, 'Proxy set flood guard');

  console.log('\nDone!');
})();
