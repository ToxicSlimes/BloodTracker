/**
 * dungeon-test.js — Puppeteer screenshot capture for BloodTracker dungeon UI
 *
 * Captures full-page and viewport-specific screenshots of the authenticated app.
 * Usage: node screenshots/dungeon-test.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

const APP_URL = 'http://localhost:5000';
const VIEWPORT = { width: 1400, height: 900 };
const SCREENSHOTS_DIR = path.resolve(__dirname);

const JWT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiI0N2MzOGJhYy00Y2Q1LTRhZWItYjgwYi0zYjJiNGE2MDI4M2MiLCJlbWFpbCI6InNhbGltb3ZhLmRkQGdtYWlsLmNvbSIsIm5hbWUiOiJOaWtpdGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzk2NTkzMDAsImV4cCI6MTg5NzMzOTMwMH0.' +
  'fake-sig';

const BT_USER = JSON.stringify({
  id: '47c38bac-4cd5-4aeb-b80b-3b2b4a60283c',
  email: 'salimova.dd@gmail.com',
  displayName: 'Nikita',
  isAdmin: true,
});

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let browser;
  try {
    console.log('[1/6] Launching headless Chrome...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--window-size=1400,900',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    console.log(`[2/6] Navigating to ${APP_URL} (initial load)...`);
    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    } catch (err) {
      console.error(`  Failed to reach ${APP_URL}: ${err.message}`);
      console.error('  Make sure the app is running (cd src/BloodTracker.Api && dotnet run).');
      process.exit(1);
    }

    console.log('[3/6] Waiting 3 seconds for page to settle...');
    await sleep(3000);

    console.log('[4/6] Setting auth tokens in localStorage...');
    await page.evaluate(
      (token, user) => {
        localStorage.setItem('bt_token', token);
        localStorage.setItem('bt_user', user);
      },
      JWT_TOKEN,
      BT_USER
    );
    console.log('  bt_token and bt_user set.');

    console.log('[5/6] Reloading page and waiting 4 seconds for full init...');
    try {
      await page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch (err) {
      console.warn(`  Reload warning: ${err.message} - continuing anyway.`);
    }
    await sleep(4000);

    // Full-page screenshot
    const fullPagePath = path.join(SCREENSHOTS_DIR, 'dungeon-hall.png');
    console.log('[6/6] Taking screenshots...');
    await page.screenshot({
      path: fullPagePath,
      fullPage: true,
    });
    console.log(`  Full-page screenshot saved: ${fullPagePath}`);

    // Attempt viewport-area screenshot (the main content region)
    const viewportSelectors = [
      '#app',
      '#content',
      '.app-container',
      '.main-content',
      'main',
      '.content-area',
      '#main',
      '.page-content',
    ];

    let viewportCaptured = false;
    for (const selector of viewportSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const box = await element.boundingBox();
          if (box && box.width > 100 && box.height > 100) {
            const viewportPath = path.join(SCREENSHOTS_DIR, 'dungeon-viewport.png');
            await element.screenshot({ path: viewportPath });
            console.log(`  Viewport screenshot (${selector}) saved: ${viewportPath}`);
            viewportCaptured = true;
            break;
          }
        }
      } catch (_) {
        // Selector not found, try next
      }
    }

    if (!viewportCaptured) {
      // Fallback: clipped screenshot of the visible viewport area
      const viewportPath = path.join(SCREENSHOTS_DIR, 'dungeon-viewport.png');
      await page.screenshot({
        path: viewportPath,
        clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
      });
      console.log(`  Viewport screenshot (clip fallback) saved: ${viewportPath}`);
    }

    // Log page title and URL for debugging
    const title = await page.title();
    const url = page.url();
    console.log(`\n  Page title: "${title}"`);
    console.log(`  Page URL:   ${url}`);

    // Check if login overlay is visible (auth may have failed with fake token)
    const loginVisible = await page.evaluate(() => {
      const overlay = document.querySelector('#login-overlay, .login-overlay, .auth-overlay');
      if (!overlay) return false;
      const style = window.getComputedStyle(overlay);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (loginVisible) {
      console.log('  NOTE: Login overlay is still visible - the fake JWT was likely rejected by the server.');
      console.log('  The screenshots show the login screen rather than the authenticated dashboard.');
    }

    console.log('\nDone. All screenshots captured successfully.');
  } catch (err) {
    console.error(`\nUnexpected error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
