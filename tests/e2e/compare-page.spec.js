const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage } = require('./helpers');

test.describe('Compare Page', () => {
  let token;
  let beforeAnalysisId;
  let afterAnalysisId;

  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    token = await page.evaluate(() => localStorage.getItem('bt_token'));
  });

  test.afterEach(async ({ page }) => {
    if (beforeAnalysisId && token) {
      await page.request.delete(`/api/v1/analyses/${beforeAnalysisId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    if (afterAnalysisId && token) {
      await page.request.delete(`/api/v1/analyses/${afterAnalysisId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
  });

  test('should create first analysis', async ({ page }) => {
    const res = await page.request.post('/api/v1/analyses', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        date: new Date().toISOString(),
        label: 'E2E Before Analysis',
        parameters: { hemoglobin: 150, glucose: 5.0 },
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    beforeAnalysisId = body.id;
    expect(body.label).toBe('E2E Before Analysis');
  });

  test('should create second analysis', async ({ page }) => {
    const res = await page.request.post('/api/v1/analyses', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        date: new Date().toISOString(),
        label: 'E2E After Analysis',
        parameters: { hemoglobin: 160, glucose: 4.8 },
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    afterAnalysisId = body.id;
    expect(body.label).toBe('E2E After Analysis');
  });

  test('should compare two analyses via API', async ({ page }) => {
    const beforeRes = await page.request.post('/api/v1/analyses', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        date: new Date().toISOString(),
        label: 'E2E Before Analysis',
        parameters: { hemoglobin: 150, glucose: 5.0 },
      },
    });
    const before = await beforeRes.json();
    beforeAnalysisId = before.id;

    const afterRes = await page.request.post('/api/v1/analyses', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        date: new Date().toISOString(),
        label: 'E2E After Analysis',
        parameters: { hemoglobin: 160, glucose: 4.8 },
      },
    });
    const after = await afterRes.json();
    afterAnalysisId = after.id;

    const compareRes = await page.request.get(`/api/v1/analyses/compare?beforeId=${before.id}&afterId=${after.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(compareRes.ok()).toBeTruthy();
    const comparison = await compareRes.json();
    expect(comparison.comparisons).toBeDefined();
    expect(Array.isArray(comparison.comparisons)).toBeTruthy();
  });

  test('should navigate to compare page and load UI', async ({ page }) => {
    await navigateToPage(page, 'compare');
    await page.waitForSelector('.card-title:has-text("СРАВНЕНИЕ АНАЛИЗОВ")', { state: 'visible', timeout: 5000 });
    
    const selects = await page.locator('select').count();
    expect(selects).toBeGreaterThanOrEqual(2);
  });

  test('should cleanup created analyses', async ({ page }) => {
    const beforeRes = await page.request.post('/api/v1/analyses', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        date: new Date().toISOString(),
        label: 'E2E Cleanup Test Before',
        parameters: { hemoglobin: 150 },
      },
    });
    const before = await beforeRes.json();
    beforeAnalysisId = before.id;

    const afterRes = await page.request.post('/api/v1/analyses', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        date: new Date().toISOString(),
        label: 'E2E Cleanup Test After',
        parameters: { hemoglobin: 160 },
      },
    });
    const after = await afterRes.json();
    afterAnalysisId = after.id;

    const deleteBeforeRes = await page.request.delete(`/api/v1/analyses/${before.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(deleteBeforeRes.status()).toBe(204);

    const deleteAfterRes = await page.request.delete(`/api/v1/analyses/${after.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(deleteAfterRes.status()).toBe(204);

    beforeAnalysisId = null;
    afterAnalysisId = null;
  });
});
