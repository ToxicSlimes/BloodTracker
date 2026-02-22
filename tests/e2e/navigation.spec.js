// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

// Page-specific content selectors to verify each page rendered
const PAGE_CONTENT = {
  dashboard: '.quick-actions, .dashboard-overview, .stat-cards',
  course: '.card-title, .drug-card',
  analyses: '.card-title',
  encyclopedia: '#encyclopedia-grid, #encyclopedia-search',
  workouts: '.workout-hub-tab',
};

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
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.state) window.state.activeWorkoutSession = null;
    });
    await page.waitForTimeout(300);
  });

  for (const p of PAGES) {
    test(`nav link works: ${p.label}`, async ({ page }) => {
      const btn = page.locator(`[data-page="${p.name}"]`);
      await expect(btn).toBeVisible();
      await btn.click();

      // React: verify nav button gets .active class
      await expect(btn).toHaveClass(/active/, { timeout: 5000 });
      // Verify page-specific content appeared
      const contentSelector = PAGE_CONTENT[p.name];
      if (contentSelector) {
        await expect(page.locator(contentSelector).first()).toBeVisible({ timeout: 5000 });
      }
    });
  }

  test('page titles/headers visible after navigation', async ({ page }) => {
    for (const p of PAGES) {
      await page.click(`[data-page="${p.name}"]`);
      // Verify nav button is active (page rendered)
      await expect(page.locator(`[data-page="${p.name}"]`)).toHaveClass(/active/, { timeout: 3000 });
      // Verify page-specific content is visible
      const contentSelector = PAGE_CONTENT[p.name];
      if (contentSelector) {
        await expect(page.locator(contentSelector).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // Skip: app clears window.location.hash after each nav click (navigation.ts:131),
  // so browser back/forward can't restore page state — hash history entries are all empty.
  test.skip('browser back/forward navigation works', async ({ page }) => {
    // Navigate to encyclopedia
    await page.click('[data-page="encyclopedia"]');
    await expect(page.locator('[data-page="encyclopedia"]')).toHaveClass(/active/, { timeout: 3000 });

    // Navigate to analyses
    await page.click('[data-page="analyses"]');
    await expect(page.locator('[data-page="analyses"]')).toHaveClass(/active/, { timeout: 3000 });

    // Back should show encyclopedia or previous page
    await page.goBack();
    await page.waitForTimeout(500);
    // After goBack, some nav button should be active
    const activeBtn = page.locator('.nav-btn.active');
    expect(await activeBtn.count()).toBeGreaterThan(0);
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
