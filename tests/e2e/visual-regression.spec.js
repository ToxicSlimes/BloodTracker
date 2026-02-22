// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL REGRESSION — Pixel-perfect screenshot comparison
// First run creates baseline snapshots. Subsequent runs compare against them.
// Update baselines: npx playwright test visual-regression --update-snapshots
// ═══════════════════════════════════════════════════════════════════════════════

/** Default comparison options — 3% pixel tolerance for font rendering differences */
const SCREENSHOT_OPTS = {
  maxDiffPixelRatio: 0.03,
  animations: 'disabled',
};

/** Relaxed options for pages with dynamic API data (timestamps, counters, session history) */
const DYNAMIC_SCREENSHOT_OPTS = {
  maxDiffPixelRatio: 0.12,
  animations: 'disabled',
};

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    // Wait for JS to finish initializing (event listeners, API calls)
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
    // Remove floating overlays that break screenshots and clear client state
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.state) window.state.activeWorkoutSession = null;
    });
    await page.waitForTimeout(300);
  });

  // ─── Main Pages ─────────────────────────────────────────────────────────────

  const PAGES = [
    'dashboard',
    'course',
    'analyses',
    'compare',
    'workouts',
    'encyclopedia',
    'ascii-studio',
  ];

  for (const pageName of PAGES) {
    test(`page: ${pageName}`, async ({ page }) => {
      await navigateToPage(page, pageName);
      await page.waitForTimeout(800); // let data load + animations settle
      await expect(page).toHaveScreenshot(`${pageName}.png`, SCREENSHOT_OPTS);
    });
  }

  // ─── Workout Sub-Tabs ───────────────────────────────────────────────────────

  const WORKOUT_TABS = ['training', 'history', 'programs', 'analytics'];

  for (const tab of WORKOUT_TABS) {
    test(`workout tab: ${tab}`, async ({ page }) => {
      await navigateToPage(page, 'workouts');
      // React WorkoutsPage uses .workout-hub-tab buttons with text labels
      const tabLabels = { training: 'ТРЕНИРОВКА', history: 'ИСТОРИЯ', programs: 'ПРОГРАММЫ', analytics: 'АНАЛИТИКА' };
      await page.click(`.workout-hub-tab:has-text("${tabLabels[tab]}")`);
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(`workout-${tab}.png`, DYNAMIC_SCREENSHOT_OPTS);
    });
  }

  // ─── Encyclopedia States ────────────────────────────────────────────────────

  test('encyclopedia: expanded card', async ({ page }) => {
    await navigateToPage(page, 'encyclopedia');
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await cards.first().click();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('encyclopedia-expanded.png', SCREENSHOT_OPTS);
  });

  // ─── Dashboard States ──────────────────────────────────────────────────────

  test('dashboard: initial state', async ({ page }) => {
    await page.waitForTimeout(1000); // let stats load
    await expect(page).toHaveScreenshot('dashboard-loaded.png', SCREENSHOT_OPTS);
  });

  // ─── Toast Notification ────────────────────────────────────────────────────

  test('toast: all variants', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      window.toast.success('Success message');
      // @ts-ignore
      window.toast.error('Error message');
      // @ts-ignore
      window.toast.warning('Warning message');
      // @ts-ignore
      window.toast.info('Info message');
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('toast-variants.png', SCREENSHOT_OPTS);
  });

  // ─── Responsive Checks ────────────────────────────────────────────────────

  test('responsive: dashboard mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-mobile.png', SCREENSHOT_OPTS);
  });

  test('responsive: dashboard tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-tablet.png', SCREENSHOT_OPTS);
  });

  test('responsive: workouts mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await navigateToPage(page, 'workouts');
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot('workouts-mobile.png', DYNAMIC_SCREENSHOT_OPTS);
  });
});
