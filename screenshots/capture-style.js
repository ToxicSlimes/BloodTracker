const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
    const page = await browser.newPage();

    // Get a valid JWT token first
    const loginResp = await page.evaluate(async () => {
        const r = await fetch('http://localhost:5000/api/auth/email/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test-screenshots@test.com' })
        });
        return { status: r.status, text: await r.text() };
    }).catch(() => null);

    // Try to access the page directly - it'll show login if not authenticated
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 1: Login page (what unauthenticated users see)
    await page.screenshot({
        path: 'P:/Job/Testosterone/BloodTracker/screenshots/style-login.png',
        fullPage: false
    });
    console.log('1/5 Login page captured');

    // Try to set a fake token to bypass auth and see the main app
    await page.evaluate(() => {
        // Create a minimal JWT-like token to get past the frontend auth gate
        // The app checks auth.isLoggedIn() which reads from localStorage
        const fakePayload = btoa(JSON.stringify({ sub: 'test', email: 'test@test.com', exp: Math.floor(Date.now()/1000) + 86400, role: 'admin' }));
        const fakeToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.' + fakePayload + '.fake';
        localStorage.setItem('bt_token', fakeToken);
        localStorage.setItem('bt_user', JSON.stringify({ email: 'test@test.com', displayName: 'Test User' }));
    });

    // Reload to trigger init() with "authenticated" state
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 4000));

    // Screenshot 2: Dashboard (main view)
    await page.screenshot({
        path: 'P:/Job/Testosterone/BloodTracker/screenshots/style-dashboard.png',
        fullPage: false
    });
    console.log('2/5 Dashboard captured');

    // Screenshot 3: Full page scroll
    await page.screenshot({
        path: 'P:/Job/Testosterone/BloodTracker/screenshots/style-dashboard-full.png',
        fullPage: true
    });
    console.log('3/5 Dashboard full-page captured');

    // Navigate to Course tab
    await page.evaluate(() => {
        const btn = document.querySelector('[data-page="course"]');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot 4: Course page
    await page.screenshot({
        path: 'P:/Job/Testosterone/BloodTracker/screenshots/style-course.png',
        fullPage: false
    });
    console.log('4/5 Course page captured');

    // Navigate to Analyses tab
    await page.evaluate(() => {
        const btn = document.querySelector('[data-page="analyses"]');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot 5: Analyses page
    await page.screenshot({
        path: 'P:/Job/Testosterone/BloodTracker/screenshots/style-analyses.png',
        fullPage: false
    });
    console.log('5/5 Analyses page captured');

    // Collect visual style info
    const styleInfo = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return {
            primaryColor: cs.getPropertyValue('--primary-color').trim(),
            bgColor: cs.getPropertyValue('--bg').trim() || getComputedStyle(document.body).backgroundColor,
            fontFamily: cs.getPropertyValue('--ascii-font-family').trim(),
            effectElements: {
                flickerOverlay: document.querySelector('.flicker-overlay') !== null,
                vignetteOverlay: document.querySelector('.vignette-overlay') !== null,
                noiseOverlay: document.querySelector('.noise-overlay') !== null,
                torchLeft: document.querySelector('.torch-left') !== null,
                torchRight: document.querySelector('.torch-right') !== null,
                matrixCanvas: document.querySelector('.matrix-runes-canvas') !== null,
                runes: document.querySelectorAll('.rune').length,
                sparks: document.querySelectorAll('.spark').length,
                crtClass: document.body.classList.contains('crt'),
                progressBar: document.getElementById('ascii-progress-bar') !== null,
            },
            viewport: { w: window.innerWidth, h: window.innerHeight },
        };
    });

    console.log('\nStyle analysis:');
    console.log(JSON.stringify(styleInfo, null, 2));

    await browser.close();
    console.log('\nDone! Screenshots saved to screenshots/style-*.png');
})();
