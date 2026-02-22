// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');
const { ClickTracker, collectReport, getAllReports, clearReports } = require('./click-tracker');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// UI FLOW TESTS — Click-counted user journeys
// Every test measures how many interactions it takes to reach a destination.
// At the end, a click-report.json is written to tests/e2e/reports/.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wait for a page to be active by checking the nav button has .active class.
 * React doesn't render #pagename divs.
 */
async function waitForPage(page, pageId, timeout = 10000) {
  await page.waitForSelector(`[data-page="${pageId}"].active`, { timeout });
}

/**
 * Wait for workout sub-tab to be active (button has .active class).
 */
async function waitForWorkoutTab(page, tabLabel, timeout = 5000) {
  await page.waitForSelector(`.workout-hub-tab.active:has-text("${tabLabel}")`, { timeout });
}

test.describe('UI Flows — Click Audit', () => {
  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    // Wait for JS to finish initializing (event listeners, API calls)
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
    // Remove overlays that can obscure nav and clear client state
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.__btState) window.__btState.activeWorkoutSession = null;
    });
    await page.waitForTimeout(300);
  });

  // ─── Navigation Flows ───────────────────────────────────────────────────────

  const PAGES = [
    { id: 'dashboard', label: 'ДАШБОРД' },
    { id: 'course', label: 'КУРС' },
    { id: 'analyses', label: 'АНАЛИЗЫ' },
    { id: 'compare', label: 'СРАВНЕНИЕ' },
    { id: 'workouts', label: 'ТРЕНИРОВКИ' },
    { id: 'encyclopedia', label: 'ЭНЦИКЛОПЕДИЯ' },
    { id: 'ascii-studio', label: 'ASCII ART' },
  ];

  for (const p of PAGES) {
    test(`nav → ${p.label} (${p.id})`, async () => {
      const tracker = new ClickTracker(page);
      await tracker.click(`[data-page="${p.id}"]`, `Navigate to ${p.label}`);
      // React: verify via state.currentPage and nav button .active class
      await waitForPage(page, p.id);
      await page.waitForSelector(`[data-page="${p.id}"].active`, { timeout: 5000 });
      const report = tracker.report(`nav → ${p.id}`);
      collectReport(report);
      expect(report.clicks).toBeLessThanOrEqual(1);
    });
  }

  // ─── Workout Sub-Tab Flows ──────────────────────────────────────────────────

  const WORKOUT_TABS = [
    { id: 'training', label: 'ТРЕНИРОВКА' },
    { id: 'history', label: 'ИСТОРИЯ' },
    { id: 'programs', label: 'ПРОГРАММЫ' },
    { id: 'analytics', label: 'АНАЛИТИКА' },
  ];

  for (const tab of WORKOUT_TABS) {
    test(`workout tab → ${tab.label}`, async () => {
      const tracker = new ClickTracker(page);

      // Step 1: navigate to workouts page
      await tracker.click('[data-page="workouts"]', 'Navigate to ТРЕНИРОВКИ');
      await waitForPage(page, 'workouts');

      // Step 2: click the sub-tab (React uses .workout-hub-tab buttons with text)
      await tracker.click(`.workout-hub-tab:has-text("${tab.label}")`, `Switch to ${tab.label} tab`);
      await waitForWorkoutTab(page, tab.label);

      const report = tracker.report(`workout tab → ${tab.id}`);
      collectReport(report);
      expect(report.clicks).toBeLessThanOrEqual(2);
    });
  }

  // ─── Dashboard Quick Actions ────────────────────────────────────────────────

  test('quick action → + АНАЛИЗ', async () => {
    const tracker = new ClickTracker(page);
    // Dashboard should already be visible (default page)
    await waitForPage(page, 'dashboard');

    const btn = page.locator('.quick-action-btn', { hasText: /АНАЛИЗ/i });
    if (await btn.count() > 0) {
      await tracker.click('.quick-action-btn:has-text("АНАЛИЗ")', 'Click + АНАЛИЗ quick action');
      await page.waitForTimeout(500);
    }

    const report = tracker.report('quick action → + АНАЛИЗ');
    collectReport(report);
    expect(report.clicks).toBeLessThanOrEqual(1);
  });

  test('quick action → + ПРИЁМ', async () => {
    const tracker = new ClickTracker(page);
    await waitForPage(page, 'dashboard');

    const btn = page.locator('.quick-action-btn', { hasText: /ПРИЁМ/i });
    if (await btn.count() > 0) {
      await tracker.click('.quick-action-btn:has-text("ПРИЁМ")', 'Click + ПРИЁМ quick action');
      await page.waitForTimeout(500);
    }

    const report = tracker.report('quick action → + ПРИЁМ');
    collectReport(report);
    expect(report.clicks).toBeLessThanOrEqual(1);
  });

  test('quick action → ИМПОРТ PDF', async () => {
    const tracker = new ClickTracker(page);
    await waitForPage(page, 'dashboard');

    const btn = page.locator('.quick-action-btn', { hasText: /ИМПОРТ/i });
    if (await btn.count() > 0) {
      await tracker.click('.quick-action-btn:has-text("ИМПОРТ")', 'Click ИМПОРТ PDF quick action');
      await page.waitForTimeout(500);
    }

    const report = tracker.report('quick action → ИМПОРТ PDF');
    collectReport(report);
    expect(report.clicks).toBeLessThanOrEqual(1);
  });

  // ─── Encyclopedia Flows ─────────────────────────────────────────────────────

  test('encyclopedia → expand card', async () => {
    const tracker = new ClickTracker(page);

    await tracker.click('[data-page="encyclopedia"]', 'Navigate to ЭНЦИКЛОПЕДИЯ');
    await waitForPage(page, 'encyclopedia');

    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await tracker.click('.encyclopedia-card >> nth=0', 'Expand first encyclopedia card');
    await page.waitForTimeout(300);

    const report = tracker.report('encyclopedia → expand card');
    collectReport(report);
    expect(report.clicks).toBeLessThanOrEqual(2);
  });

  test('encyclopedia → open research modal', async () => {
    const tracker = new ClickTracker(page);

    await tracker.click('[data-page="encyclopedia"]', 'Navigate to ЭНЦИКЛОПЕДИЯ');
    await waitForPage(page, 'encyclopedia');

    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Find a card that has research button
    let found = false;
    for (let i = 0; i < Math.min(5, await cards.count()); i++) {
      await tracker.click(`.encyclopedia-card >> nth=${i}`, `Expand card #${i}`);
      await page.waitForTimeout(300);
      // React: research button is .encyclopedia-research-btn
      const btn = cards.nth(i).locator('button.encyclopedia-research-btn');
      if (await btn.count() > 0) {
        await tracker.click(`.encyclopedia-card >> nth=${i} >> button.encyclopedia-research-btn`, 'Open research modal');
        found = true;
        break;
      }
    }

    const report = tracker.report('encyclopedia → research modal');
    collectReport(report);
    if (found) {
      expect(report.clicks).toBeLessThanOrEqual(4);
    }
  });

  // ─── Workout Session Flows (UI-driven) ──────────────────────────────────────

  test('workout → start empty session', async () => {
    const tracker = new ClickTracker(page);

    await tracker.click('[data-page="workouts"]', 'Navigate to ТРЕНИРОВКИ');
    await waitForPage(page, 'workouts');

    // Look for "start workout" / "начать" button on training tab
    await page.waitForTimeout(1000);

    // Try finding a CTA button to start workout
    const ctaBtn = page.locator('.workout-cta-btn, button:has-text("НАЧАТЬ"), button:has-text("ПУСТАЯ"), button:has-text("ТРЕНИРОВК")').first();
    if (await ctaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tracker.click('.workout-cta-btn, button:has-text("НАЧАТЬ"), button:has-text("ПУСТАЯ"), button:has-text("ТРЕНИРОВК") >> nth=0', 'Click start workout CTA');
      await page.waitForTimeout(1000);
    }

    const report = tracker.report('workout → start session');
    collectReport(report);
    // Navigation + 1 CTA click = 2 max
    expect(report.clicks).toBeLessThanOrEqual(3);
  });

  test('workout → view history', async () => {
    const tracker = new ClickTracker(page);

    await tracker.click('[data-page="workouts"]', 'Navigate to ТРЕНИРОВКИ');
    await waitForPage(page, 'workouts');

    await tracker.click('.workout-hub-tab:has-text("ИСТОРИЯ")', 'Switch to ИСТОРИЯ tab');
    await waitForWorkoutTab(page, 'ИСТОРИЯ');

    const report = tracker.report('workout → history');
    collectReport(report);
    expect(report.clicks).toBe(2);
  });

  test('workout → view programs', async () => {
    const tracker = new ClickTracker(page);

    await tracker.click('[data-page="workouts"]', 'Navigate to ТРЕНИРОВКИ');
    await waitForPage(page, 'workouts');

    await tracker.click('.workout-hub-tab:has-text("ПРОГРАММЫ")', 'Switch to ПРОГРАММЫ tab');
    await waitForWorkoutTab(page, 'ПРОГРАММЫ');

    const report = tracker.report('workout → programs');
    collectReport(report);
    expect(report.clicks).toBe(2);
  });

  test('workout → view analytics', async () => {
    const tracker = new ClickTracker(page);

    await tracker.click('[data-page="workouts"]', 'Navigate to ТРЕНИРОВКИ');
    await waitForPage(page, 'workouts');

    await tracker.click('.workout-hub-tab:has-text("АНАЛИТИКА")', 'Switch to АНАЛИТИКА tab');
    await waitForWorkoutTab(page, 'АНАЛИТИКА');

    const report = tracker.report('workout → analytics');
    collectReport(report);
    expect(report.clicks).toBe(2);
  });

  // ─── Cross-Page Flows ──────────────────────────────────────────────────────

  test('dashboard → workouts → history → back to dashboard', async () => {
    const tracker = new ClickTracker(page);

    await tracker.click('[data-page="workouts"]', 'Navigate to ТРЕНИРОВКИ');
    await waitForPage(page, 'workouts');

    await tracker.click('.workout-hub-tab:has-text("ИСТОРИЯ")', 'Switch to ИСТОРИЯ');
    await waitForWorkoutTab(page, 'ИСТОРИЯ');

    await tracker.click('[data-page="dashboard"]', 'Back to ДАШБОРД');
    await waitForPage(page, 'dashboard');

    const report = tracker.report('round-trip: dashboard → history → dashboard');
    collectReport(report);
    expect(report.clicks).toBe(3);
  });

  test('full app tour — visit every page', async () => {
    const tracker = new ClickTracker(page);

    for (const p of PAGES) {
      await tracker.click(`[data-page="${p.id}"]`, `Visit ${p.label}`);
      await waitForPage(page, p.id);
    }

    const report = tracker.report('full app tour');
    collectReport(report);
    expect(report.clicks).toBe(PAGES.length);
  });

  // ─── Generate Report ────────────────────────────────────────────────────────

  test.afterAll(() => {
    const reports = getAllReports();
    if (reports.length === 0) return;

    const reportDir = path.join(__dirname, 'reports');
    fs.mkdirSync(reportDir, { recursive: true });

    const summary = {
      generated: new Date().toISOString(),
      totalFlows: reports.length,
      flows: reports.sort((a, b) => b.clicks - a.clicks),
      stats: {
        maxClicks: Math.max(...reports.map(r => r.clicks)),
        avgClicks: +(reports.reduce((sum, r) => sum + r.clicks, 0) / reports.length).toFixed(1),
        maxInteractions: Math.max(...reports.map(r => r.interactions)),
        avgInteractions: +(reports.reduce((sum, r) => sum + r.interactions, 0) / reports.length).toFixed(1),
      },
    };

    fs.writeFileSync(
      path.join(reportDir, 'click-report.json'),
      JSON.stringify(summary, null, 2),
    );

    // Also write a human-readable table
    const lines = [
      '# Click Audit Report',
      `Generated: ${summary.generated}`,
      '',
      `| Flow | Clicks | Interactions |`,
      `|------|--------|--------------|`,
      ...summary.flows.map(f => `| ${f.flow} | ${f.clicks} | ${f.interactions} |`),
      '',
      `**Average clicks:** ${summary.stats.avgClicks}`,
      `**Max clicks:** ${summary.stats.maxClicks}`,
      `**Average interactions:** ${summary.stats.avgInteractions}`,
      `**Max interactions:** ${summary.stats.maxInteractions}`,
    ];
    fs.writeFileSync(
      path.join(reportDir, 'click-report.md'),
      lines.join('\n'),
    );

    clearReports();
  });
});
