const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture console logs
    page.on('console', msg => {
        if (msg.text().includes('Shader') || msg.text().includes('shader') || msg.text().includes('WebGL')) {
            console.log('CONSOLE:', msg.text());
        }
    });

    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    const shaderInfo = await page.evaluate(() => {
        const canvas = document.getElementById('shader-bg');
        const logs = [];

        if (canvas) {
            logs.push('shader-bg canvas FOUND');
            logs.push('  width: ' + canvas.width + ', height: ' + canvas.height);
            logs.push('  zIndex: ' + canvas.style.zIndex);
        } else {
            logs.push('shader-bg canvas NOT FOUND');
            // Check if WebGL is supported
            try {
                const testCanvas = document.createElement('canvas');
                const gl = testCanvas.getContext('webgl');
                logs.push('  WebGL support: ' + (gl ? 'YES' : 'NO'));
            } catch(e) {
                logs.push('  WebGL support: ERROR - ' + e.message);
            }
        }

        logs.push('body.shader-bg-active: ' + document.body.classList.contains('shader-bg-active'));
        logs.push('script version: ' + document.querySelector('script[src*="main.js"]')?.getAttribute('src'));

        return logs.join('\n');
    });

    console.log('Shader check:\n' + shaderInfo);

    await page.screenshot({
        path: 'P:/Job/Testosterone/BloodTracker/screenshots/shader-login.png',
        fullPage: false
    });
    console.log('\nScreenshot saved');

    await browser.close();
})();
