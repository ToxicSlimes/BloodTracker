const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Set auth tokens
    await page.goto('http://localhost:5000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => {
        localStorage.setItem('bt_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0N2MzOGJhYy00Y2Q1LTRhZWItYjgwYi0zYjJiNGE2MDI4M2MiLCJlbWFpbCI6InNhbGltb3ZhLmRkQGdtYWlsLmNvbSIsIm5hbWUiOiJOaWtpdGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzk2NTkzMDAsImV4cCI6MTg5NzMzOTMwMH0.fake-sig');
        localStorage.setItem('bt_user', JSON.stringify({id:"47c38bac-4cd5-4aeb-b80b-3b2b4a60283c",email:"salimova.dd@gmail.com",displayName:"Nikita",isAdmin:true}));
    });

    // Reload with auth
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));

    // Check DOM for doors
    const doorInfo = await page.evaluate(() => {
        const doors = document.querySelectorAll('.dungeon-door');
        const viewport = document.querySelector('.dungeon-viewport');
        const hall = document.querySelector('.dungeon-hall');
        const wallBack = document.querySelector('.wall-back');
        const containers = document.querySelectorAll('.door-container');

        const info = {
            doorCount: doors.length,
            viewportExists: !!viewport,
            hallExists: !!hall,
            wallBackExists: !!wallBack,
            containerCount: containers.length,
            viewportDisplay: viewport?.style?.display,
            viewportRect: viewport?.getBoundingClientRect(),
            wallBackRect: wallBack?.getBoundingClientRect(),
            doors: []
        };

        doors.forEach(d => {
            const rect = d.getBoundingClientRect();
            info.doors.push({
                room: d.dataset.room,
                rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                visible: rect.width > 0 && rect.height > 0
            });
        });

        return info;
    });

    console.log('DOM Debug:', JSON.stringify(doorInfo, null, 2));

    // Screenshot
    await page.screenshot({ path: 'P:/Job/Testosterone/BloodTracker/screenshots/dungeon-hall2.png', fullPage: false });
    console.log('Screenshot saved');

    await browser.close();
})();
