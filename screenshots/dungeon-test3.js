const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // First visit — set localStorage before any JS runs
    await page.goto('about:blank');
    await page.evaluate(() => {
        // Can't set localStorage for localhost from about:blank
    });

    // Navigate to app, set tokens in the page context
    await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Immediately set auth tokens before full init completes
    await page.evaluate(() => {
        localStorage.setItem('bt_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0N2MzOGJhYy00Y2Q1LTRhZWItYjgwYi0zYjJiNGE2MDI4M2MiLCJlbWFpbCI6InNhbGltb3ZhLmRkQGdtYWlsLmNvbSIsIm5hbWUiOiJOaWtpdGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzk2NTkzMDAsImV4cCI6MTg5NzMzOTMwMH0.fake-sig');
        localStorage.setItem('bt_user', JSON.stringify({id:"47c38bac-4cd5-4aeb-b80b-3b2b4a60283c",email:"salimova.dd@gmail.com",displayName:"Nikita",isAdmin:true}));
    });

    // Check what's in localStorage now
    const tokenSet = await page.evaluate(() => !!localStorage.getItem('bt_token'));
    console.log('Token set:', tokenSet);

    // Reload — JS will now see the token on DOMContentLoaded
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for init to complete
    await new Promise(r => setTimeout(r, 5000));

    // Check if login overlay blocks us
    const state = await page.evaluate(() => {
        const loginOverlay = document.getElementById('login-overlay');
        const appEl = document.querySelector('.app');
        const viewport = document.querySelector('.dungeon-viewport');
        const errors = [];

        // Check console errors
        return {
            loginVisible: loginOverlay ? loginOverlay.style.display !== 'none' : false,
            loginExists: !!loginOverlay,
            appHidden: appEl?.classList.contains('auth-hidden'),
            viewportExists: !!viewport,
            headerDisplay: document.querySelector('header')?.style.display,
            token: !!localStorage.getItem('bt_token'),
            doorCount: document.querySelectorAll('.dungeon-door').length,
            bodyClasses: document.body.className,
            appClasses: appEl?.className,
        };
    });

    console.log('State:', JSON.stringify(state, null, 2));

    await page.screenshot({ path: 'P:/Job/Testosterone/BloodTracker/screenshots/dungeon-hall3.png', fullPage: false });
    console.log('Screenshot saved');

    await browser.close();
})();
