// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage } = require('./helpers');

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
  });

  test('dashboard renders without errors', async ({ page }) => {
    const dashboard = page.locator('#dashboard');
    await expect(dashboard).toBeVisible({ timeout: 3000 });
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
    
    // Find and open research modal
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
      const modalBox = await modal.locator('.research-modal').boundingBox();
      const viewport = page.viewportSize();
      if (modalBox && viewport) {
        expect(modalBox.width).toBeLessThanOrEqual(viewport.width);
        expect(modalBox.height).toBeLessThanOrEqual(viewport.height);
      }
    }
  });
});
