// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

const PAGES = ['dashboard', 'analyses', 'course', 'encyclopedia', 'workouts'];

test.describe('Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.state) window.state.activeWorkoutSession = null;
    });
    await page.waitForTimeout(300);
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
      const btn = cards.nth(i).locator('button.encyclopedia-research-btn');
      if (await btn.count() > 0) {
        await btn.click();
        break;
      }
    }

    // React: modal rendered via ModalProvider portal as .modal-overlay.active > .research-modal
    const modal = page.locator('.modal-overlay.active');
    if (await modal.isVisible()) {
      await page.screenshot({
        path: 'tests/e2e/screenshots/research-modal.png',
        fullPage: false,
      });
    }
  });
});
