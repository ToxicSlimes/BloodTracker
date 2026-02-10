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

    // Screenshot just the dashboard overview area
    const overview = await page.$('.dashboard-overview');
    if (overview) {
        await overview.screenshot({ path: 'tests/screenshots/overview-closeup.png' });
    }

    // Also get the full stat-cards area
    const statCards = await page.$('.stat-cards');
    if (statCards) {
        await statCards.screenshot({ path: 'tests/screenshots/stat-cards-closeup.png' });
    }

    // Get the dashboard tab header area
    const dashPage = await page.$('#page-dashboard');
    if (dashPage) {
        await dashPage.screenshot({ path: 'tests/screenshots/dashboard-full.png' });
    }

    // Get computed dimensions
    const info = await page.evaluate(() => {
        const overview = document.querySelector('.dashboard-overview');
        const donutContainer = document.querySelector('.dashboard-ascii-donut');
        const statCards = document.querySelector('.stat-cards');
        const donutPre = document.querySelector('.ascii-donut');
        const tabHeaders = document.querySelectorAll('.tab-btn, [data-tab]');

        const getInfo = (el, name) => {
            if (!el) return { name, found: false };
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return {
                name,
                found: true,
                width: rect.width,
                height: rect.height,
                display: cs.display,
                gridTemplateColumns: cs.gridTemplateColumns,
                gap: cs.gap,
                padding: cs.padding,
                margin: cs.margin,
                overflow: cs.overflow,
                className: el.className
            };
        };

        return {
            overview: getInfo(overview, 'overview'),
            donutContainer: getInfo(donutContainer, 'donutContainer'),
            statCards: getInfo(statCards, 'statCards'),
            donutPre: getInfo(donutPre, 'donutPre'),
            tabHeaders: Array.from(tabHeaders).map(t => ({
                text: t.textContent.trim().substring(0, 30),
                class: t.className
            }))
        };
    });

    console.log(JSON.stringify(info, null, 2));
    await browser.close();
})();
