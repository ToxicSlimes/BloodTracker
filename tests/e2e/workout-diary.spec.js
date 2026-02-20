// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

test.describe('Workout Diary — E2E', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.state) window.state.activeWorkoutSession = null;
    });
    await page.waitForTimeout(300);
  });

  test('workouts page accessible from nav button', async ({ page }) => {
    await navigateToPage(page, 'workouts');
    // React: WorkoutsPage renders .workout-hub-tab buttons
    await expect(page.locator('.workout-hub-tab').first()).toBeVisible({ timeout: 10000 });
    // Verify nav button is active
    await expect(page.locator('[data-page="workouts"]')).toHaveClass(/active/);
  });

  test('navigate to workout diary via hash', async ({ page }) => {
    // #workout-diary maps to workouts page + history sub-tab
    await page.evaluate(() => { window.location.hash = '#workout-diary'; });
    // Wait for workout hub tabs to appear (workouts page rendered)
    await expect(page.locator('.workout-hub-tab').first()).toBeVisible({ timeout: 10000 });
    // Verify history tab is active
    await expect(page.locator('.workout-hub-tab:has-text("ИСТОРИЯ")')).toHaveClass(/active/, { timeout: 5000 });
  });

  test('start empty workout session', async ({ page }) => {
    const response = await page.request.post('/api/v1/workout-sessions/start', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken(page)}`
      },
      data: { customTitle: 'E2E Test Workout' }
    });
    expect(response.ok()).toBeTruthy();
    const session = await response.json();
    expect(session.title).toBe('E2E Test Workout');
    expect(session.status).toBe('InProgress');

    await page.request.post(`/api/v1/workout-sessions/${session.id}/abandon`, {
      headers: { 'Authorization': `Bearer ${await getToken(page)}` }
    });
  });

  test('full workout flow — start, add exercise, log set, complete', async ({ page }) => {
    const token = await getToken(page);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 1. Start session
    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'E2E Full Flow' }
    });
    expect(startRes.ok()).toBeTruthy();
    const session = await startRes.json();

    // 2. Add exercise
    const addExRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises`,
      { headers, data: { name: 'Bench Press', muscleGroup: 1 } }
    );
    expect(addExRes.ok()).toBeTruthy();
    const exercise = await addExRes.json();
    expect(exercise.name).toBe('Bench Press');

    // 3. Add set
    const addSetRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`,
      { headers, data: { weight: 80, repetitions: 10 } }
    );
    expect(addSetRes.ok()).toBeTruthy();
    const set = await addSetRes.json();

    // 4. Complete set
    const completeSetRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/${set.id}/complete`,
      { headers, data: { weight: 80, weightKg: 80, repetitions: 10, rpe: 7 } }
    );
    expect(completeSetRes.ok()).toBeTruthy();
    const completeResult = await completeSetRes.json();
    const completedSet = completeResult.set || completeResult;
    expect(completedSet.actualWeight).toBe(80);
    expect(completedSet.actualRepetitions).toBe(10);
    expect(completedSet.completedAt).not.toBeNull();

    // 5. Complete session
    const completeRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/complete`,
      { headers, data: { notes: 'E2E test done' } }
    );
    expect(completeRes.ok()).toBeTruthy();
    const summary = await completeRes.json();
    expect(summary.session.status).toBe('Completed');
    expect(summary.session.totalSetsCompleted).toBe(1);
    expect(summary.session.totalTonnage).toBe(800);
    expect(summary.session.totalVolume).toBe(10);
  });

  test('undo set flow', async ({ page }) => {
    const token = await getToken(page);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'E2E Undo Test' }
    });
    const session = await startRes.json();

    const addExRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises`,
      { headers, data: { name: 'Squat', muscleGroup: 5 } }
    );
    const exercise = await addExRes.json();

    const addSetRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`,
      { headers, data: { weight: 100, repetitions: 5 } }
    );
    const set = await addSetRes.json();

    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/${set.id}/complete`,
      { headers, data: { weight: 100, weightKg: 100, repetitions: 5 } }
    );

    // Undo
    const undoRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/undo`,
      { headers }
    );
    expect(undoRes.ok()).toBeTruthy();
    const undoneSession = await undoRes.json();
    const undoneSet = undoneSession.exercises[0].sets[0];
    expect(undoneSet.actualWeight).toBeNull();
    expect(undoneSet.actualRepetitions).toBeNull();
    expect(undoneSet.completedAt).toBeNull();

    await page.request.post(`/api/v1/workout-sessions/${session.id}/abandon`, { headers });
  });

  test('abandon workout session', async ({ page }) => {
    const token = await getToken(page);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'E2E Abandon Test' }
    });
    const session = await startRes.json();

    const abandonRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/abandon`,
      { headers }
    );
    expect(abandonRes.status()).toBe(204);

    // Verify no active session
    const activeRes = await page.request.get('/api/v1/workout-sessions/active', { headers });
    expect(activeRes.ok()).toBeTruthy();
    const body = await activeRes.text();
    expect(body === '' || body === 'null' || JSON.parse(body) === null).toBeTruthy();
  });

  test('previous exercise data after completed workout', async ({ page }) => {
    const token = await getToken(page);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Complete a workout with Deadlift
    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'E2E Previous Data' }
    });
    const session = await startRes.json();

    const addExRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises`,
      { headers, data: { name: 'Deadlift', muscleGroup: 2 } }
    );
    const exercise = await addExRes.json();

    const addSetRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`,
      { headers, data: { weight: 140, repetitions: 5 } }
    );
    const set = await addSetRes.json();

    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/${set.id}/complete`,
      { headers, data: { weight: 140, weightKg: 140, repetitions: 5, rpe: 8 } }
    );

    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/complete`,
      { headers, data: {} }
    );

    // Now check previous data
    const prevRes = await page.request.get(
      `/api/v1/workout-sessions/previous/${encodeURIComponent('Deadlift')}`,
      { headers }
    );
    expect(prevRes.ok()).toBeTruthy();
    const prevData = await prevRes.json();
    expect(prevData.exerciseName).toBe('Deadlift');
    expect(prevData.sets).toHaveLength(1);
    expect(prevData.sets[0].weight).toBe(140);
    expect(prevData.sets[0].repetitions).toBe(5);
    expect(prevData.sets[0].rpe).toBe(8);
  });

  test('workout history pagination', async ({ page }) => {
    const token = await getToken(page);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const historyRes = await page.request.get(
      '/api/v1/workout-sessions?page=1&pageSize=20',
      { headers }
    );
    expect(historyRes.ok()).toBeTruthy();
    const history = await historyRes.json();
    expect(history).toHaveProperty('items');
    expect(history).toHaveProperty('totalCount');
    expect(history).toHaveProperty('page');
    expect(history).toHaveProperty('pageSize');
  });

  test('multi-exercise workout with aggregates', async ({ page }) => {
    const token = await getToken(page);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'E2E Multi-Exercise' }
    });
    const session = await startRes.json();

    // Exercise 1: Bench Press — 2 sets
    const ex1Res = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises`,
      { headers, data: { name: 'Bench Press', muscleGroup: 1 } }
    );
    const ex1 = await ex1Res.json();

    const set1Res = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${ex1.id}/sets`,
      { headers, data: { weight: 80, repetitions: 10 } }
    );
    const set1 = await set1Res.json();

    const set2Res = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${ex1.id}/sets`,
      { headers, data: { weight: 85, repetitions: 8 } }
    );
    const set2 = await set2Res.json();

    // Exercise 2: Squat — 1 set
    const ex2Res = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises`,
      { headers, data: { name: 'Squat', muscleGroup: 5 } }
    );
    const ex2 = await ex2Res.json();

    const set3Res = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${ex2.id}/sets`,
      { headers, data: { weight: 100, repetitions: 5 } }
    );
    const set3 = await set3Res.json();

    // Complete all 3 sets
    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/${set1.id}/complete`,
      { headers, data: { weight: 80, weightKg: 80, repetitions: 10, rpe: 7 } }
    );
    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/${set2.id}/complete`,
      { headers, data: { weight: 85, weightKg: 85, repetitions: 8, rpe: 8 } }
    );
    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/${set3.id}/complete`,
      { headers, data: { weight: 100, weightKg: 100, repetitions: 5, rpe: 9 } }
    );

    // Complete session
    const completeRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/complete`,
      { headers, data: { notes: 'Multi-exercise done' } }
    );
    const summary = await completeRes.json();

    expect(summary.session.totalSetsCompleted).toBe(3);
    // Tonnage: 80*10 + 85*8 + 100*5 = 800 + 680 + 500 = 1980
    expect(summary.session.totalTonnage).toBe(1980);
    // Volume: 10 + 8 + 5 = 23 reps
    expect(summary.session.totalVolume).toBe(23);
    expect(summary.session.notes).toContain('Multi-exercise done');
  });

  test('repeat last workout copies previous data', async ({ page }) => {
    const token = await getToken(page);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // First workout
    const s1Res = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'E2E RepeatLast Source' }
    });
    const s1 = await s1Res.json();

    const exRes = await page.request.post(
      `/api/v1/workout-sessions/${s1.id}/exercises`,
      { headers, data: { name: 'OHP', muscleGroup: 3 } }
    );
    const ex = await exRes.json();

    const setRes = await page.request.post(
      `/api/v1/workout-sessions/${s1.id}/exercises/${ex.id}/sets`,
      { headers, data: { weight: 50, repetitions: 8 } }
    );
    const set = await setRes.json();

    await page.request.post(
      `/api/v1/workout-sessions/${s1.id}/sets/${set.id}/complete`,
      { headers, data: { weight: 50, weightKg: 50, repetitions: 8, rpe: 7 } }
    );
    await page.request.post(
      `/api/v1/workout-sessions/${s1.id}/complete`,
      { headers, data: {} }
    );

    // Second workout with repeatLast
    const s2Res = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { repeatLast: true }
    });
    expect(s2Res.ok()).toBeTruthy();
    const s2 = await s2Res.json();
    expect(s2.title).toBe('E2E RepeatLast Source');
    expect(s2.exercises).toHaveLength(1);
    expect(s2.exercises[0].name).toBe('OHP');

    await page.request.post(`/api/v1/workout-sessions/${s2.id}/abandon`, { headers });
  });
});

async function getToken(page) {
  return await page.evaluate(() => localStorage.getItem('bt_token'));
}
