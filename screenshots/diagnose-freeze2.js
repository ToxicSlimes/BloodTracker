const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Capture console messages
  page.on('console', msg => console.log(`[PAGE ${msg.type()}] ${msg.text()}`));
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

  // Inject auth + tracking for rAF/setInterval/setTimeout
  await page.addInitScript(([token, user]) => {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));

    // Track all scheduled work
    window.__rafIds = [];
    window.__intervalIds = [];
    window.__timeoutIds = [];
    window.__rafCount = 0;

    const origRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function(cb) {
      window.__rafCount++;
      const id = origRAF(cb);
      window.__rafIds.push(id);
      return id;
    };

    const origSI = window.setInterval.bind(window);
    window.setInterval = function(cb, ms, ...args) {
      const id = origSI(cb, ms, ...args);
      window.__intervalIds.push({ id, ms });
      return id;
    };

    const origST = window.setTimeout.bind(window);
    window.setTimeout = function(cb, ms, ...args) {
      const id = origST(cb, ms, ...args);
      window.__timeoutIds.push({ id, ms });
      return id;
    };
  }, [auth.token, auth.user]);

  await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('Page loaded, waiting for init...');
  await page.waitForTimeout(3000);

  // Use CDP to evaluate (bypasses frozen event loop)
  const cdp = await ctx.newCDPSession(page);

  // First: check the animation/timer counts
  console.log('\n=== Step 1: Check what is running ===');
  try {
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({
        rafCount: window.__rafCount,
        activeRAFs: window.__rafIds?.length,
        intervals: window.__intervalIds,
        timeouts: window.__timeoutIds?.length,
        lastRAFIds: window.__rafIds?.slice(-5)
      })`,
      returnByValue: false
    });
    console.log('Timers:', result.value);
  } catch (e) {
    console.log('CDP evaluate error:', e.message);
  }

  // Step 2: Try to pause debugger and get call stack
  console.log('\n=== Step 2: Pause and inspect call stack ===');
  try {
    await cdp.send('Debugger.enable');

    const pausePromise = new Promise((resolve) => {
      cdp.on('Debugger.paused', (params) => {
        console.log('PAUSED! Reason:', params.reason);
        console.log('Call frames:');
        for (const frame of params.callFrames.slice(0, 15)) {
          console.log(`  ${frame.functionName || '(anonymous)'} @ ${frame.url}:${frame.location.lineNumber}:${frame.location.columnNumber}`);
        }
        resolve(params);
      });
    });

    await cdp.send('Debugger.pause');
    const pauseResult = await Promise.race([
      pausePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('pause timeout')), 5000))
    ]);

    await cdp.send('Debugger.resume');
  } catch (e) {
    console.log('Debugger error:', e.message);
  }

  // Step 3: Kill all animations and intervals, then test
  console.log('\n=== Step 3: Kill all rAF/intervals ===');
  try {
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: `
        // Cancel all rAFs
        let cancelledRAF = 0;
        for (let i = 0; i < 100000; i++) {
          cancelAnimationFrame(i);
          cancelledRAF++;
        }
        // Cancel all intervals
        let cancelledInterval = 0;
        for (const entry of (window.__intervalIds || [])) {
          clearInterval(entry.id);
          cancelledInterval++;
        }
        // Cancel all timeouts
        let cancelledTimeout = 0;
        for (const entry of (window.__timeoutIds || [])) {
          clearTimeout(entry.id);
          cancelledTimeout++;
        }
        JSON.stringify({ cancelledRAF, cancelledInterval, cancelledTimeout })
      `,
      returnByValue: false
    });
    console.log('Cancelled:', result.value);
  } catch (e) {
    console.log('Cancel error:', e.message);
  }

  await page.waitForTimeout(1000);

  // Step 4: Now test if evaluate works
  console.log('\n=== Step 4: Test evaluate after killing animations ===');
  try {
    const state = await Promise.race([
      page.evaluate(() => ({
        appClasses: document.querySelector('.app')?.className,
        activePage: document.querySelector('.page.active')?.id || 'none',
        navBtns: [...document.querySelectorAll('.nav-btn')].map(b => b.textContent?.trim()),
      })),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 5s')), 5000))
    ]);
    console.log('EVALUATE WORKS! State:', JSON.stringify(state, null, 2));
  } catch (e) {
    console.log('STILL FROZEN after killing animations:', e.message);

    // Step 5: Nuclear option - try to find what's running
    console.log('\n=== Step 5: Deep inspection ===');
    try {
      // Use Profiler to see what's running
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.start');
      await page.waitForTimeout(2000);
      const { profile } = await cdp.send('Profiler.stop');

      // Find the hottest functions
      const nodes = profile.nodes || [];
      const hotNodes = nodes
        .filter(n => n.hitCount > 0)
        .sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0))
        .slice(0, 20);

      console.log('\nTop 20 hot functions (CPU profiler):');
      for (const node of hotNodes) {
        const fn = node.callFrame;
        console.log(`  hits=${node.hitCount} ${fn.functionName || '(anonymous)'} @ ${fn.url}:${fn.lineNumber}:${fn.columnNumber}`);
      }
    } catch (e2) {
      console.log('Profiler error:', e2.message);
    }
  }

  await browser.close();
  console.log('\nDone!');
})();
