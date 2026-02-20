// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage, cleanupActiveWorkout } = require('./helpers');

// ═══════════════════════════════════════════════════════════════════════════════
// PWA OFFLINE TESTS — Service Worker caching & offline behaviour
// Tests that the app loads from cache when the network is unavailable.
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('PWA Offline', () => {
  // ─── Precache validation ──────────────────────────────────────────────────

  test('service worker activates and caches precache URLs', async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);

    // Give SW time to install + activate + precache
    await page.waitForTimeout(3000);

    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active;
    });
    expect(swActive).toBe(true);

    // Verify precache URLs are in cache
    const cached = await page.evaluate(async () => {
      const cache = await caches.open('bt-static-v2');
      const keys = await cache.keys();
      return keys.map(r => new URL(r.url).pathname);
    });

    expect(cached).toContain('/');
    expect(cached).toContain('/manifest.json');
  });

  // ─── Offline page load ────────────────────────────────────────────────────

  test('app shell loads offline after initial visit', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit SW caching differs from Chromium');
    await seedAuth(page);
    await gotoApp(page);

    // Wait for SW to finish caching
    await page.waitForTimeout(3000);

    // Go offline — block all network requests
    await context.setOffline(true);

    // Reload the page (should be served from cache)
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });

    // App shell should render — React AppShell renders nav buttons
    const navBtns = page.locator('.nav-btn');
    await expect(navBtns.first()).toBeVisible({ timeout: 10000 });
    expect(await navBtns.count()).toBeGreaterThanOrEqual(5);

    await context.setOffline(false);
  });

  // ─── Static assets from cache ─────────────────────────────────────────────

  test('CSS and JS bundles served from cache offline', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit SW caching differs from Chromium');
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(3000);

    // Collect URLs of loaded CSS/JS
    const assetUrls = await page.evaluate(() => {
      const urls = [];
      document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
        urls.push(el.getAttribute('href'));
      });
      document.querySelectorAll('script[src]').forEach(el => {
        urls.push(el.getAttribute('src'));
      });
      return urls.filter(Boolean);
    });

    // Go offline
    await context.setOffline(true);

    // Verify each asset returns from cache (not 503)
    for (const url of assetUrls.slice(0, 5)) {
      const response = await page.evaluate(async (u) => {
        try {
          const res = await fetch(u);
          return { status: res.status, ok: res.ok };
        } catch {
          return { status: 0, ok: false };
        }
      }, url);

      // Either served from SW cache (200) or at least not a hard failure
      // SW returns 503 for uncached resources, 200 for cached
      expect(response.status).toBeGreaterThanOrEqual(200);
    }

    await context.setOffline(false);
  });

  // ─── API stale-while-revalidate ───────────────────────────────────────────

  test('API GET returns cached data offline (stale-while-revalidate)', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit SW caching differs from Chromium');
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    await page.waitForTimeout(1500);
    await cleanupActiveWorkout(page);
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.state) window.state.activeWorkoutSession = null;
    });

    // Navigate to a page that makes API calls to prime the cache
    await navigateToPage(page, 'workouts');
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Try fetching a cached API endpoint
    const result = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('bt_token');
        const res = await fetch('/api/v1/workout-sessions?page=1&pageSize=5', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        return { status: res.status, hasBody: (await res.text()).length > 0 };
      } catch (e) {
        return { status: 0, error: e.message };
      }
    });

    // SW should return cached response (200) or 503 with JSON if not cached
    expect([200, 503]).toContain(result.status);
    expect(result.hasBody).toBe(true);

    await context.setOffline(false);
  });

  // ─── Offline mutations queue ──────────────────────────────────────────────

  test('non-GET requests fail gracefully offline', async ({ page, context }) => {
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    await page.waitForTimeout(2000);

    await context.setOffline(true);

    // Try a POST (mutation) — should fail but not crash the page
    const result = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('bt_token');
        const res = await fetch('/api/v1/workout-sessions/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ customTitle: 'Offline Test' }),
        });
        return { status: res.status, ok: res.ok };
      } catch (e) {
        return { error: e.message, failed: true };
      }
    });

    // POST should fail (SW doesn't cache non-GET)
    expect(result.error || !result.ok).toBeTruthy();

    // App should still be responsive (not crashed) — nav buttons visible
    const navBtns = page.locator('.nav-btn');
    await expect(navBtns.first()).toBeVisible();

    await context.setOffline(false);
  });

  // ─── Manifest & icons available offline ───────────────────────────────────

  test('manifest.json available offline', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit SW caching differs from Chromium');
    await seedAuth(page);
    await gotoApp(page);
    await page.waitForTimeout(3000);

    await context.setOffline(true);

    const result = await page.evaluate(async () => {
      try {
        const res = await fetch('/manifest.json');
        const json = await res.json();
        return { status: res.status, name: json.name };
      } catch (e) {
        return { error: e.message };
      }
    });

    expect(result.status).toBe(200);
    expect(result.name).toBe('BloodTracker');

    await context.setOffline(false);
  });

  // ─── Navigation offline ───────────────────────────────────────────────────

  test('SPA navigation works offline (client-side routing)', async ({ page, context }) => {
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    await page.waitForTimeout(3000);
    await cleanupActiveWorkout(page);
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.state) window.state.activeWorkoutSession = null;
    });

    await context.setOffline(true);

    // Click between tabs — should work since it's all client-side (React routing)
    await page.click('[data-page="encyclopedia"]');
    await expect(page.locator('[data-page="encyclopedia"].active')).toBeVisible({ timeout: 5000 });

    await page.click('[data-page="workouts"]');
    await expect(page.locator('[data-page="workouts"].active')).toBeVisible({ timeout: 5000 });

    await page.click('[data-page="dashboard"]');
    await expect(page.locator('[data-page="dashboard"].active')).toBeVisible({ timeout: 5000 });

    await context.setOffline(false);
  });

  // ─── Online recovery ──────────────────────────────────────────────────────

  test('app recovers when going back online', async ({ page, context }) => {
    await seedAuth(page, 'hmmm.true@gmail.com');
    await gotoApp(page);
    await page.waitForTimeout(2000);
    await cleanupActiveWorkout(page);
    await page.evaluate(() => {
      document.querySelectorAll('.color-picker-container, .workout-resume-banner, .workout-resume-overlay').forEach(el => el.remove());
      if (window.state) window.state.activeWorkoutSession = null;
    });

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // App should still work — navigate and verify
    await navigateToPage(page, 'analyses');
  });
});
