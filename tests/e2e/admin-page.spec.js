const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage } = require('./helpers');

test.describe('Admin Page', () => {
  let token;

  test.beforeEach(async ({ page }) => {
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    await page.waitForTimeout(1500);
    token = await page.evaluate(() => localStorage.getItem('bt_token'));
  });

  test('should show admin navigation for admin user', async ({ page }) => {
    const adminBtn = page.locator('[data-page="admin"]');
    await expect(adminBtn).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to admin page and show user list', async ({ page }) => {
    await navigateToPage(page, 'admin');
    await page.waitForTimeout(1000);
    
    const usersTab = page.locator('button:has-text("ПОЛЬЗОВАТЕЛИ")');
    if (await usersTab.count() > 0) {
      await usersTab.click();
      await page.waitForTimeout(500);
    }
    
    await page.waitForSelector('table, .admin-search-input', { state: 'visible', timeout: 5000 });
    const hasTable = await page.locator('table').count();
    const hasSearch = await page.locator('.admin-search-input').count();
    expect(hasTable > 0 || hasSearch > 0).toBeTruthy();
  });

  test('should show stats overview', async ({ page }) => {
    await navigateToPage(page, 'admin');
    await page.waitForTimeout(1000);
    
    const statsTab = page.locator('button:has-text("СТАТИСТИКА")');
    if (await statsTab.count() > 0) {
      await statsTab.click();
      await page.waitForTimeout(1000);
    }
    
    const hasStats = await page.locator('.stat-card').count();
    expect(hasStats).toBeGreaterThan(0);
  });

  test('should not show admin button for non-admin', async ({ page }) => {
    const newPage = await page.context().newPage();
    await seedAuth(newPage, 'e2e@test.com');
    await gotoApp(newPage);
    await newPage.waitForTimeout(1500);
    
    const adminBtn = newPage.locator('[data-page="admin"]');
    const count = await adminBtn.count();
    expect(count).toBe(0);
    
    await newPage.close();
  });

  test('should fetch admin stats via API', async ({ page }) => {
    const statsRes = await page.request.get('/api/v1/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();
    expect(stats.totalUsers).toBeDefined();
    expect(stats.totalAnalyses).toBeDefined();
    expect(stats.totalWorkouts).toBeDefined();
  });
});
