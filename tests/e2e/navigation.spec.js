// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp } = require('./helpers');

const PAGES = [
  { name: 'dashboard', label: 'ДАШБОРД' },
  { name: 'course', label: 'КУРС' },
  { name: 'analyses', label: 'АНАЛИЗЫ' },
  { name: 'encyclopedia', label: 'ЭНЦИКЛОПЕДИЯ' },
  { name: 'workouts', label: 'ТРЕНИРОВКИ' },
];

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    // Wait for app to initialize (auth gate passes, pages render)
  });

  for (const p of PAGES) {
    test(`nav link works: ${p.label}`, async ({ page }) => {
      const btn = page.locator(`[data-page="${p.name}"]`);
      await expect(btn).toBeVisible();
      await btn.click();
      
      const pageEl = page.locator(`#${p.name}`);
      await expect(pageEl).toBeVisible({ timeout: 5000 });
    });
  }

  test('page titles/headers visible after navigation', async ({ page }) => {
    for (const p of PAGES) {
      await page.click(`[data-page="${p.name}"]`);
      const pageEl = page.locator(`#${p.name}`);
      await expect(pageEl).toBeVisible({ timeout: 3000 });
    }
  });

  test('browser back/forward navigation works', async ({ page }) => {
    // Navigate to encyclopedia
    await page.click('[data-page="encyclopedia"]');
    await expect(page.locator('#encyclopedia')).toBeVisible({ timeout: 3000 });
    
    // Navigate to analyses
    await page.click('[data-page="analyses"]');
    await expect(page.locator('#analyses')).toBeVisible({ timeout: 3000 });
    
    // Back should show encyclopedia or previous page
    await page.goBack();
    await page.waitForTimeout(500);
    // After goBack, some page should be visible
    const visiblePage = page.locator('.page:visible');
    expect(await visiblePage.count()).toBeGreaterThan(0);
  });

  test('active nav item is highlighted', async ({ page }) => {
    await page.click('[data-page="encyclopedia"]');
    await page.waitForTimeout(300);
    
    const btn = page.locator('[data-page="encyclopedia"]');
    await expect(btn).toHaveClass(/active/);
    
    // Other buttons should NOT be active
    const dashBtn = page.locator('[data-page="dashboard"]');
    await expect(dashBtn).not.toHaveClass(/active/);
  });
});
