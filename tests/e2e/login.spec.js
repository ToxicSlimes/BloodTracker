// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Эти тесты гоняются БЕЗ globalSetup и storageState.
 * Чистый браузер → полный флоу логина, как у живого пользователя.
 */

test.describe('Auth / Login flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('email + magic code login shows main app', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:5050';

    // 1. Открываем корень — должны увидеть логин-оверлей
    await page.goto(url + '/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#login-overlay')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.app')).toHaveClass(/auth-hidden/);

    // 2. Вводим email и отправляем код
    await page.fill('#login-email', 'test@e2e.com');
    await page.click('#send-code-btn');

    // 3. Появился шаг ввода кода, сервер вернул devCode и login.ts его подставил
    const codeStep = page.locator('#login-step-code');
    await expect(codeStep).toBeVisible({ timeout: 15000 });

    const codeInput = page.locator('#login-code');
    await expect(codeInput).toHaveAttribute('maxlength', '6');

    await expect.poll(async () => (await codeInput.inputValue()).length, {
      message: 'Ожидаем автоподстановку devCode в #login-code',
      timeout: 15000,
      intervals: [500, 1000, 2000]
    }).toBe(6);

    // 4. Жмём "[ ПОДТВЕРДИТЬ ]" и ждём reload + снятие auth-hidden
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.click('#verify-code-btn')
    ]);

    // 5. Проверяем состояние после логина
    const app = page.locator('.app');
    await expect(app).toBeVisible({ timeout: 15000 });
    await expect(app).not.toHaveClass(/auth-hidden/);

    // Навигация доступна
    const navButtons = page.locator('.nav-btn');
    await expect(navButtons.first()).toBeVisible({ timeout: 10000 });

    // Есть хоть одна страница
    const activePage = page.locator('.page.active');
    await expect(activePage.first()).toBeVisible({ timeout: 10000 });
  });

  test('logout возвращает на login overlay', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:5050';

    // Сначала залогинимся через API и положим токен в localStorage до загрузки
    await page.addInitScript(async () => {
      const email = 'test-logout@e2e.com';
      const res = await fetch('/api/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      const devCode = data.devCode;
      const res2 = await fetch('/api/v1/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: devCode })
      });
      const auth = await res2.json();
      localStorage.setItem('bt_token', auth.token);
      localStorage.setItem('bt_user', JSON.stringify(auth.user));
    });

    await page.goto(url + '/', { waitUntil: 'domcontentloaded' });
    const app = page.locator('.app');
    await expect(app).toBeVisible({ timeout: 15000 });
    await expect(app).not.toHaveClass(/auth-hidden/);

    // Нажимаем [ ВЫХОД ]
    await page.click('.logout-btn');

    // Возвращаемся к login overlay
    await expect(page.locator('#login-overlay')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.app')).toHaveClass(/auth-hidden/);
  });
});
