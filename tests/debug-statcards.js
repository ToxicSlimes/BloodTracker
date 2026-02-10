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

    // Get detailed info about stat cards and donut
    const info = await page.evaluate(() => {
        const overview = document.querySelector('.dashboard-overview');
        const donutCol = document.querySelector('.dashboard-donut-container');
        const statCards = document.querySelector('.stat-cards');
        const cards = document.querySelectorAll('.stat-card');
        const donutCard = document.querySelector('.dashboard-donut-container .card');

        const rect = el => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) };
        };

        return {
            overview: rect(overview),
            donutCol: rect(donutCol),
            donutCard: rect(donutCard),
            statCardsContainer: rect(statCards),
            statCards: Array.from(cards).map((c, i) => ({
                index: i,
                ...rect(c),
                title: c.querySelector('h3')?.textContent,
                value: c.querySelector('.stat-value')?.textContent,
                sub: c.querySelector('.stat-sub')?.textContent
            }))
        };
    });

    console.log(JSON.stringify(info, null, 2));

    // Close-up of just the overview
    const el = await page.$('.dashboard-overview');
    if (el) {
        await el.screenshot({ path: 'tests/screenshots/overview-detail.png' });
    }

    await browser.close();
})();
