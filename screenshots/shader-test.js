const puppeteer = require('C:/Users/Ouroboros/AppData/Local/npm-cache/_npx/6dcdf0eac2f19f94/node_modules/puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate and wait for load
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for shaders to init
    await new Promise(r => setTimeout(r, 3000));

    // Check DOM state
    const result = await page.evaluate(() => {
        const flickerEl = document.querySelector('.flicker-overlay');
        const vignetteEl = document.querySelector('.vignette-overlay');
        const noiseEl = document.querySelector('.noise-overlay');
        const matrixEl = document.querySelector('.matrix-runes-canvas');
        const torchEl = document.querySelector('.torch-left');

        return {
            hasShaderBg: document.getElementById('shader-bg') !== null,
            hasShaderPost: document.getElementById('shader-post') !== null,
            hasWebGLClass: document.documentElement.classList.contains('has-webgl'),
            hasNoWebGLClass: document.documentElement.classList.contains('no-webgl'),
            shaderBgActive: document.documentElement.classList.contains('shader-bg-active'),
            shaderPostActive: document.documentElement.classList.contains('shader-post-active'),
            flickerHidden: flickerEl ? getComputedStyle(flickerEl).display === 'none' : 'no-element',
            vignetteHidden: vignetteEl ? getComputedStyle(vignetteEl).display === 'none' : 'no-element',
            noiseHidden: noiseEl ? getComputedStyle(noiseEl).display === 'none' : 'no-element',
            matrixHidden: matrixEl ? getComputedStyle(matrixEl).display === 'none' : 'no-canvas',
            torchHidden: torchEl ? getComputedStyle(torchEl).display === 'none' : 'no-element',
            shaderToggleText: (document.getElementById('shader-toggle-btn') || {}).textContent || 'not-found',
        };
    });

    console.log(JSON.stringify(result, null, 2));

    await page.screenshot({ path: 'P:/Job/Testosterone/BloodTracker/screenshots/shader-test.png', fullPage: false });
    console.log('Screenshot saved to screenshots/shader-test.png');

    await browser.close();
})();
