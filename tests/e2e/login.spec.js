// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth } = require('./helpers');

/**
 * Эти тесты гоняются БЕЗ globalSetup и storageState.
 * Чистый браузер → полный флоу логина, как у живого пользователя.
 *
 * React LoginPage renders:
 *   <div className="login-overlay">
 *     <div className="login-container">
 *       EmailStep → input[type="email"], button.login-btn-primary "ОТПРАВИТЬ КОД"
 *       CodeStep  → input[maxlength="6"], button.login-btn-primary "ПОДТВЕРДИТЬ"
 *     </div>
 *   </div>
 *
 * After login: App re-renders → <AppShell> with <Navigation> (.nav-btn) + <PageRouter>
 */

test.describe('Auth / Login flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('email + magic code login shows main app', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:5000';

    // 1. Открываем корень — должны увидеть логин-оверлей (React LoginPage)
    await page.goto(url + '/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.login-overlay')).toBeVisible({ timeout: 15000 });

    // 2. Вводим email и отправляем код
    await page.fill('input[type="email"]', 'test@e2e.com');
    await page.click('.login-btn-primary');

    // 3. Появился шаг ввода кода, сервер вернул devCode и LoginPage его подставил
    const codeInput = page.locator('input[autocomplete="one-time-code"]');
    await expect(codeInput).toBeVisible({ timeout: 15000 });
    await expect(codeInput).toHaveAttribute('maxlength', '6');

    await expect.poll(async () => (await codeInput.inputValue()).length, {
      message: 'Ожидаем автоподстановку devCode в code input',
      timeout: 15000,
      intervals: [500, 1000, 2000]
    }).toBe(6);

    // 4. Жмём "[ ПОДТВЕРДИТЬ ]" и ждём reload + React re-render
    //    After handleAuthResponse → window.location.reload()
    //    App component re-evaluates useAuth() → isAuthenticated=true → <AppShell>
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
      page.click('.login-btn-primary:has-text("ПОДТВЕРДИТЬ")')
    ]);

    // 5. Wait for auth to be fully applied after reload — nav buttons visible
    await page.waitForSelector('.nav-btn', { state: 'visible', timeout: 20000 });

    // Навигация доступна
    const navButtons = page.locator('.nav-btn');
    await expect(navButtons.first()).toBeVisible({ timeout: 10000 });

    // Login overlay should be gone
    await expect(page.locator('.login-overlay')).not.toBeVisible({ timeout: 5000 });
  });

  test('logout возвращает на login overlay', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:5000';

    // Login via API helper (synchronous localStorage injection)
    await seedAuth(page, 'test-logout@e2e.com');
    await page.goto(url + '/', { waitUntil: 'domcontentloaded' });

    // Wait for nav buttons (AppShell rendered = authenticated)
    await page.waitForSelector('.nav-btn', { state: 'visible', timeout: 15000 });

    // Нажимаем [ ВЫХОД ] — remove overlays that intercept clicks, scroll, click
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, #ascii-progress-bar').forEach(el => el.remove());
    });
    await page.locator('.logout-btn').scrollIntoViewIfNeeded();
    await page.locator('.logout-btn').click({ timeout: 10000 });

    // Возвращаемся к login overlay (React re-renders LoginPage)
    await expect(page.locator('.login-overlay')).toBeVisible({ timeout: 15000 });
    // Nav buttons should be gone (AppShell unmounted)
    await expect(page.locator('.nav-btn').first()).not.toBeVisible({ timeout: 5000 });
  });
});
