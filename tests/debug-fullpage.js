const puppeteer = require('puppeteer-core');
(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--no-sandbox', '--window-size=1400,900']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    // Crop just the dashboard overview section (top area after nav)
    const el = await page.$('.dashboard-overview');
    if (el) {
        const box = await el.boundingBox();
        await page.screenshot({
            path: 'tests/screenshots/dashboard-overview-crop.png',
            clip: { x: box.x, y: box.y - 10, width: box.width, height: box.height + 20 }
        });
    }

    // Full viewport
    await page.screenshot({ path: 'tests/screenshots/dashboard-viewport.png' });

    await browser.close();
})();
