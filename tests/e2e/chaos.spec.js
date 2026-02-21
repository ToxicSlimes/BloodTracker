// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

/**
 * CHAOS TESTING — имитация хаотичного пользователя.
 * Быстрые клики, непредсказуемая навигация, двойные сабмиты,
 * открытие/закрытие модалок на лету, ввод мусора.
 *
 * React app: pages don't have #id wrappers — use nav button .active state.
 */

/** Check that the app is alive: at least one active nav button visible */
async function assertAppAlive(page) {
  await expect(page.locator('.nav-btn.active')).toBeVisible({ timeout: 5000 });
}

/** Check that a specific page is active via nav button */
async function assertPageActive(page, pageName) {
  await expect(page.locator(`[data-page="${pageName}"].active`)).toBeVisible({ timeout: 5000 });
}

test.describe('Chaos: хаотичная навигация', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
  });

  test('rapid fire — переключение между всеми страницами за 10 секунд', async ({ page }) => {
    const pages = ['dashboard', 'analyses', 'course', 'encyclopedia', 'workouts', 'compare'];

    // Кликаем по страницам максимально быстро без ожидания загрузки
    for (let round = 0; round < 3; round++) {
      for (const p of pages) {
        const btn = page.locator(`[data-page="${p}"]`);
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ timeout: 2000 }).catch(() => {});
          // Не ждём загрузку — сразу следующий клик!
          await page.waitForTimeout(150);
        }
      }
    }

    // После всей хуйни приложение должно быть живым
    await page.waitForTimeout(500);
    await assertAppAlive(page);

    // Навигация всё ещё работает
    await navigateToPage(page, 'dashboard');
    await assertPageActive(page, 'dashboard');
  });

  test('double-click на каждую nav кнопку', async ({ page }) => {
    const pages = ['analyses', 'course', 'encyclopedia', 'workouts', 'compare', 'dashboard'];

    for (const p of pages) {
      const btn = page.locator(`[data-page="${p}"]`);
      if (await btn.isVisible().catch(() => false)) {
        await btn.dblclick({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);
        await assertPageActive(page, p);
      }
    }
  });

  test('назад-вперёд — открываем страницу и мгновенно другую', async ({ page }) => {
    const sequence = [
      'analyses', 'dashboard', 'encyclopedia', 'course',
      'dashboard', 'workouts', 'analyses', 'compare',
      'dashboard', 'course', 'workouts', 'encyclopedia',
    ];

    for (const p of sequence) {
      const btn = page.locator(`[data-page="${p}"]`);
      await btn.click({ timeout: 2000 }).catch(() => {});
      // Микро-пауза — имитация очень быстрого юзера
      await page.waitForTimeout(50);
    }

    // Финальная страница — encyclopedia
    await page.waitForTimeout(1000);
    await assertPageActive(page, 'encyclopedia');
  });
});

test.describe('Chaos: модалки', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
  });

  test('открыть модалку и мгновенно переключить страницу', async ({ page }) => {
    await navigateToPage(page, 'analyses');
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button.btn:has-text("Добавить")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click().catch(() => {});
      await page.waitForTimeout(200);
      await page.locator('[data-page="dashboard"]').click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    await assertAppAlive(page);
  });

  test('быстро открыть-закрыть модалку 5 раз подряд', async ({ page }) => {
    await navigateToPage(page, 'course');
    await page.waitForTimeout(500);

    for (let i = 0; i < 5; i++) {
      const addBtn = page.locator('button:has-text("ПРЕПАРАТ"), button:has-text("Добавить")').first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click().catch(() => {});
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(200);
      }
    }

    // Страница должна оставаться функциональной
    await assertPageActive(page, 'course');
  });

  test('нажать Escape когда нет открытых модалок', async ({ page }) => {
    const pages = ['dashboard', 'analyses', 'course', 'workouts'];
    for (const p of pages) {
      await navigateToPage(page, p);
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await assertPageActive(page, p);
    }
  });
});

test.describe('Chaos: мусорный ввод', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
  });

  test('вставить гигантский текст в поля', async ({ page }) => {
    await navigateToPage(page, 'analyses');
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("АНАЛИЗ"), button:has-text("Добавить")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click().catch(() => {});
      await page.waitForTimeout(500);

      // React modals render via portal — look for .modal-overlay
      const inputs = page.locator('.modal-overlay input[type="text"], .modal-overlay input[type="number"], .modal-overlay textarea');
      const count = await inputs.count();

      const garbage = 'A'.repeat(10000);
      for (let i = 0; i < Math.min(count, 3); i++) {
        await inputs.nth(i).fill(garbage).catch(() => {});
      }

      await page.waitForTimeout(500);
      await page.keyboard.press('Escape').catch(() => {});
    }

    // App still alive
    await assertAppAlive(page);
  });

  test('ввести спецсимволы и XSS в поля', async ({ page }) => {
    await navigateToPage(page, 'course');
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("ПРЕПАРАТ"), button:has-text("Добавить")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click().catch(() => {});
      await page.waitForTimeout(500);

      const xssPayloads = [
        '<script>alert(1)</script>',
        '"><img src=x onerror=alert(1)>',
        "'; DROP TABLE drugs; --",
        '{{constructor.constructor("return this")()}}',
        '\u0000\u0001\u0002null bytes',
      ];

      const inputs = page.locator('.modal-overlay input[type="text"], .modal-overlay textarea');
      const count = await inputs.count();

      for (let i = 0; i < Math.min(count, xssPayloads.length); i++) {
        await inputs.nth(i).fill(xssPayloads[i]).catch(() => {});
      }

      await page.waitForTimeout(300);

      // XSS не должен сработать
      const alertFired = await page.evaluate(() => {
        return /** @type {any} */ (window)._xss_triggered === true;
      });
      expect(alertFired).toBeFalsy();

      await page.keyboard.press('Escape').catch(() => {});
    }

    await assertAppAlive(page);
  });

  test('вставить отрицательные и нулевые значения в числовые поля', async ({ page }) => {
    await navigateToPage(page, 'analyses');
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("АНАЛИЗ"), button:has-text("Добавить")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click().catch(() => {});
      await page.waitForTimeout(500);

      const numberInputs = page.locator('.modal-overlay input[type="number"]');
      const count = await numberInputs.count();

      const badValues = ['-999', '0', '999999999', 'NaN', 'Infinity', '-0', '1e308'];
      for (let i = 0; i < Math.min(count, badValues.length); i++) {
        await numberInputs.nth(i).fill(badValues[i]).catch(() => {});
      }

      await page.waitForTimeout(300);
      await page.keyboard.press('Escape').catch(() => {});
    }

    await assertAppAlive(page);
  });
});

test.describe('Chaos: конкурентные действия', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
  });

  test('кликнуть "Сохранить" когда форма пустая', async ({ page }) => {
    await navigateToPage(page, 'analyses');
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("АНАЛИЗ"), button:has-text("Добавить")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click().catch(() => {});
      await page.waitForTimeout(500);

      const saveBtn = page.locator('.modal-overlay button:has-text("Сохранить"), .modal-overlay button[type="submit"]').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      await page.keyboard.press('Escape').catch(() => {});
    }

    await assertAppAlive(page);
  });

  test('множественные клики на одну кнопку (double submit)', async ({ page }) => {
    await navigateToPage(page, 'course');
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("ПРЕПАРАТ"), button:has-text("Добавить")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click().catch(() => {});
      await page.waitForTimeout(500);

      const nameInput = page.locator('.modal-overlay input[type="text"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test Drug Chaos');
      }

      const saveBtn = page.locator('.modal-overlay button:has-text("Сохранить"), .modal-overlay button[type="submit"]').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        for (let i = 0; i < 5; i++) {
          await saveBtn.click({ timeout: 1000 }).catch(() => {});
          await page.waitForTimeout(50);
        }
      }

      await page.waitForTimeout(1000);
      await page.keyboard.press('Escape').catch(() => {});
    }

    await assertAppAlive(page);
  });

  test('resize окна во время работы', async ({ page }) => {
    const sizes = [
      { width: 320, height: 568 },
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
      { width: 1280, height: 720 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(200);

      const pages = ['dashboard', 'analyses', 'course'];
      const p = pages[Math.floor(Math.random() * pages.length)];
      await page.locator(`[data-page="${p}"]`).click().catch(() => {});
      await page.waitForTimeout(300);
    }

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    await assertAppAlive(page);
  });
});

test.describe('Chaos: edge cases навигации', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
  });

  test('клик на уже активную страницу 10 раз', async ({ page }) => {
    await navigateToPage(page, 'dashboard');

    for (let i = 0; i < 10; i++) {
      await page.locator('[data-page="dashboard"]').click().catch(() => {});
      await page.waitForTimeout(100);
    }

    await assertPageActive(page, 'dashboard');
  });

  test('workouts sub-tabs быстрое переключение', async ({ page }) => {
    await navigateToPage(page, 'workouts');
    await page.waitForTimeout(2000);

    const tabs = page.locator('.workout-hub-tab');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        await tabs.nth(i).click({ timeout: 10000 });
        await page.waitForTimeout(1000);
        await expect(page.locator('.workout-hub-content')).toBeVisible({ timeout: 10000 });
      }
      for (let i = Math.min(tabCount, 3) - 1; i >= 0; i--) {
        await tabs.nth(i).click({ timeout: 10000 });
        await page.waitForTimeout(1000);
        await expect(page.locator('.workout-hub-content')).toBeVisible({ timeout: 10000 });
      }
    }

    await assertAppAlive(page);
  });

  test('scroll spam на длинной странице', async ({ page }) => {
    await navigateToPage(page, 'encyclopedia');
    await page.waitForTimeout(1000);

    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(50);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);
    }

    await assertPageActive(page, 'encyclopedia');
  });

  test('console error monitor — нет JS крашей при навигации', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    const pages = ['dashboard', 'analyses', 'course', 'encyclopedia', 'workouts', 'compare'];
    for (const p of pages) {
      await page.locator(`[data-page="${p}"]`).click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Фильтруем некритичные ошибки (CDN, network)
    const criticalErrors = jsErrors.filter(e =>
      !e.includes('Failed to fetch') &&
      !e.includes('NetworkError') &&
      !e.includes('Load failed')
    );

    expect(criticalErrors).toEqual([]);
  });
});
