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

  // 3) Вставляем токен в localStorage ДО загрузки приложения
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
  await page.waitForSelector('.app:not(.auth-hidden)', { timeout: 15000 });
  await page.waitForSelector('.nav-btn', { state: 'visible', timeout: 15000 });
}

/**
 * Navigate to a page and wait for it to be visible.
 * Pages are div.page with id matching the data-page attribute.
 */
async function navigateToPage(page, pageName) {
  await page.locator(`[data-page="${pageName}"]`).click({ timeout: 10000 });
  await page.waitForSelector(`#${pageName}`, { state: 'visible', timeout: 10000 });
}

module.exports = { seedAuth, gotoApp, navigateToPage };
