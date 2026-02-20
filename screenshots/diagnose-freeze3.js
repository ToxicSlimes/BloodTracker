const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Capture console
  page.on('console', msg => console.log(`[PAGE] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[ERROR] ${err.message}`));

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

  await page.addInitScript(([token, user]) => {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));
  }, [auth.token, auth.user]);

  // Setup CDP profiler BEFORE navigation
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); // 100 microseconds

  // Start profiling
  await cdp.send('Profiler.start');
  console.log('Profiler started, navigating...');

  await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('Page loaded, profiling for 8 seconds...');

  // Wait 8 seconds to capture the freeze
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Stop profiler (this works even if JS thread is busy since it's V8-level)
  console.log('Stopping profiler...');
  const { profile } = await cdp.send('Profiler.stop');

  // Analyze profile
  const nodes = profile.nodes || [];
  console.log(`\nTotal profile nodes: ${nodes.length}`);
  console.log(`Time: ${profile.startTime} - ${profile.endTime} (${profile.endTime - profile.startTime} µs)`);

  // Find hot functions
  const hotNodes = nodes
    .filter(n => n.hitCount > 0)
    .sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0))
    .slice(0, 30);

  console.log('\n=== TOP 30 HOT FUNCTIONS ===');
  for (const node of hotNodes) {
    const fn = node.callFrame;
    const name = fn.functionName || '(anonymous)';
    const url = fn.url ? fn.url.replace('http://localhost:5000/', '') : '(native)';
    console.log(`  hits=${String(node.hitCount).padStart(6)} | ${name.padEnd(40)} | ${url}:${fn.lineNumber}:${fn.columnNumber}`);
  }

  // Build call tree to find the deepest hot path
  const nodeMap = new Map();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Find the deepest hot path
  console.log('\n=== HOT CALL CHAINS ===');
  function getCallChain(nodeId, depth = 0) {
    if (depth > 20) return [];
    const node = nodeMap.get(nodeId);
    if (!node) return [];
    const chain = [{
      name: node.callFrame.functionName || '(anon)',
      url: node.callFrame.url?.replace('http://localhost:5000/', '') || '',
      line: node.callFrame.lineNumber,
      hits: node.hitCount
    }];
    // Find children that have hits
    const hotChildren = (node.children || [])
      .map(id => nodeMap.get(id))
      .filter(n => n)
      .sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0));
    if (hotChildren.length > 0 && hotChildren[0].hitCount > 0) {
      chain.push(...getCallChain(hotChildren[0].id, depth + 1));
    }
    return chain;
  }

  // Start from root
  const root = nodes[0];
  if (root) {
    const chain = getCallChain(root.id);
    for (const frame of chain) {
      if (frame.hits > 0) {
        console.log(`  ${'  '.repeat(0)}[${frame.hits}] ${frame.name} @ ${frame.url}:${frame.line}`);
      }
    }
  }

  // Also check: find nodes in main.js with high hit counts
  console.log('\n=== FUNCTIONS IN main.js ===');
  const mainJsNodes = nodes
    .filter(n => n.hitCount > 0 && n.callFrame.url?.includes('main.js'))
    .sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0))
    .slice(0, 20);

  for (const node of mainJsNodes) {
    const fn = node.callFrame;
    console.log(`  hits=${String(node.hitCount).padStart(6)} | ${(fn.functionName || '(anon)').padEnd(40)} | line ${fn.lineNumber}:${fn.columnNumber}`);
  }

  await browser.close();
  console.log('\nDone!');
})();
