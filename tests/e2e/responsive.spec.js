// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

test.describe('Responsive Layout', () => {
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

  test('dashboard renders without errors', async ({ page }) => {
    // React: dashboard is the default page, verify its content renders
    const quickActions = page.locator('.quick-actions');
    await expect(quickActions).toBeVisible({ timeout: 5000 });
    // Also verify we're on dashboard
    await expect(page.locator('[data-page="dashboard"]')).toHaveClass(/active/);
  });

  test('encyclopedia grid renders cards', async ({ page }) => {
    await navigateToPage(page, 'encyclopedia');
    const grid = page.locator('#encyclopedia-grid');
    await expect(grid).toBeVisible({ timeout: 5000 });

    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('navigation is accessible', async ({ page }) => {
    const nav = page.locator('nav, .sidebar, .nav-btn').first();
    await expect(nav).toBeVisible();
  });

  test('no horizontal overflow on page', async ({ page }) => {
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('encyclopedia page has no overflow', async ({ page }) => {
    await navigateToPage(page, 'encyclopedia');
    await page.waitForTimeout(500);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('research modal fits viewport', async ({ page }) => {
    await navigateToPage(page, 'encyclopedia');

    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Find and open research modal via card's research button
    for (let i = 0; i < Math.min(10, await cards.count()); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(200);
      const btn = cards.nth(i).locator('button.encyclopedia-research-btn');
      if (await btn.count() > 0) {
        await btn.click();
        break;
      }
    }

    // React: modal is rendered via ModalProvider portal as .modal-overlay.active > .research-modal
    const modalOverlay = page.locator('.modal-overlay.active');
    if (await modalOverlay.isVisible()) {
      const modalBox = await modalOverlay.locator('.research-modal').boundingBox();
      const viewport = page.viewportSize();
      if (modalBox && viewport) {
        expect(modalBox.width).toBeLessThanOrEqual(viewport.width);
        expect(modalBox.height).toBeLessThanOrEqual(viewport.height);
      }
    }
  });
});
