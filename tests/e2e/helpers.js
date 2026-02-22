// @ts-check

/**
 * Issue a real auth code via API, verify it, and inject bt_token/bt_user
 * into localStorage BEFORE any app scripts run.
 *
 * Это E2E на уровне API, но без UI-логина — быстро и стабильно.
 */
async function seedAuth(page, email = 'e2e@test.com') {
  // 1) Получаем devCode через публичный AuthController
  const sendRes = await page.request.post('/api/v1/auth/send-code', {
    data: { email },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!sendRes.ok()) {
    throw new Error(`send-code failed: ${sendRes.status()} ${await sendRes.text()}`);
  }
  const sendJson = await sendRes.json();
  const devCode = sendJson.devCode;
  if (!devCode || String(devCode).length !== 6) {
    throw new Error(`devCode missing or invalid: ${JSON.stringify(sendJson)}`);
  }

  // 2) Подтверждаем код — получаем реальный JWT и user
  const verifyRes = await page.request.post('/api/v1/auth/verify-code', {
    data: { email, code: devCode },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!verifyRes.ok()) {
    throw new Error(`verify-code failed: ${verifyRes.status()} ${await verifyRes.text()}`);
  }
  const auth = await verifyRes.json();
  if (!auth.token || !auth.user) {
    throw new Error(`verify-code response missing token/user: ${JSON.stringify(auth)}`);
  }

  // 3) Вставляем токен в localStorage ДО загрузки приложения (re-injects on every navigation/reload)
  await page.addInitScript(([token, user]) => {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));
  }, [auth.token, auth.user]);
}

/**
 * Go to app root and wait until the main navigation is visible.
 * Используется после seedAuth(page).
 */
async function gotoApp(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.nav-btn', { state: 'visible', timeout: 15000 });
}

/**
 * Navigate to a page and wait for it to be visible.
 * Uses click-and-verify with fallback to direct DOM navigation
 * to handle the JS event handler race condition.
 */
async function navigateToPage(page, pageName) {
  const btnSelector = `[data-page="${pageName}"]`;
  const activeSelector = `[data-page="${pageName}"].active`;

  // Dismiss floating overlays that intercept pointer events
  await page.evaluate(() => {
    document.querySelectorAll('.workout-resume-banner, .workout-resume-overlay, .color-picker-container').forEach(el => el.remove());
  });

  // Attempt 1: normal click
  await page.locator(btnSelector).click({ timeout: 10000 });
  const ok = await page.waitForSelector(activeSelector, { timeout: 3000 }).catch(() => null);
  if (ok) return;

  // Attempt 2: force click (bypasses potential overlay interception)
  await page.locator(btnSelector).click({ force: true, timeout: 5000 });
  const ok2 = await page.waitForSelector(activeSelector, { timeout: 3000 }).catch(() => null);
  if (ok2) return;

  // Attempt 3: set state.currentPage directly via evaluate
  await page.evaluate((id) => {
    if (window.__btState) window.__btState.currentPage = id;
  }, pageName);
  await page.waitForSelector(activeSelector, { timeout: 10000 });
}

/**
 * Abandon any active workout session via API so it doesn't block navigation.
 * Call AFTER seedAuth (token must exist) and AFTER gotoApp (page loaded).
 */
async function cleanupActiveWorkout(page) {
  const token = await page.evaluate(() => localStorage.getItem('bt_token'));
  if (!token) return;

  const activeRes = await page.request.get('/api/v1/workout-sessions/active', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!activeRes.ok()) return;

  const body = await activeRes.text();
  if (!body || body === 'null' || body === '') return;

  let session;
  try { session = JSON.parse(body); } catch { return; }
  if (!session || !session.id) return;

  await page.request.post(`/api/v1/workout-sessions/${session.id}/abandon`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  // Dismiss any resume overlay/banner that may still be visible
  await page.evaluate(() => {
    document.querySelectorAll('.workout-resume-banner, .workout-resume-overlay, .color-picker-container').forEach(el => el.remove());
  });
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.workout-resume-banner, .workout-resume-overlay, .color-picker-container').forEach(el => el.remove());
  });
}

module.exports = { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout, dismissOverlays };
