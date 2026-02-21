const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout, dismissOverlays } = require('./helpers');

test.describe('Course + Drugs CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
  });

  test('should create course via API', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const data = {
      title: 'API Test Course',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      notes: 'Test notes',
    };
    const response = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data,
    });
    expect([200, 201]).toContain(response.status());
    const json = await response.json();
    expect(json.id).toBeTruthy();
    expect(json.title).toBe('API Test Course');
    await page.request.delete(`/api/v1/courses/${json.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should navigate to course page and course visible', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const createRes = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Visible Test Course',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      },
    });
    const created = await createRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'course');
    await expect(page.locator('input[value="Visible Test Course"]')).toBeVisible();
    await page.request.delete(`/api/v1/courses/${created.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should click add drug button and open DrugModal', async ({ page }) => {
    await navigateToPage(page, 'course');
    await page.locator('.course-tab:has-text("ПРЕПАРАТЫ")').click();
    await page.locator('button:has-text("ДОБАВИТЬ ПРЕПАРАТ")').click();
    await expect(page.locator('.modal h2:has-text("ДОБАВИТЬ ПРЕПАРАТ")')).toBeVisible();
    await page.locator('.modal-close').click();
  });

  test('should fill DrugModal and submit, drug card appears', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const courseRes = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Drug Test Course',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      },
    });
    const course = await courseRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'course');
    await page.locator('button:has-text("ДОБАВИТЬ ПРЕПАРАТ")').click();
    await page.locator('.modal input[placeholder="Название препарата"]').fill('E2E Test Drug');
    await page.locator('.modal select').first().selectOption('1');
    await page.locator('.modal input[placeholder*="250mg"]').fill('250 mg/ml');
    await page.locator('.modal button:has-text("СОХРАНИТЬ")').click();
    await page.waitForTimeout(1500);
    await expect(page.locator('.drug-card:has-text("E2E Test Drug")')).toBeVisible();
    const drugsRes = await page.request.get('/api/v1/drugs', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const drugs = await drugsRes.json();
    const created = drugs.find(d => d.name === 'E2E Test Drug');
    if (created) {
      await page.request.delete(`/api/v1/drugs/${created.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }
    await page.request.delete(`/api/v1/courses/${course.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should show drug type badge correctly', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const courseRes = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Badge Test Course',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      },
    });
    const course = await courseRes.json();
    const drugRes = await page.request.post('/api/v1/drugs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Injectable Test',
        type: 1,
        dosage: '250 mg/ml',
        amount: '10 ml',
        schedule: 'E3D',
        courseId: course.id,
      },
    });
    const drug = await drugRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'course');
    await expect(page.locator('.drug-card:has-text("Injectable Test") .badge-inject')).toBeVisible();
    await page.request.delete(`/api/v1/drugs/${drug.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await page.request.delete(`/api/v1/courses/${course.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should delete drug via UI', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const courseRes = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Delete Drug Course',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      },
    });
    const course = await courseRes.json();
    const drugRes = await page.request.post('/api/v1/drugs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Delete Drug Test',
        type: 0,
        dosage: '50 mg',
        amount: '100 tabs',
        schedule: 'ED',
        courseId: course.id,
      },
    });
    const drug = await drugRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'course');
    await expect(page.locator('.drug-card:has-text("Delete Drug Test")').first()).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.drug-card:has-text("Delete Drug Test") button:has-text("X")').first().click();
    await page.waitForTimeout(1000);
    const remaining = await page.locator('.drug-card:has-text("Delete Drug Test")').count();
    expect(remaining).toBeLessThanOrEqual(0);
    await page.request.delete(`/api/v1/courses/${course.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should switch to logs tab and see content', async ({ page }) => {
    await navigateToPage(page, 'course');
    await page.locator('.course-tab:has-text("ЛОГИ ПРИЁМА")').click();
    await expect(page.locator('[data-asciify="md"]:has-text("ЛОГ ПРИЁМА")')).toBeVisible();
  });

  test('should create intake log via API and visible in logs tab', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const courseRes = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Log Test Course',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      },
    });
    const course = await courseRes.json();
    const drugRes = await page.request.post('/api/v1/drugs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Log Test Drug',
        type: 1,
        dosage: '250 mg',
        amount: '10 ml',
        schedule: 'E3D',
        courseId: course.id,
      },
    });
    const drug = await drugRes.json();
    const logRes = await page.request.post('/api/v1/intakelogs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        drugId: drug.id,
        date: '2026-01-15T10:00:00Z',
        dose: '250 mg',
      },
    });
    const log = await logRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'course');
    await page.locator('.course-tab:has-text("ЛОГИ ПРИЁМА")').click();
    await expect(page.locator('#filtered-intake-log .log-entry:has-text("Log Test Drug")')).toBeVisible();
    await page.request.delete(`/api/v1/intakelogs/${log.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await page.request.delete(`/api/v1/drugs/${drug.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await page.request.delete(`/api/v1/courses/${course.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should delete intake log via UI', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const courseRes = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Delete Log Course',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      },
    });
    const course = await courseRes.json();
    const drugRes = await page.request.post('/api/v1/drugs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Delete Log Drug',
        type: 1,
        dosage: '250 mg',
        amount: '10 ml',
        schedule: 'E3D',
        courseId: course.id,
      },
    });
    const drug = await drugRes.json();
    const logRes = await page.request.post('/api/v1/intakelogs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        drugId: drug.id,
        date: '2026-01-16T10:00:00Z',
        dose: '250 mg',
      },
    });
    const log = await logRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'course');
    await page.locator('.course-tab:has-text("ЛОГИ ПРИЁМА")').click();
    await expect(page.locator('#filtered-intake-log .log-entry:has-text("Delete Log Drug")')).toBeVisible();
    await page.locator('#filtered-intake-log .log-entry:has-text("Delete Log Drug") button').last().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('#filtered-intake-log .log-entry:has-text("Delete Log Drug")')).not.toBeVisible();
    await page.request.delete(`/api/v1/drugs/${drug.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await page.request.delete(`/api/v1/courses/${course.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should switch to inventory tab and see content', async ({ page }) => {
    await navigateToPage(page, 'course');
    await page.locator('.course-tab:has-text("РЕЕСТР")').click();
    await expect(page.locator('[data-asciify="md"]:has-text("ИНВЕНТАРИЗАЦИЯ")')).toBeVisible();
  });

  test('should create purchase and visible in inventory', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const courseRes = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Purchase Test Course',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      },
    });
    const course = await courseRes.json();
    const drugRes = await page.request.post('/api/v1/drugs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Purchase Test Drug',
        type: 1,
        dosage: '250 mg',
        amount: '10 ml',
        schedule: 'E3D',
        courseId: course.id,
      },
    });
    const drug = await drugRes.json();
    const purchaseRes = await page.request.post('/api/v1/purchases', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        drugId: drug.id,
        quantity: 10,
        price: 1500,
        purchaseDate: '2026-01-10',
      },
    });
    const purchase = await purchaseRes.json();
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'course');
    await page.locator('.course-tab:has-text("РЕЕСТР")').click();
    await expect(page.locator('#purchases-list .purchase-entry:has-text("Purchase Test Drug")')).toBeVisible();
    await page.request.delete(`/api/v1/purchases/${purchase.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await page.request.delete(`/api/v1/drugs/${drug.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await page.request.delete(`/api/v1/courses/${course.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should show correct stock calculation in inventory', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('bt_token'));
    const courseRes = await page.request.post('/api/v1/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Stock Test Course',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      },
    });
    const course = await courseRes.json();
    const drugRes = await page.request.post('/api/v1/drugs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Stock Test Drug',
        type: 1,
        dosage: '250 mg',
        amount: '10 ml',
        schedule: 'E3D',
        courseId: course.id,
      },
    });
    const drug = await drugRes.json();
    await page.request.post('/api/v1/purchases', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        drugId: drug.id,
        quantity: 10,
        price: 1500,
        purchaseDate: '2026-01-10',
      },
    });
    await page.request.post('/api/v1/intakelogs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        drugId: drug.id,
        date: '2026-01-15T10:00:00Z',
        dose: '250 mg',
      },
    });
    // refresh: navigate away and back to reload data
    await page.evaluate(() => { if (window.state) window.state.currentPage = "dashboard"; });
    await page.waitForTimeout(300);
    await navigateToPage(page, 'course');
    await page.locator('.course-tab:has-text("РЕЕСТР")').click();
    await page.waitForTimeout(1500);
    await expect(page.locator('.inventory-card:has-text("Stock Test Drug")')).toBeVisible();
    const stockText = await page.locator('.inventory-card:has-text("Stock Test Drug") .inventory-stock').textContent();
    expect(stockText).toContain('9');
    const drugsRes = await page.request.get('/api/v1/drugs', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const drugs = await drugsRes.json();
    const created = drugs.find(d => d.name === 'Stock Test Drug');
    if (created) {
      const logsRes = await page.request.get('/api/v1/intakelogs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const logs = await logsRes.json();
      const log = logs.find(l => l.drugId === created.id);
      if (log) {
        await page.request.delete(`/api/v1/intakelogs/${log.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
      const purchasesRes = await page.request.get('/api/v1/purchases', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const purchases = await purchasesRes.json();
      const purchase = purchases.find(p => p.drugId === created.id);
      if (purchase) {
        await page.request.delete(`/api/v1/purchases/${purchase.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
      await page.request.delete(`/api/v1/drugs/${created.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }
    await page.request.delete(`/api/v1/courses/${course.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  });

  test('should switch all 4 tabs and content changes', async ({ page }) => {
    await navigateToPage(page, 'course');
    await page.locator('.course-tab:has-text("ПРЕПАРАТЫ")').click();
    await expect(page.locator('[data-asciify="md"]:has-text("ПРЕПАРАТЫ")')).toBeVisible();
    await page.locator('.course-tab:has-text("ЛОГИ ПРИЁМА")').click();
    await expect(page.locator('[data-asciify="md"]:has-text("ЛОГ ПРИЁМА")')).toBeVisible();
    await page.locator('.course-tab:has-text("РЕЕСТР")').click();
    await expect(page.locator('[data-asciify="md"]:has-text("ИНВЕНТАРИЗАЦИЯ")')).toBeVisible();
    await page.locator('.course-tab:has-text("СТАТИСТИКА")').click();
    await expect(page.locator('[data-asciify="md"]:has-text("ВЫБОР ПРЕПАРАТА")')).toBeVisible();
  });
});
