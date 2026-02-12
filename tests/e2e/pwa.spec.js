// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp } = require('./helpers');

test.describe('PWA Features', () => {
  test('manifest.json is accessible and valid', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest.name).toBe('BloodTracker');
    expect(manifest.short_name).toBe('BT');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
  });

  test('manifest has required icons', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json();
    
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    
    // Should have 192 and 512 sizes
    const sizes = manifest.icons.map(i => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    
    // Each icon should have src and type
    for (const icon of manifest.icons) {
      expect(icon.src).toBeTruthy();
      expect(icon.type).toBeTruthy();
    }
  });

  test('sw.js is accessible', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('install');
  });

  test('index.html references manifest', async ({ request }) => {
    const response = await request.get('/');
    const html = await response.text();
    expect(html).toContain('manifest.json');
    expect(html).toContain('theme-color');
  });

  test('service worker registers in browser', async ({ page }) => {
    await gotoApp(page);
    await page.waitForTimeout(2000);
    
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });
    expect(swRegistered).toBe(true);
  });
});
