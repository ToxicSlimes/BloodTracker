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

    await page.screenshot({ path: 'tests/screenshots/debug-dashboard.png', fullPage: true });

    // Get the donut raw text
    const info = await page.evaluate(() => {
        const pre = document.querySelector('.ascii-donut');
        if (!pre) return { found: false };
        const cs = getComputedStyle(pre);
        return {
            found: true,
            textContent: pre.textContent,
            innerHTML: pre.innerHTML.substring(0, 2000),
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
            lineHeight: cs.lineHeight,
            whiteSpace: cs.whiteSpace,
            offsetWidth: pre.offsetWidth,
            scrollWidth: pre.scrollWidth,
            offsetHeight: pre.offsetHeight,
            scrollHeight: pre.scrollHeight,
            overflow: cs.overflow,
            parentClass: pre.parentElement ? pre.parentElement.className : 'none',
            parentWidth: pre.parentElement ? pre.parentElement.offsetWidth : 0
        };
    });

    console.log('=== DONUT INFO ===');
    console.log(JSON.stringify(info, null, 2));

    if (info.textContent) {
        console.log('\n=== LINE WIDTHS ===');
        info.textContent.split('\n').forEach((line, i) => {
            console.log(`[${String(i).padStart(2)}] len=${String(line.length).padStart(3)} |${line}|`);
        });
    }

    await browser.close();
})();
