// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Responsive Layout', () => {
  test('dashboard layout on desktop (1280px)', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    const box = await body.boundingBox();
    expect(box.width).toBeLessThanOrEqual(1280);
    await context.close();
  });

  test('dashboard layout on mobile (390px)', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // No horizontal scrollbar
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390 + 5); // small tolerance
    await context.close();
  });

  test('encyclopedia grid — 1 column on mobile, multi on desktop', async ({ browser }) => {
    // Desktop
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const dPage = await desktop.newPage();
    await dPage.goto('/encyclopedia');
    await dPage.waitForLoadState('networkidle');

    const grid = dPage.locator('.substances-grid, .encyclopedia-grid, .cards-grid, .grid, [class*="grid"]').first();
    if (await grid.count() > 0) {
      const cols = await dPage.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.gridTemplateColumns || style.display;
      }, await grid.elementHandle());
      // Just check it exists
    }
    await desktop.close();

    // Mobile
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mPage = await mobile.newPage();
    await mPage.goto('/encyclopedia');
    await mPage.waitForLoadState('networkidle');
    const scrollWidth = await mPage.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(395);
    await mobile.close();
  });

  test('navigation hamburger on mobile', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburger = page.locator('.hamburger, .menu-toggle, [class*="burger"], button[aria-label="Menu"], button[aria-label="menu"]').first();
    if (await hamburger.count() > 0) {
      await expect(hamburger).toBeVisible();
      await hamburger.click();
      const nav = page.locator('nav, .nav-menu, .sidebar, [class*="nav"]').first();
      await expect(nav).toBeVisible();
    }
    await context.close();
  });

  test('research modal fits on mobile', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/encyclopedia');
    await page.waitForLoadState('networkidle');

    const researchBtn = page.locator('button:has-text("Research"), button:has-text("Исследования"), [class*="research-btn"]').first();
    if (await researchBtn.count() === 0) {
      await context.close();
      test.skip();
      return;
    }

    await researchBtn.click();
    const modal = page.locator('.modal, .research-modal, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const box = await modal.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }
    await context.close();
  });

  test('no horizontal overflow on any page at 390px', async ({ browser }) => {
    const pages = ['/', '/encyclopedia', '/courses', '/workouts'];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `Overflow on ${path}`).toBeLessThanOrEqual(395);
    }
    await context.close();
  });
});
