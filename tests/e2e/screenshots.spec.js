// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const PAGES = [
  { name: 'dashboard', path: '/' },
  { name: 'analyses', path: '/analyses' },
  { name: 'courses', path: '/courses' },
  { name: 'encyclopedia', path: '/encyclopedia' },
  { name: 'workouts', path: '/workouts' },
];

test.describe('Screenshots — Desktop (1280x720)', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  for (const pg of PAGES) {
    test(`screenshot ${pg.name} desktop`, async ({ page }) => {
      await page.goto(pg.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // let animations settle
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${pg.name}-desktop.png`),
        fullPage: true,
      });
    });
  }
});

test.describe('Screenshots — Mobile (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const pg of PAGES) {
    test(`screenshot ${pg.name} mobile`, async ({ page }) => {
      await page.goto(pg.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${pg.name}-mobile.png`),
        fullPage: true,
      });
    });
  }
});

test.describe('Screenshots — Encyclopedia States', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('screenshot encyclopedia with expanded card', async ({ page }) => {
    await page.goto('/encyclopedia');
    await page.waitForLoadState('networkidle');

    const card = page.locator('.substance-card, .card, .encyclopedia-card, [data-substance]').first();
    if (await card.count() > 0) {
      await card.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'encyclopedia-expanded-card.png'),
      fullPage: true,
    });
  });

  test('screenshot research modal open', async ({ page }) => {
    await page.goto('/encyclopedia');
    await page.waitForLoadState('networkidle');

    const researchBtn = page.locator('button:has-text("Research"), button:has-text("Исследования"), [class*="research-btn"]').first();
    if (await researchBtn.count() > 0) {
      await researchBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'encyclopedia-research-modal.png'),
      fullPage: false,
    });
  });
});
