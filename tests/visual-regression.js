/**
 * Visual Regression Tests for BloodTracker
 *
 * Tests for layout issues: element overlap, button stability on hover,
 * ASCII art alignment, responsive layout integrity.
 *
 * Usage:
 *   1. Start the app: cd src/BloodTracker.Api && dotnet run
 *   2. Run tests:     node tests/visual-regression.js
 *
 * Requires: npm install puppeteer-core (already in package.json devDependencies)
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Helper: wait ms (replacement for deprecated page.waitForTimeout)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Test results
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details = '') {
    if (condition) {
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
    } else {
        failed++;
        failures.push({ testName, details });
        console.log(`  \x1b[31m✗\x1b[0m ${testName}${details ? ': ' + details : ''}`);
    }
}

async function screenshot(page, name) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST: Button dimensions don't change on hover (no shaking)
// ═══════════════════════════════════════════════════════════════════════
async function testButtonHoverStability(page) {
    console.log('\n── Button Hover Stability ──');

    const buttons = await page.$$('.btn, .nav-btn, .quick-action-btn');
    let tested = 0;

    for (const btn of buttons.slice(0, 8)) {
        const before = await btn.boundingBox();
        if (!before || before.width === 0) continue;

        await btn.hover();
        await sleep(350); // wait for transitions

        const after = await btn.boundingBox();
        if (!after) continue;

        const heightDiff = Math.abs(after.height - before.height);
        const widthDiff = Math.abs(after.width - before.width);

        const label = await page.evaluate(el => el.textContent.trim().substring(0, 30), btn);
        assert(
            heightDiff <= 2 && widthDiff <= 2,
            `Button "${label}" stable on hover`,
            `height delta=${heightDiff.toFixed(1)}px, width delta=${widthDiff.toFixed(1)}px`
        );
        tested++;

        // Move mouse away to reset
        await page.mouse.move(0, 0);
        await sleep(100);
    }

    if (tested === 0) {
        assert(false, 'Found buttons to test');
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST: Elements don't overflow their parent containers
// ═══════════════════════════════════════════════════════════════════════
async function testNoOverflow(page) {
    console.log('\n── Container Overflow Detection ──');

    const overflows = await page.evaluate(() => {
        const results = [];
        const containers = document.querySelectorAll('.card, .stat-card, .dashboard-donut-container, .ascii-donut-container, .dashboard-overview');

        containers.forEach(container => {
            const cRect = container.getBoundingClientRect();
            if (cRect.width === 0 || cRect.height === 0) return;

            for (const child of container.children) {
                const chRect = child.getBoundingClientRect();
                if (chRect.width === 0) continue;

                const overflowRight = chRect.right - cRect.right;
                const overflowBottom = chRect.bottom - cRect.bottom;

                if (overflowRight > 5 || overflowBottom > 5) {
                    results.push({
                        container: container.className.substring(0, 40),
                        child: child.className.substring(0, 40) || child.tagName,
                        overflowRight: Math.round(overflowRight),
                        overflowBottom: Math.round(overflowBottom)
                    });
                }
            }
        });
        return results;
    });

    if (overflows.length === 0) {
        assert(true, 'No child elements overflow their containers');
    } else {
        for (const o of overflows) {
            assert(false,
                `No overflow in .${o.container}`,
                `child .${o.child} overflows by ${o.overflowRight}px right, ${o.overflowBottom}px bottom`
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST: ASCII art boxes have consistent line widths
// ═══════════════════════════════════════════════════════════════════════
async function testAsciiBoxAlignment(page) {
    console.log('\n── ASCII Box Alignment ──');

    const results = await page.evaluate(() => {
        const pres = document.querySelectorAll('pre.ascii-donut');
        const issues = [];

        pres.forEach((pre, idx) => {
            // Get rendered text content (strips HTML tags)
            const text = pre.textContent;
            const lines = text.split('\n').filter(l => l.trim().length > 0);

            if (lines.length < 2) return;

            // Find lines that are ASCII box borders (start with ╔, ╠, ╚, ┌, └)
            const boxLines = lines.filter(l =>
                /^[╔╠╚┌└│║┗┃┏]/.test(l.trim())
            );

            if (boxLines.length < 2) return;

            // Check that all box lines have the same width
            const widths = boxLines.map(l => l.length);
            const maxWidth = Math.max(...widths);
            const minWidth = Math.min(...widths);

            if (maxWidth - minWidth > 2) {
                issues.push({
                    index: idx,
                    widths: widths.join(','),
                    maxWidth,
                    minWidth,
                    diff: maxWidth - minWidth
                });
            }
        });

        return issues;
    });

    if (results.length === 0) {
        assert(true, 'All ASCII boxes have consistent line widths');
    } else {
        for (const r of results) {
            assert(false,
                `ASCII box #${r.index} consistent width`,
                `line widths vary by ${r.diff} chars (${r.widths})`
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST: Dashboard grid layout integrity
// ═══════════════════════════════════════════════════════════════════════
async function testDashboardLayout(page) {
    console.log('\n── Dashboard Layout ──');

    // Check that dashboard-overview has 2 columns
    const layout = await page.evaluate(() => {
        const overview = document.querySelector('.dashboard-overview');
        if (!overview) return null;

        const style = window.getComputedStyle(overview);
        const rect = overview.getBoundingClientRect();
        // Get visible grid items (donut + stat cards via display:contents)
        const donut = overview.querySelector('.dashboard-donut-container');
        const firstStat = overview.querySelector('.stat-card');
        const donutRect = donut ? donut.getBoundingClientRect() : null;
        const statRect = firstStat ? firstStat.getBoundingClientRect() : null;
        const visibleItems = [donut, firstStat].filter(e => e && e.getBoundingClientRect().width > 0);

        return {
            display: style.display,
            gridTemplateColumns: style.gridTemplateColumns,
            width: Math.round(rect.width),
            childCount: visibleItems.length,
            childWidths: visibleItems.map(e => Math.round(e.getBoundingClientRect().width)),
            childTops: visibleItems.map(e => Math.round(e.getBoundingClientRect().top)),
            isSideBySide: donutRect && statRect &&
                Math.abs(donutRect.top - statRect.top) < 20
        };
    });

    if (!layout) {
        assert(false, 'Dashboard overview exists');
        return;
    }

    assert(layout.display === 'grid', 'Dashboard overview uses CSS grid');
    assert(layout.childCount >= 2, `Dashboard has ${layout.childCount} grid children`);

    if (layout.width > 700) {
        assert(layout.isSideBySide, 'Dashboard donut and stats are side by side',
            `tops: ${layout.childTops.join(', ')}`);
    }

    // Check stat cards don't overlap each other
    const statOverlap = await page.evaluate(() => {
        const cards = document.querySelectorAll('.stat-card');
        const rects = Array.from(cards).map(c => c.getBoundingClientRect());

        for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
                const a = rects[i];
                const b = rects[j];
                const overlap = !(a.right <= b.left || a.left >= b.right ||
                    a.bottom <= b.top || a.top >= b.bottom);
                if (overlap) return { i, j };
            }
        }
        return null;
    });

    assert(!statOverlap, 'Stat cards do not overlap each other',
        statOverlap ? `cards ${statOverlap.i} and ${statOverlap.j} overlap` : '');
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST: Navigation tabs are visible and non-overlapping
// ═══════════════════════════════════════════════════════════════════════
async function testNavigationIntegrity(page) {
    console.log('\n── Navigation Integrity ──');

    const navData = await page.evaluate(() => {
        const buttons = document.querySelectorAll('.nav-btn');
        const rects = Array.from(buttons).map(b => ({
            rect: b.getBoundingClientRect(),
            text: b.textContent.trim()
        }));

        // Check for overlaps
        const overlaps = [];
        for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
                const a = rects[i].rect;
                const b = rects[j].rect;
                const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
                const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
                if (overlapX > 3 && overlapY > 3) {
                    overlaps.push({ a: rects[i].text, b: rects[j].text, overlapX, overlapY });
                }
            }
        }

        return {
            count: buttons.length,
            allVisible: rects.every(r => r.rect.width > 0 && r.rect.height > 0),
            overlaps
        };
    });

    assert(navData.count >= 4, `Found ${navData.count} navigation buttons`);
    assert(navData.allVisible, 'All nav buttons are visible');
    assert(navData.overlaps.length === 0, 'Nav buttons don\'t overlap',
        navData.overlaps.map(o => `"${o.a}" and "${o.b}" overlap ${o.overlapX}x${o.overlapY}px`).join('; '));
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST: Page navigation works and pages render correctly
// ═══════════════════════════════════════════════════════════════════════
async function testPageNavigation(page) {
    console.log('\n── Page Navigation ──');

    const pages = ['dashboard', 'course', 'analyses', 'compare', 'workouts'];

    for (const pageName of pages) {
        const btn = await page.$(`[data-page="${pageName}"]`);
        if (!btn) {
            assert(false, `Nav button for ${pageName} exists`);
            continue;
        }

        await btn.click();
        await sleep(400);

        const isActive = await page.evaluate((name) => {
            const pageEl = document.getElementById(name);
            if (!pageEl) return false;
            const style = window.getComputedStyle(pageEl);
            return style.display !== 'none' && pageEl.classList.contains('active');
        }, pageName);

        assert(isActive, `Page "${pageName}" becomes visible on click`);
        await screenshot(page, `page-${pageName}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST: Responsive layout at different viewport widths
// ═══════════════════════════════════════════════════════════════════════
async function testResponsiveLayout(page) {
    console.log('\n── Responsive Layout ──');

    const widths = [1400, 1024, 768, 480];

    for (const w of widths) {
        await page.setViewport({ width: w, height: 900 });
        await sleep(300);

        // Go back to dashboard
        const dashBtn = await page.$('[data-page="dashboard"]');
        if (dashBtn) await dashBtn.click();
        await sleep(300);

        const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
        });

        assert(!hasHorizontalScroll, `No horizontal scroll at ${w}px`,
            hasHorizontalScroll ? `scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)}` : '');

        await screenshot(page, `responsive-${w}`);
    }

    // Reset viewport
    await page.setViewport({ width: 1400, height: 900 });
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST: Modals open/close without layout breakage
// ═══════════════════════════════════════════════════════════════════════
async function testModalIntegrity(page) {
    console.log('\n── Modal Integrity ──');

    // Navigate to analyses page
    const analysesBtn = await page.$('[data-page="analyses"]');
    if (analysesBtn) {
        await analysesBtn.click();
        await sleep(300);
    }

    // Try to open analysis modal
    const addBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('.btn, button'));
        return buttons.find(b => b.textContent.includes('Добавить вручную'));
    });

    if (addBtn) {
        await addBtn.click();
        await sleep(400);

        const modalVisible = await page.evaluate(() => {
            const modal = document.getElementById('analysis-modal');
            if (!modal) return false;
            return modal.style.display === 'flex' || modal.classList.contains('active') ||
                window.getComputedStyle(modal).display !== 'none';
        });

        assert(modalVisible, 'Analysis modal opens');

        if (modalVisible) {
            // Check modal doesn't overflow viewport
            const overflow = await page.evaluate(() => {
                const modal = document.querySelector('#analysis-modal .modal');
                if (!modal) return null;
                const rect = modal.getBoundingClientRect();
                return {
                    overflowRight: Math.max(0, rect.right - window.innerWidth),
                    overflowBottom: Math.max(0, rect.bottom - window.innerHeight),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                };
            });

            if (overflow) {
                assert(overflow.overflowRight <= 0, 'Modal doesn\'t overflow horizontally',
                    `overflow: ${overflow.overflowRight}px, modal width: ${overflow.width}px`);
            }

            await screenshot(page, 'modal-open');

            // Close modal
            const closeBtn = await page.$('#analysis-modal .modal-close');
            if (closeBtn) await closeBtn.click();
            await sleep(300);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════
async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  BloodTracker Visual Regression Tests    ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`\nTarget: ${BASE_URL}`);

    // Create screenshots directory
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    let browser;
    try {
        // Use system Chrome/Edge if Puppeteer's bundled Chrome not available
        const launchOptions = {
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
        };

        // Find system browser (required for puppeteer-core)
        const systemBrowsers = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ];
        for (const browserPath of systemBrowsers) {
            if (fs.existsSync(browserPath)) {
                launchOptions.executablePath = browserPath;
                break;
            }
        }
        if (!launchOptions.executablePath) {
            console.error('\x1b[31mERROR: No Chrome/Edge found. Install Chrome or set executablePath.\x1b[0m');
            process.exit(1);
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });

        // Check if app is running
        try {
            await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 });
        } catch (e) {
            console.error(`\n\x1b[31mERROR: Cannot connect to ${BASE_URL}\x1b[0m`);
            console.error('Make sure the app is running: cd src/BloodTracker.Api && dotnet run');
            process.exit(1);
        }

        // Wait for app to initialize
        await sleep(2000);
        await screenshot(page, 'initial-load');

        // Run all tests
        await testButtonHoverStability(page);
        await testNoOverflow(page);
        await testAsciiBoxAlignment(page);
        await testDashboardLayout(page);
        await testNavigationIntegrity(page);
        await testPageNavigation(page);
        await testResponsiveLayout(page);
        await testModalIntegrity(page);

    } catch (err) {
        console.error('\nUnexpected error:', err.message);
        failed++;
    } finally {
        if (browser) await browser.close();
    }

    // Summary
    console.log('\n══════════════════════════════════════════');
    console.log(`  Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m`);

    if (failures.length > 0) {
        console.log('\n  Failures:');
        failures.forEach((f, i) => {
            console.log(`    ${i + 1}. ${f.testName}${f.details ? ' — ' + f.details : ''}`);
        });
    }

    console.log(`\n  Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('══════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
}

main();
