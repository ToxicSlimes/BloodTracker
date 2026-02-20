const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[ERR] ${msg.text()}`);
    });

    // Auth setup
    await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => {
        localStorage.setItem('bt_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0N2MzOGJhYy00Y2Q1LTRhZWItYjgwYi0zYjJiNGE2MDI4M2MiLCJlbWFpbCI6InNhbGltb3ZhLmRkQGdtYWlsLmNvbSIsIm5hbWUiOiJOaWtpdGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzk2NTkzMDAsImV4cCI6MTg5NzMzOTMwMH0.fake-sig');
        localStorage.setItem('bt_user', JSON.stringify({id:"47c38bac-4cd5-4aeb-b80b-3b2b4a60283c",email:"salimova.dd@gmail.com",displayName:"Nikita",isAdmin:true}));
        sessionStorage.removeItem('_bt_rl');
    });
    await new Promise(r => setTimeout(r, 4000));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 4000));

    // Screenshot 1: Hall view
    await page.screenshot({ path: 'P:/Job/Testosterone/BloodTracker/screenshots/dungeon-step1-hall.png' });
    console.log('Step 1: Hall screenshot saved');

    // Click the dashboard door
    const clicked = await page.evaluate(() => {
        const door = document.querySelector('[data-room="dashboard"]');
        if (door) {
            door.click();
            return true;
        }
        return false;
    });
    console.log('Clicked dashboard door:', clicked);

    // Wait for transition animation
    await new Promise(r => setTimeout(r, 2000));

    // Check state after click
    const afterClick = await page.evaluate(() => {
        const engine = window.dungeonEngine;
        return {
            engineState: engine?.state,
            hallDisplay: document.querySelector('.dungeon-hall')?.style.display,
            dashboardActive: document.getElementById('dashboard')?.classList.contains('active'),
            backBtnExists: !!document.querySelector('.room-back-btn'),
            viewportStyle: {
                height: document.querySelector('.dungeon-viewport')?.style.height,
                overflow: document.querySelector('.dungeon-viewport')?.style.overflow,
            }
        };
    });
    console.log('After click:', JSON.stringify(afterClick, null, 2));

    // Screenshot 2: Room view
    await page.screenshot({ path: 'P:/Job/Testosterone/BloodTracker/screenshots/dungeon-step2-room.png' });
    console.log('Step 2: Room screenshot saved');

    // Click back button
    const backClicked = await page.evaluate(() => {
        const btn = document.querySelector('.room-back-btn');
        if (btn) { btn.click(); return true; }
        return false;
    });
    console.log('Clicked back:', backClicked);
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 3: Back to hall
    await page.screenshot({ path: 'P:/Job/Testosterone/BloodTracker/screenshots/dungeon-step3-back.png' });
    console.log('Step 3: Back to hall screenshot saved');

    await browser.close();
})();
