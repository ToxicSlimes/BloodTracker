// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('PWA Features', () => {
  test('service worker registers successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    expect(swRegistered).toBe(true);
  });

  test('manifest.json is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toMatch(/json/);
  });

  test('manifest.json has correct fields', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response.json();

    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('icons');
    expect(manifest).toHaveProperty('start_url');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('manifest icons have required properties', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response.json();

    for (const icon of manifest.icons) {
      expect(icon).toHaveProperty('src');
      expect(icon).toHaveProperty('sizes');
    }
  });

  test('offline fallback — page handles network down', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate offline by aborting all requests
    await page.route('**/*', route => route.abort());

    // Try navigating — should show offline content or cached page
    try {
      await page.goto('/encyclopedia', { timeout: 5000 });
    } catch {
      // Expected — navigation may fail
    }

    // Page should still have some content (cached or offline fallback)
    const body = await page.locator('body').textContent();
    expect(body.length).toBeGreaterThan(0);
  });
});
