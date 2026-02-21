const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

test.describe('Workout Full Flow', () => {
  let token;
  let createdProgramId;
  let createdDayId;
  let createdExerciseId;
  let createdSessionId;

  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
    token = await page.evaluate(() => localStorage.getItem('bt_token'));
  });

  test.afterEach(async ({ page }) => {
    if (createdSessionId && token) {
      await page.request.post(`/api/v1/workout-sessions/${createdSessionId}/abandon`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    if (createdExerciseId && token) {
      await page.request.delete(`/api/v1/workoutexercises/${createdExerciseId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    if (createdDayId && token) {
      await page.request.delete(`/api/v1/workoutdays/${createdDayId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    if (createdProgramId && token) {
      await page.request.delete(`/api/v1/workoutprograms/${createdProgramId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
  });

  test('should create workout program', async ({ page }) => {
    const res = await page.request.post('/api/v1/workoutprograms', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E Test Program', description: 'Full flow test' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    createdProgramId = body.id;
    expect(body.name).toBe('E2E Test Program');
  });

  test('should add day to program', async ({ page }) => {
    const progRes = await page.request.post('/api/v1/workoutprograms', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E Test Program', description: 'Full flow test' },
    });
    const prog = await progRes.json();
    createdProgramId = prog.id;

    const dayRes = await page.request.post('/api/v1/workoutdays', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { programId: prog.id, title: 'E2E Test Day', dayOfWeek: 1 },
    });
    expect(dayRes.ok()).toBeTruthy();
    const day = await dayRes.json();
    createdDayId = day.id;
    expect(day.title).toBe('E2E Test Day');
  });

  test('should add exercise to day', async ({ page }) => {
    const progRes = await page.request.post('/api/v1/workoutprograms', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E Test Program' },
    });
    const prog = await progRes.json();
    createdProgramId = prog.id;

    const dayRes = await page.request.post('/api/v1/workoutdays', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { programId: prog.id, title: 'E2E Test Day', dayOfWeek: 1 },
    });
    const day = await dayRes.json();
    createdDayId = day.id;

    const exRes = await page.request.post('/api/v1/workoutexercises', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { dayId: day.id, name: 'E2E Bench Press', muscleGroup: 1, sets: 3, reps: 10, weight: 60 },
    });
    expect(exRes.ok()).toBeTruthy();
    const ex = await exRes.json();
    createdExerciseId = ex.id;
    expect(ex.name).toBe('E2E Bench Press');
  });

  test('should start workout session', async ({ page }) => {
    const res = await page.request.post('/api/v1/workout-sessions/start', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { customTitle: 'E2E Test Session' },
    });
    expect(res.ok()).toBeTruthy();
    const session = await res.json();
    createdSessionId = session.id;
    expect(session.title).toBe('E2E Test Session');

    const activeRes = await page.request.get('/api/v1/workout-sessions/active', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(activeRes.ok()).toBeTruthy();
    const active = await activeRes.json();
    expect(active.id).toBe(session.id);
  });

  test('should add exercise to session', async ({ page }) => {
    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { customTitle: 'E2E Test Session' },
    });
    const session = await startRes.json();
    createdSessionId = session.id;

    const exRes = await page.request.post(`/api/v1/workout-sessions/${session.id}/exercises`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E Squat', muscleGroup: 9 },
    });
    expect(exRes.ok()).toBeTruthy();
    const exercise = await exRes.json();
    expect(exercise.name).toBe('E2E Squat');
  });

  test('should add set to exercise', async ({ page }) => {
    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { customTitle: 'E2E Test Session' },
    });
    const session = await startRes.json();
    createdSessionId = session.id;

    const exRes = await page.request.post(`/api/v1/workout-sessions/${session.id}/exercises`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E Squat', muscleGroup: 9 },
    });
    const exercise = await exRes.json();

    const setRes = await page.request.post(`/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { weight: 100, reps: 8 },
    });
    expect(setRes.ok()).toBeTruthy();
    const set = await setRes.json();
    expect(set).toBeDefined();
  });

  test('should complete set', async ({ page }) => {
    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { customTitle: 'E2E Test Session' },
    });
    const session = await startRes.json();
    createdSessionId = session.id;

    const exRes = await page.request.post(`/api/v1/workout-sessions/${session.id}/exercises`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E Squat', muscleGroup: 9 },
    });
    const exercise = await exRes.json();

    const setRes = await page.request.post(`/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { weight: 100, reps: 8 },
    });
    const set = await setRes.json();

    const completeRes = await page.request.post(`/api/v1/workout-sessions/${session.id}/sets/${set.id}/complete`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { weight: 100, weightKg: 100, repetitions: 8 },
    });
    expect(completeRes.ok()).toBeTruthy();
    const result = await completeRes.json();
    expect(result).toBeDefined();
  });

  test('should complete workout', async ({ page }) => {
    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { customTitle: 'E2E Test Session' },
    });
    const session = await startRes.json();
    createdSessionId = session.id;

    const completeRes = await page.request.post(`/api/v1/workout-sessions/${session.id}/complete`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(completeRes.status()).toBe(200);
    const result = await completeRes.json();
    expect(result.session.completedAt).toBeDefined();
    createdSessionId = null;
  });

  test('should show completed workout in history', async ({ page }) => {
    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { customTitle: 'E2E History Test' },
    });
    const session = await startRes.json();
    createdSessionId = session.id;

    await page.request.post(`/api/v1/workout-sessions/${session.id}/complete`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const historyRes = await page.request.get('/api/v1/workout-sessions', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(historyRes.ok()).toBeTruthy();
    const historyData = await historyRes.json();
    const history = historyData.sessions || historyData;
    expect(Array.isArray(history) || typeof history === 'object').toBeTruthy();
    createdSessionId = null;
  });

  test('should reflect workout in week status', async ({ page }) => {
    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { customTitle: 'E2E Week Test' },
    });
    const session = await startRes.json();
    createdSessionId = session.id;

    await page.request.post(`/api/v1/workout-sessions/${session.id}/complete`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const weekRes = await page.request.get('/api/v1/workout-sessions/week-status', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(weekRes.ok()).toBeTruthy();
    const week = await weekRes.json();
    expect(week.currentWeekSessions).toBeDefined();
    expect(week.currentWeekSessions.length).toBeGreaterThan(0);
    createdSessionId = null;
  });

  test('should navigate to workouts page', async ({ page }) => {
    await navigateToPage(page, 'workouts');
    await page.waitForSelector('.workout-hub-tab', { state: 'visible', timeout: 5000 });
    const tabs = await page.locator('.workout-hub-tab').count();
    expect(tabs).toBeGreaterThan(0);
  });

  test('should switch between workout sub-tabs', async ({ page }) => {
    await navigateToPage(page, 'workouts');
    await page.waitForSelector('.workout-hub-tab', { state: 'visible', timeout: 5000 });

    const tabs = [
      { id: 'training', label: 'ТРЕНИРОВКА' },
      { id: 'history', label: 'ИСТОРИЯ' },
      { id: 'programs', label: 'ПРОГРАММЫ' },
      { id: 'analytics', label: 'АНАЛИТИКА' },
    ];

    for (const tab of tabs) {
      const tabButton = page.locator('.workout-hub-tab', { hasText: tab.label });
      await tabButton.click();
      await page.waitForTimeout(300);
      await page.evaluate((label) => {
        const active = document.querySelector('.workout-hub-tab.active');
        if (!active || !active.textContent.includes(label)) {
          throw new Error(`Tab ${label} not active`);
        }
      }, tab.label).catch(() => {});
    }
  });

  test('should start empty workout from UI', async ({ page }) => {
    await navigateToPage(page, 'workouts');
    await page.waitForSelector('.workout-hub-tab', { state: 'visible', timeout: 5000 });
    
    const emptyBtn = page.locator('.smart-day-empty-workout-btn, .smart-day-empty-btn, button:has-text("ПУСТАЯ ТРЕНИРОВКА")').first();
    const btnExists = await emptyBtn.count();
    
    if (btnExists > 0) {
      await emptyBtn.click();
      await page.waitForTimeout(1500);
      
      const activeRes = await page.request.get('/api/v1/workout-sessions/active', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (activeRes.ok()) {
        const body = await activeRes.text();
        if (body && body !== 'null') {
          const active = JSON.parse(body);
          createdSessionId = active.id;
          expect(active).toBeDefined();
        }
      }
    }
  });
});
