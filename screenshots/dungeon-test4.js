const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Collect console errors
    const logs = [];
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            logs.push(`[${msg.type()}] ${msg.text()}`);
        }
    });

    // First visit — set tokens
    await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => {
        localStorage.setItem('bt_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0N2MzOGJhYy00Y2Q1LTRhZWItYjgwYi0zYjJiNGE2MDI4M2MiLCJlbWFpbCI6InNhbGltb3ZhLmRkQGdtYWlsLmNvbSIsIm5hbWUiOiJOaWtpdGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzk2NTkzMDAsImV4cCI6MTg5NzMzOTMwMH0.fake-sig');
        localStorage.setItem('bt_user', JSON.stringify({id:"47c38bac-4cd5-4aeb-b80b-3b2b4a60283c",email:"salimova.dd@gmail.com",displayName:"Nikita",isAdmin:true}));
        // Clear the anti-reload-loop guard so it won't wipe our token
        sessionStorage.removeItem('_bt_rl');
    });

    // Wait long enough to bypass the 3s anti-reload guard
    await new Promise(r => setTimeout(r, 4000));

    // Reload — now JS sees the token
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 5000));

    // Debug DOM
    const state = await page.evaluate(() => {
        const viewport = document.querySelector('.dungeon-viewport');
        const doors = document.querySelectorAll('.dungeon-door');
        const wallBack = document.querySelector('.wall-back');
        const doorContainers = document.querySelectorAll('.door-container');

        return {
            viewportExists: !!viewport,
            viewportRect: viewport?.getBoundingClientRect(),
            doorCount: doors.length,
            containerCount: doorContainers.length,
            wallBackExists: !!wallBack,
            wallBackChildren: wallBack ? wallBack.children.length : 0,
            wallBackChildTags: wallBack ? Array.from(wallBack.children).map(c => c.tagName + '.' + c.className) : [],
            appHidden: document.querySelector('.app')?.classList.contains('auth-hidden'),
            loginExists: !!document.getElementById('login-overlay'),
            token: !!localStorage.getItem('bt_token'),
            headerDisplay: document.querySelector('header')?.style.display,
        };
    });

    console.log('State:', JSON.stringify(state, null, 2));
    if (logs.length) console.log('Console errors:', logs.slice(0, 10).join('\n'));

    await page.screenshot({ path: 'P:/Job/Testosterone/BloodTracker/screenshots/dungeon-hall4.png', fullPage: false });
    console.log('Screenshot saved');

    await browser.close();
})();
