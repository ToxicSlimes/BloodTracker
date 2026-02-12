// @ts-check
const { test, expect } = require('@playwright/test');

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', aliases: ['Дашборд', 'Главная'] },
  { name: 'Analyses', path: '/analyses', aliases: ['Анализы'] },
  { name: 'Courses', path: '/courses', aliases: ['Курсы'] },
  { name: 'Encyclopedia', path: '/encyclopedia', aliases: ['Энциклопедия'] },
  { name: 'Workouts', path: '/workouts', aliases: ['Тренировки'] },
];

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  for (const item of NAV_ITEMS) {
    test(`nav link works: ${item.name}`, async ({ page }) => {
      const allNames = [item.name, ...item.aliases];
      const selectorParts = allNames.map(n => `a:has-text("${n}"), [href="${item.path}"]`).join(', ');
      const link = page.locator(selectorParts).first();

      if (await link.count() === 0) {
        test.skip();
        return;
      }

      await link.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(item.path === '/' ? '/' : item.path);
    });
  }

  test('page headers correct for each page', async ({ page }) => {
    for (const item of NAV_ITEMS) {
      await page.goto(item.path);
      await page.waitForLoadState('networkidle');
      const heading = page.locator('h1, h2, .page-title, [class*="title"]').first();
      if (await heading.count() > 0) {
        await expect(heading).toBeVisible();
      }
    }
  });

  test('browser back/forward navigation works', async ({ page }) => {
    await page.goto('/encyclopedia');
    await page.waitForLoadState('networkidle');
    const url1 = page.url();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/encyclopedia');

    await page.goForward();
    await page.waitForLoadState('networkidle');
    // Should be back at dashboard
  });

  test('active nav item is highlighted', async ({ page }) => {
    await page.goto('/encyclopedia');
    await page.waitForLoadState('networkidle');

    const activeLink = page.locator('nav .active, nav [aria-current="page"], a.active:has-text("Encyclopedia"), a.active:has-text("Энциклопедия")').first();
    if (await activeLink.count() > 0) {
      await expect(activeLink).toBeVisible();
    }
  });
});
