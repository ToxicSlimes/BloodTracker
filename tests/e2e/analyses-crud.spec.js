const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout, dismissOverlays } = require('./helpers');

test.describe('Analyses CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
  });

  test('should create analysis via API and receive 201', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const data = {
      date: '2026-01-15',
      label: 'API Test Analysis',
      laboratory: 'KDL',
      values: {
        testosterone: 25.5,
        estradiol: 45.0,
      },
    };
    const response = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data,
    });
    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.id).toBeTruthy();
    expect(json.label).toBe('API Test Analysis');
    await page.request.delete(`/api/v1/analyses/${json.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should get analysis by ID with results', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const createRes = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-01-16',
        label: 'Get Test',
        values: { testosterone: 22.0 },
      },
    });
    const created = await createRes.json();
    const getRes = await page.request.get(`/api/v1/analyses/${created.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(getRes.status()).toBe(200);
    const analysis = await getRes.json();
    expect(analysis.id).toBe(created.id);
    expect(analysis.values.testosterone).toBe(22.0);
    await page.request.delete(`/api/v1/analyses/${created.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should update analysis and apply changes', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const createRes = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-01-17',
        label: 'Update Test',
        values: { testosterone: 20.0 },
      },
    });
    const created = await createRes.json();
    const updateRes = await page.request.put(`/api/v1/analyses/${created.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        id: created.id,
        date: created.date,
        label: 'Updated Label',
        values: { testosterone: 30.0 },
      },
    });
    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.label).toBe('Updated Label');
    expect(updated.values.testosterone).toBe(30.0);
    await page.request.delete(`/api/v1/analyses/${created.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should delete analysis and return 204 or 200', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const createRes = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-01-18',
        label: 'Delete Test',
        values: { testosterone: 15.0 },
      },
    });
    const created = await createRes.json();
    const deleteRes = await page.request.delete(`/api/v1/analyses/${created.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect([200, 204]).toContain(deleteRes.status());
  });

  test('should list analyses as array', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const response = await page.request.get('/api/v1/analyses', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
    const list = await response.json();
    expect(Array.isArray(list)).toBe(true);
  });

  test('should navigate to analyses page and render', async ({ page }) => {
    await navigateToPage(page, 'analyses');
    await expect(page.locator('[data-asciify="md"]:has-text("МОИ АНАЛИЗЫ")')).toBeVisible();
    await expect(page.locator('button:has-text("Добавить вручную")')).toBeVisible();
  });

  test('should click add button and open modal', async ({ page }) => {
    await navigateToPage(page, 'analyses');
    await dismissOverlays(page);
    await page.locator('button:has-text("Добавить вручную")').click();
    await expect(page.locator('.modal h2:has-text("ДОБАВИТЬ АНАЛИЗ")')).toBeVisible();
    await dismissOverlays(page);
    await page.locator('.modal-close').click();
  });

  test('should fill modal and submit, then card appears', async ({ page }) => {
    await navigateToPage(page, 'analyses');
    await page.locator('button:has-text("Добавить вручную")').click();
    await page.locator('.modal input[type="date"]').first().fill('2026-02-01');
    await page.locator('.modal label:has-text("Метка") + input').fill('E2E Test Analysis');
    await page.locator('.modal label:has-text("Лаборатория") + input').fill('KDL');
    await page.locator('.modal button.tab:has-text("Гормоны")').click();
    await page.locator('.tab-content.active label:has-text("Тестостерон общий") + input').fill('28.5');
    await page.locator('.modal button:has-text("СОХРАНИТЬ")').click();
    await page.waitForTimeout(1500);
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const list = await page.request.get('/api/v1/analyses', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const analyses = await list.json();
    const created = analyses.find(a => a.label === 'E2E Test Analysis');
    expect(created).toBeTruthy();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'analyses');
    await page.locator('.analysis-selector select').selectOption(created.id);
    await expect(page.locator('table tr[data-param-key="testosterone"]')).toBeVisible();
    if (created) {
      await page.request.delete(`/api/v1/analyses/${created.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }
  });

  test('should click card and expand details', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const createRes = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-02-02',
        label: 'Expand Test',
        values: { testosterone: 26.0, estradiol: 50.0 },
      },
    });
    const created = await createRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'analyses');
    await page.locator('.analysis-selector select').selectOption(created.id);
    await expect(page.locator('table tr[data-param-key="testosterone"]')).toBeVisible();
    await expect(page.locator('table tr[data-param-key="estradiol"]')).toBeVisible();
    await page.request.delete(`/api/v1/analyses/${created.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should delete via UI and card disappears', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const createRes = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-02-03',
        label: 'Delete UI Test',
        values: { testosterone: 24.0 },
      },
    });
    const created = await createRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'analyses');
    await page.locator('.analysis-selector select').selectOption(created.id);
    await expect(page.locator('table')).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("УДАЛИТЬ")').click();
    await page.waitForTimeout(1000);
    const selectOptions = await page.locator('.analysis-selector select option').allTextContents();
    expect(selectOptions.some(opt => opt.includes('Delete UI Test'))).toBe(false);
  });

  test('should show empty state when no analysis selected', async ({ page }) => {
    await navigateToPage(page, 'analyses');
    await page.locator('.analysis-selector select').selectOption('');
    await expect(page.locator('.empty-state h3:has-text("Выберите или добавьте анализ")')).toBeVisible();
  });

  test('should compare two analyses via API', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const res1 = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-02-04',
        label: 'Before',
        values: { testosterone: 20.0 },
      },
    });
    const a1 = await res1.json();
    const res2 = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-02-05',
        label: 'After',
        values: { testosterone: 30.0 },
      },
    });
    const a2 = await res2.json();
    const compareRes = await page.request.get(`/api/v1/analyses/compare?beforeId=${a1.id}&afterId=${a2.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(compareRes.status()).toBe(200);
    const comparison = await compareRes.json();
    expect(comparison).toBeTruthy();
    expect(Object.keys(comparison).length).toBeGreaterThan(0);
    await page.request.delete(`/api/v1/analyses/${a1.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await page.request.delete(`/api/v1/analyses/${a2.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should navigate to compare page via UI', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const res1 = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-02-06',
        label: 'UI Before',
        values: { testosterone: 21.0 },
      },
    });
    const a1 = await res1.json();
    const res2 = await page.request.post('/api/v1/analyses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: '2026-02-07',
        label: 'UI After',
        values: { testosterone: 31.0 },
      },
    });
    const a2 = await res2.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'compare');
    await expect(page.locator('[data-asciify="md"]:has-text("СРАВНЕНИЕ")')).toBeVisible();
    await page.request.delete(`/api/v1/analyses/${a1.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await page.request.delete(`/api/v1/analyses/${a2.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });
});
