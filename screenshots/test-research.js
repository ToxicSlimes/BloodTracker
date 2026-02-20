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
  await page.waitForSelector('.app:not(.auth-hidden)', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Navigate to encyclopedia
  console.log('Navigating to encyclopedia...');
  await page.click('[data-page="encyclopedia"]');
  await page.waitForTimeout(3000);

  // Check if cards exist
  const cardCount = await page.locator('.encyclopedia-card').count();
  console.log(`Encyclopedia cards: ${cardCount}`);

  // Check if research buttons exist
  const researchBtns = await page.locator('.encyclopedia-research-btn').count();
  console.log(`Research buttons: ${researchBtns}`);

  if (researchBtns > 0) {
    // Expand the first card with a research button
    const firstResearchCard = page.locator('.encyclopedia-card:has(.encyclopedia-research-btn)').first();
    await firstResearchCard.click();
    await page.waitForTimeout(500);

    // Click the research button
    const researchBtn = firstResearchCard.locator('.encyclopedia-research-btn').first();
    const btnText = await researchBtn.textContent();
    console.log(`Clicking research button: "${btnText?.trim()}"`);
    await researchBtn.click();
    await page.waitForTimeout(1000);

    // Check if modal opened
    const modalVisible = await page.locator('#research-modal-overlay.active').count();
    console.log(`Research modal visible: ${modalVisible > 0 ? 'YES' : 'NO'}`);

    if (modalVisible > 0) {
      const modalTitle = await page.locator('#research-modal-title').textContent();
      console.log(`Modal title: "${modalTitle?.trim()}"`);

      const contentText = await page.locator('#research-content').textContent();
      console.log(`Content length: ${contentText?.length || 0} chars`);
      console.log(`Content preview: "${contentText?.substring(0, 200)}"`);

      await page.screenshot({ path: 'screenshots/research-modal.png', timeout: 5000 });
      console.log('Screenshot: screenshots/research-modal.png');
    }
  } else {
    console.log('No research buttons found - substances may not have research data');
  }

  await browser.close();
  console.log('Done!');
})();
