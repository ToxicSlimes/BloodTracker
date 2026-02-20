const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    // iPhone 14 viewport
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

    await page.goto('http://localhost:5000', { waitUntil: 'load', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    await page.screenshot({ path: 'screenshots/mobile-dashboard.png', fullPage: true });
    console.log('1/4 Dashboard saved');

    const navBtns = await page.$$('.nav-btn');
    console.log(`Found ${navBtns.length} nav buttons`);

    if (navBtns.length > 1) {
        await navBtns[1].click();
        await new Promise(r => setTimeout(r, 3000));
        await page.screenshot({ path: 'screenshots/mobile-analyses.png', fullPage: true });
        console.log('2/4 Analyses saved');
    }

    if (navBtns.length > 2) {
        await navBtns[2].click();
        await new Promise(r => setTimeout(r, 3000));
        await page.screenshot({ path: 'screenshots/mobile-course.png', fullPage: true });
        console.log('3/4 Course saved');
    }

    if (navBtns.length > 3) {
        await navBtns[3].click();
        await new Promise(r => setTimeout(r, 3000));
        await page.screenshot({ path: 'screenshots/mobile-workouts.png', fullPage: true });
        console.log('4/4 Workouts saved');
    }

    await browser.close();
    console.log('Done!');
})();
