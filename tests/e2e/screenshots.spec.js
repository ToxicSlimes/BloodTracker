// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage } = require('./helpers');

const PAGES = ['dashboard', 'analyses', 'course', 'encyclopedia', 'workouts'];

test.describe('Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
  });

  for (const pageName of PAGES) {
    test(`screenshot ${pageName}`, async ({ page }) => {
      await navigateToPage(page, pageName);
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `tests/e2e/screenshots/${pageName}.png`,
        fullPage: false,
      });
    });
  }

  test('screenshot encyclopedia with expanded card', async ({ page }) => {
    await navigateToPage(page, 'encyclopedia');
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await cards.first().click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/e2e/screenshots/encyclopedia-expanded.png',
      fullPage: false,
    });
  });

  test('screenshot research modal', async ({ page }) => {
    await navigateToPage(page, 'encyclopedia');
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    
    for (let i = 0; i < Math.min(10, await cards.count()); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(200);
      const btn = cards.nth(i).locator('button', { hasText: /ИССЛЕДОВАНИЯ/i });
      if (await btn.count() > 0) {
        await btn.click();
        break;
      }
    }
    
    const modal = page.locator('#research-modal-overlay');
    if (await modal.isVisible()) {
      await page.screenshot({
        path: 'tests/e2e/screenshots/research-modal.png',
        fullPage: false,
      });
    }
  });
});
