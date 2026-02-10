const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport to 1920x1080
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    console.log('Navigating to http://localhost:5000...');
    await page.goto('http://localhost:5000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for initial page load
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const screenshotsDir = 'P:\\Job\\Testosterone\\BloodTracker\\screenshots';

    // Capture Dashboard (default page)
    console.log('Capturing Dashboard...');
    await page.screenshot({
      path: path.join(screenshotsDir, '01-dashboard.png'),
      fullPage: true
    });

    // Define navigation tabs to capture
    const tabs = [
      { page: 'course', name: '02-course' },
      { page: 'analyses', name: '03-analyses' },
      { page: 'compare', name: '04-compare' },
      { page: 'workouts', name: '05-workouts' },
      { page: 'ascii-studio', name: '06-ascii-studio' }
    ];

    // Click each tab and capture screenshot
    for (const tab of tabs) {
      console.log(`Navigating to ${tab.page}...`);

      // Click the navigation button
      const selector = `.nav-btn[data-page="${tab.page}"]`;
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector);

      // Wait for page transition and content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log(`Capturing ${tab.name}...`);
      await page.screenshot({
        path: path.join(screenshotsDir, `${tab.name}.png`),
        fullPage: true
      });
    }

    console.log('\nAll screenshots captured successfully!');
    console.log(`Screenshots saved to: ${screenshotsDir}`);
    console.log('\nCaptured pages:');
    console.log('  01-dashboard.png');
    console.log('  02-course.png');
    console.log('  03-analyses.png');
    console.log('  04-compare.png');
    console.log('  05-workouts.png');
    console.log('  06-ascii-studio.png');

  } catch (error) {
    console.error('Error capturing screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
