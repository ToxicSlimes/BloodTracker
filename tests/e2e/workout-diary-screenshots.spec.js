// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

async function getAuthHeaders(page) {
  const token = await page.evaluate(() => localStorage.getItem('bt_token'));
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function navigateToWorkoutSubTab(page, hash) {
  // Set hash and wait for React PageRouter to handle it
  await page.evaluate((h) => { window.location.hash = '#' + h; }, hash);
  // Wait for workouts page content to appear (any sub-tab)
  await page.waitForSelector('.workout-hub-tab, .workout-history, .active-workout-panel, .workout-programs', { timeout: 10000 });
  await page.waitForTimeout(800);
}

test.describe('Workout Diary — Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.__btState) window.__btState.activeWorkoutSession = null;
    });
    await page.waitForTimeout(300);
  });

  test('screenshot workout diary page (empty)', async ({ page }) => {
    await navigateToWorkoutSubTab(page, 'workout-diary');
    await page.screenshot({
      path: 'tests/e2e/screenshots/workout-diary-empty.png',
      fullPage: false,
    });
  });

  test('screenshot workouts page', async ({ page }) => {
    await navigateToPage(page, 'workouts');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/e2e/screenshots/workouts-page.png',
      fullPage: false,
    });
  });

  test('screenshot active workout page', async ({ page }) => {
    const headers = await getAuthHeaders(page);

    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'Screenshot Workout' }
    });
    const session = await startRes.json();

    const exRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises`,
      { headers, data: { name: 'Bench Press', muscleGroup: 1 } }
    );
    const exercise = await exRes.json();

    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`,
      { headers, data: { weight: 80, repetitions: 10 } }
    );
    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`,
      { headers, data: { weight: 85, repetitions: 8 } }
    );

    await navigateToWorkoutSubTab(page, 'active-workout');

    await page.screenshot({
      path: 'tests/e2e/screenshots/active-workout.png',
      fullPage: false,
    });

    await page.request.post(`/api/v1/workout-sessions/${session.id}/abandon`, { headers });
  });

  test('screenshot active workout with completed sets', async ({ page }) => {
    const headers = await getAuthHeaders(page);

    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'Screenshot Completed Sets' }
    });
    const session = await startRes.json();

    const exRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises`,
      { headers, data: { name: 'Squat', muscleGroup: 5 } }
    );
    const exercise = await exRes.json();

    const set1Res = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`,
      { headers, data: { weight: 100, repetitions: 5 } }
    );
    const set1 = await set1Res.json();

    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`,
      { headers, data: { weight: 100, repetitions: 5 } }
    );

    // Complete first set
    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/${set1.id}/complete`,
      { headers, data: { weight: 100, weightKg: 100, repetitions: 5, rpe: 8 } }
    );

    await navigateToWorkoutSubTab(page, 'active-workout');

    await page.screenshot({
      path: 'tests/e2e/screenshots/active-workout-with-completed-set.png',
      fullPage: false,
    });

    await page.request.post(`/api/v1/workout-sessions/${session.id}/abandon`, { headers });
  });

  test('screenshot workout diary with history', async ({ page }) => {
    const headers = await getAuthHeaders(page);

    const startRes = await page.request.post('/api/v1/workout-sessions/start', {
      headers,
      data: { customTitle: 'History Entry Workout' }
    });
    const session = await startRes.json();

    const exRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises`,
      { headers, data: { name: 'Deadlift', muscleGroup: 2 } }
    );
    const exercise = await exRes.json();

    const setRes = await page.request.post(
      `/api/v1/workout-sessions/${session.id}/exercises/${exercise.id}/sets`,
      { headers, data: { weight: 140, repetitions: 3 } }
    );
    const set = await setRes.json();

    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/sets/${set.id}/complete`,
      { headers, data: { weight: 140, weightKg: 140, repetitions: 3, rpe: 9 } }
    );

    await page.request.post(
      `/api/v1/workout-sessions/${session.id}/complete`,
      { headers, data: { notes: 'Heavy deads' } }
    );

    await navigateToWorkoutSubTab(page, 'workout-diary');

    await page.screenshot({
      path: 'tests/e2e/screenshots/workout-diary-with-history.png',
      fullPage: false,
    });
  });
});
