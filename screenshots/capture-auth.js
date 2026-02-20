const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions', '--disable-web-security']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Collect console
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => consoleLogs.push(`[PAGE_ERROR] ${err.message}`));

    // Screenshot 1: Initial load
    console.log('Loading http://77.232.42.99 ...');
    try {
        await page.goto('http://77.232.42.99', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch(e) {
        console.log('goto error:', e.message);
        // try without waitUntil
        await page.goto('http://77.232.42.99', { timeout: 15000 });
    }

    // Immediate screenshot
    await page.screenshot({ path: path.join(__dirname, 'auth-0ms.png'), fullPage: false });
    console.log('Screenshot: auth-0ms.png');

    // Wait for JS to execute
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(__dirname, 'auth-3s.png'), fullPage: false });
    console.log('Screenshot: auth-3s.png');

    // Wait more
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(__dirname, 'auth-6s.png'), fullPage: false });
    console.log('Screenshot: auth-6s.png');

    // Check DOM state
    const state = await page.evaluate(() => {
        const app = document.querySelector('.app');
        const login = document.getElementById('login-overlay');
        const errors = [];
        document.querySelectorAll('script[type="module"]').forEach(s => {
            if (s.src) errors.push('module: ' + s.src);
        });
        return {
            appDisplay: app ? window.getComputedStyle(app).display : 'null',
            appHasHidden: app?.classList.contains('auth-hidden'),
            loginExists: !!login,
            loginDisplay: login ? window.getComputedStyle(login).display : 'null',
            hasToken: !!localStorage.getItem('bt_token'),
            bodyClasses: document.body.className,
            scripts: errors,
            title: document.title
        };
    });
    console.log('\nDOM state:', JSON.stringify(state, null, 2));

    if (consoleLogs.length) {
        console.log('\nConsole logs:');
        consoleLogs.slice(0, 30).forEach(l => console.log('  ', l));
    }

    await browser.close();
})();
