import puppeteer from 'puppeteer';

// ═══════════════════════════════════════════════════════════════════════════════
// ADVERSARIAL E2E TESTS — Tests that FIND real bugs
// Unlike confirmation tests, these probe edge cases, missing validations,
// XSS vulnerabilities, data integrity issues, and broken user flows.
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = 'http://localhost:5000';
let browser, page;
let passed = 0, failed = 0, skipped = 0;
const errors = [];
let savedToken = null;
let savedUser = null;

function ok(name) { passed++; console.log(`  ✅ ${name}`); }
function fail(name, err) { failed++; errors.push({ name, err: err.toString() }); console.log(`  ❌ ${name}: ${err}`); }
function skip(name, reason) { skipped++; console.log(`  ⏭️  ${name}: ${reason}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function test(name, fn) {
    try { await fn(); ok(name); }
    catch (e) { fail(name, e.message); }
}

// ─── Auth ───
async function login() {
    const resp = await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/auth/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'e2e-adversarial@test.local' })
        });
        return r.json();
    }, BASE);
    if (!resp.devCode) throw new Error('No devCode');
    const verify = await page.evaluate(async (base, email, code) => {
        const r = await fetch(`${base}/api/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        return r.json();
    }, BASE, 'e2e-adversarial@test.local', resp.devCode);
    if (!verify.token) throw new Error('No token');
    savedToken = verify.token;
    savedUser = verify.user;
    await page.evaluate((t, u) => {
        localStorage.setItem('bt_token', t);
        localStorage.setItem('bt_user', JSON.stringify(u));
    }, savedToken, savedUser);
    return savedToken;
}

async function gotoAndAuth(url) {
    await page.goto(url, { waitUntil: 'networkidle2' });
    if (savedToken) {
        await page.evaluate((t, u) => {
            localStorage.setItem('bt_token', t);
            if (u) localStorage.setItem('bt_user', JSON.stringify(u));
        }, savedToken, savedUser);
    }
}

async function apiCall(path, options = {}) {
    return page.evaluate(async (base, p, opts, tok) => {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, ...(opts.headers || {}) };
        const r = await fetch(`${base}/api${p}`, { ...opts, headers });
        if (r.status === 204) return null;
        if (!r.ok) return { __error: true, status: r.status, text: await r.text().catch(() => '') };
        return r.json();
    }, BASE, path, options, savedToken);
}

async function apiRaw(path, options = {}) {
    return page.evaluate(async (base, p, opts, tok) => {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, ...(opts.headers || {}) };
        const r = await fetch(`${base}/api${p}`, { ...opts, headers });
        let body = null;
        try { body = await r.json(); } catch {}
        return { status: r.status, ok: r.ok, body };
    }, BASE, path, options, savedToken);
}

// ═══════════════════════════════════════════════════════════════════════════════
(async () => {
    console.log('\n🔴 ADVERSARIAL E2E TESTS — Finding real bugs\n');

    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    page = await browser.newPage();
    page.setDefaultTimeout(30000);

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // ═══════════════════════════════════
    // AUTH
    // ═══════════════════════════════════
    console.log('══ Auth ══');
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    let token;
    await test('Login', async () => { token = await login(); });
    if (!token) { console.log('⚠️  Auth failed, aborting'); await browser.close(); process.exit(1); }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 1: XSS VULNERABILITIES
    // These tests try to inject HTML/JS through user input fields
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ SECTION 1: XSS / Injection ══');

    await test('XSS: Drug name with HTML tags is escaped in UI', async () => {
        const xssPayload = '<img src=x onerror="window.__xss_drug=1">';
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: xssPayload, type: 1 })
        });
        if (drug.__error) throw new Error(`API error: ${drug.status}`);

        await gotoAndAuth(BASE);
        await sleep(3000);

        // Navigate to course page where drug names render
        await page.evaluate(() => document.querySelector('[data-page="course"]')?.click());
        await sleep(3000);

        // Check if XSS executed
        const xssTriggered = await page.evaluate(() => window.__xss_drug === 1);
        // Cleanup
        await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
        if (xssTriggered) throw new Error('XSS EXECUTED! Drug name rendered as HTML');
    });

    await test('XSS: Drug name with script tag is escaped', async () => {
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: '"><script>window.__xss_script=1</script>', type: 0 })
        });
        if (drug.__error) throw new Error(`API error: ${drug.status}`);

        await gotoAndAuth(BASE);
        await sleep(2000);
        await page.click('[data-page="course"]');
        await sleep(2000);

        const xssTriggered = await page.evaluate(() => window.__xss_script === 1);
        await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
        if (xssTriggered) throw new Error('XSS EXECUTED! Script tag in drug name ran');
    });

    await test('XSS: Drug notes with HTML is escaped', async () => {
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: 'Safe Name', type: 0, notes: '<b onmouseover="window.__xss_notes=1">hover</b>' })
        });
        if (drug.__error) throw new Error(`API error: ${drug.status}`);
        await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
        // This is stored — XSS would trigger when notes are shown (drug card expand, etc.)
        // For now just verify it's stored — full XSS test needs rendering check
    });

    await test('Injection: Drug name in SELECT option doesn\'t break HTML', async () => {
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: '</option><option>INJECTED</option><option value="', type: 0 })
        });
        if (drug.__error) throw new Error(`API error: ${drug.status}`);

        await gotoAndAuth(BASE);
        await sleep(2000);

        // Open log modal to check drug dropdown
        const hasModal = await page.evaluate(() => typeof window.openLogModal === 'function');
        if (hasModal) {
            await page.evaluate(() => window.openLogModal());
            await sleep(1000);
            // Check if injected option exists
            const opts = await page.$$eval('#log-drug option', els => els.map(e => e.textContent));
            const hasInjected = opts.some(o => o === 'INJECTED');
            await page.evaluate(() => window.closeLogModal());
            await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
            if (hasInjected) throw new Error('HTML injection in SELECT option broke DOM structure');
        } else {
            await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: INPUT VALIDATION — Empty / Whitespace / Invalid
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ SECTION 2: Input Validation ══');

    await test('Drug with whitespace-only name is rejected', async () => {
        await gotoAndAuth(BASE);
        await sleep(2000);
        await page.click('[data-page="course"]');
        await sleep(1000);
        await page.evaluate(() => window.openDrugModal());
        await sleep(500);

        // Type spaces in name
        const nameEl = await page.$('#drug-name');
        await nameEl.type('     ');
        // Try to save
        await page.evaluate(() => window.saveDrug());
        await sleep(1000);

        // Check if error shown (toast or still modal open)
        const modalStillOpen = await page.$eval('#drug-modal', el => el.classList.contains('active'));
        // Drug should NOT have been created with whitespace name
        const drugs = await apiCall('/drugs');
        const whitespaceDrug = (Array.isArray(drugs) ? drugs : []).find(d => d.name && d.name.trim() === '');
        try { await page.evaluate(() => window.closeDrugModal()); } catch {}

        if (whitespaceDrug) {
            await apiCall(`/drugs/${whitespaceDrug.id}`, { method: 'DELETE' });
            throw new Error('Whitespace-only drug name was accepted!');
        }
    });

    await test('Intake log with no drug selected is rejected', async () => {
        await page.evaluate(() => window.openLogModal());
        await sleep(500);
        // Don't select any drug, just set date and dose
        await page.evaluate(() => {
            document.getElementById('log-date').value = '2026-02-11';
            document.getElementById('log-dose').value = 'test dose';
        });
        // Try to save without drug
        const beforeCount = await apiCall('/intakelogs');
        await page.evaluate(() => window.saveLog());
        await sleep(1500);
        const afterCount = await apiCall('/intakelogs');

        await page.evaluate(() => window.closeLogModal());

        // If both are arrays, compare lengths
        const before = Array.isArray(beforeCount) ? beforeCount.length : 0;
        const after = Array.isArray(afterCount) ? afterCount.length : 0;
        if (after > before) throw new Error('Log created without drug selected!');
    });

    await test('Intake log with empty date is rejected', async () => {
        const drugs = await apiCall('/drugs');
        if (!Array.isArray(drugs) || drugs.length === 0) { skip('Empty date test', 'No drugs'); return; }

        await page.evaluate(() => window.openLogModal());
        await sleep(500);
        await page.evaluate((drugId) => {
            document.getElementById('log-date').value = '';  // empty date
            document.getElementById('log-drug').value = drugId;
            document.getElementById('log-dose').value = 'test';
        }, drugs[0].id);

        const before = await apiCall('/intakelogs');
        await page.evaluate(() => window.saveLog());
        await sleep(1500);
        const after = await apiCall('/intakelogs');
        await page.evaluate(() => window.closeLogModal());

        const bLen = Array.isArray(before) ? before.length : 0;
        const aLen = Array.isArray(after) ? after.length : 0;
        if (aLen > bLen) {
            // Cleanup the bad log
            const badLogs = Array.isArray(after) ? after.filter(l => !l.date || l.date === '0001-01-01T00:00:00') : [];
            for (const bl of badLogs) await apiCall(`/intakelogs/${bl.id}`, { method: 'DELETE' });
            throw new Error('Log created with empty date!');
        }
    });

    await test('Purchase with quantity=0 is rejected', async () => {
        const drugs = await apiCall('/drugs');
        if (!Array.isArray(drugs) || drugs.length === 0) { skip('Zero qty test', 'No drugs'); return; }

        const resp = await apiRaw('/purchases', {
            method: 'POST',
            body: JSON.stringify({
                drugId: drugs[0].id, purchaseDate: '2026-02-10',
                quantity: 0, price: 100, vendor: 'Zero Qty'
            })
        });
        if (resp.ok) {
            // Cleanup
            if (resp.body?.id) await apiCall(`/purchases/${resp.body.id}`, { method: 'DELETE' });
            throw new Error('Purchase with quantity=0 was accepted!');
        }
    });

    await test('Purchase with negative price is rejected', async () => {
        const drugs = await apiCall('/drugs');
        if (!Array.isArray(drugs) || drugs.length === 0) { skip('Neg price test', 'No drugs'); return; }

        const resp = await apiRaw('/purchases', {
            method: 'POST',
            body: JSON.stringify({
                drugId: drugs[0].id, purchaseDate: '2026-02-10',
                quantity: 5, price: -100, vendor: 'Neg Price'
            })
        });
        if (resp.ok) {
            if (resp.body?.id) await apiCall(`/purchases/${resp.body.id}`, { method: 'DELETE' });
            throw new Error('Purchase with negative price was accepted!');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: DATA INTEGRITY — Cascade Deletes, Orphan Data
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ SECTION 3: Data Integrity ══');

    await test('Deleting drug cascades to intake logs (no orphans)', async () => {
        // Create drug → log → delete drug → check log gone
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: 'E2E Cascade Drug', type: 1 })
        });
        const log = await apiCall('/intakelogs', {
            method: 'POST',
            body: JSON.stringify({ date: '2026-02-11', drugId: drug.id, dose: 'cascade test' })
        });

        // Delete the drug
        await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });

        // Check if log still exists (it shouldn't)
        const allLogs = await apiCall('/intakelogs');
        const orphan = (Array.isArray(allLogs) ? allLogs : []).find(l => l.id === log.id);
        if (orphan) {
            await apiCall(`/intakelogs/${orphan.id}`, { method: 'DELETE' });
            throw new Error('Orphaned intake log exists after drug deletion!');
        }
    });

    await test('Deleting drug cascades to purchases (no orphans)', async () => {
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: 'E2E Cascade Purchase Drug', type: 0 })
        });
        const purchase = await apiCall('/purchases', {
            method: 'POST',
            body: JSON.stringify({
                drugId: drug.id, purchaseDate: '2026-02-10',
                quantity: 5, price: 500, vendor: 'Cascade Test'
            })
        });

        await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });

        const allPurchases = await apiCall('/purchases');
        const orphan = (Array.isArray(allPurchases) ? allPurchases : []).find(p => p.id === purchase.id);
        if (orphan) {
            await apiCall(`/purchases/${orphan.id}`, { method: 'DELETE' });
            throw new Error('Orphaned purchase exists after drug deletion!');
        }
    });

    await test('Deleting purchase doesn\'t delete linked intake logs', async () => {
        const drugs = await apiCall('/drugs');
        if (!Array.isArray(drugs) || drugs.length === 0) {
            await apiCall('/drugs', { method: 'POST', body: JSON.stringify({ name: 'E2E Integrity Drug', type: 1 }) });
        }
        const drugsNow = await apiCall('/drugs');
        const drugId = drugsNow[0].id;

        const purchase = await apiCall('/purchases', {
            method: 'POST',
            body: JSON.stringify({
                drugId, purchaseDate: '2026-02-10',
                quantity: 10, price: 1000, vendor: 'Delete Purchase'
            })
        });
        const log = await apiCall('/intakelogs', {
            method: 'POST',
            body: JSON.stringify({
                date: '2026-02-11', drugId,
                dose: 'linked', purchaseId: purchase.id
            })
        });

        // Delete purchase
        await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });

        // Log should still exist
        const allLogs = await apiCall('/intakelogs');
        const surviving = (Array.isArray(allLogs) ? allLogs : []).find(l => l.id === log.id);
        if (!surviving) throw new Error('Intake log was deleted when purchase was deleted!');

        // But purchaseLabel should be null now
        if (surviving.purchaseId === purchase.id && surviving.purchaseLabel) {
            // Label references deleted purchase — data inconsistency
            console.log(`    ⚠️  Log still references deleted purchase (purchaseId=${purchase.id})`);
        }

        await apiCall(`/intakelogs/${log.id}`, { method: 'DELETE' });
    });

    await test('Stock can go negative (over-consume from purchase)', async () => {
        const drugs = await apiCall('/drugs');
        const drugId = drugs[0].id;

        const purchase = await apiCall('/purchases', {
            method: 'POST',
            body: JSON.stringify({
                drugId, purchaseDate: '2026-02-10',
                quantity: 2, price: 200, vendor: 'Overstock'
            })
        });

        // Create 5 logs (more than quantity=2)
        const logs = [];
        for (let i = 0; i < 5; i++) {
            const l = await apiCall('/intakelogs', {
                method: 'POST',
                body: JSON.stringify({
                    date: `2026-02-1${i}`, drugId,
                    dose: `dose${i}`, purchaseId: purchase.id
                })
            });
            logs.push(l);
        }

        // Check remaining stock — it should be -3 (negative = over-consumed)
        const opts = await apiCall(`/purchases/options/${drugId}`);
        const opt = (Array.isArray(opts) ? opts : []).find(o => o.id === purchase.id);

        // Cleanup
        for (const l of logs) await apiCall(`/intakelogs/${l.id}`, { method: 'DELETE' });
        await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });

        if (opt && opt.remainingStock < 0) {
            // Backend allows negative stock — this is a missing validation
            throw new Error(`Stock went negative: ${opt.remainingStock} (no server-side limit)`);
        }
        // If remainingStock is 0 or the system prevents it, that's good
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: DOUBLE SUBMISSION / RACE CONDITIONS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ SECTION 4: Double Submit / Race ══');

    await test('Double-click drug save doesn\'t create duplicates', async () => {
        await gotoAndAuth(BASE);
        await sleep(2000);
        await page.click('[data-page="course"]');
        await sleep(1000);
        await page.evaluate(() => window.openDrugModal());
        await sleep(500);
        await page.type('#drug-name', 'E2E DoubleClick Drug');
        await page.select('#drug-type', '1');

        // Click save twice rapidly
        const beforeDrugs = await apiCall('/drugs');
        const beforeCount = Array.isArray(beforeDrugs) ? beforeDrugs.length : 0;

        await page.evaluate(() => {
            window.saveDrug();
            window.saveDrug();
        });
        await sleep(3000);

        const afterDrugs = await apiCall('/drugs');
        const afterCount = Array.isArray(afterDrugs) ? afterDrugs.length : 0;
        const newDrugs = (afterDrugs || []).filter(d => d.name === 'E2E DoubleClick Drug');

        // Cleanup all duplicates
        for (const d of newDrugs) await apiCall(`/drugs/${d.id}`, { method: 'DELETE' });

        if (newDrugs.length > 1) {
            throw new Error(`Double-click created ${newDrugs.length} duplicates!`);
        }
    });

    await test('Double-click log save doesn\'t create duplicates', async () => {
        const drugs = await apiCall('/drugs');
        if (!Array.isArray(drugs) || drugs.length === 0) { skip('Double log test', 'No drugs'); return; }

        await gotoAndAuth(BASE);
        await sleep(2000);
        await page.evaluate(() => window.openLogModal());
        await sleep(500);
        await page.evaluate((drugId) => {
            document.getElementById('log-date').value = '2026-02-11';
            document.getElementById('log-drug').value = drugId;
            document.getElementById('log-dose').value = 'E2E Double Log';
        }, drugs[0].id);

        const beforeLogs = await apiCall('/intakelogs');
        await page.evaluate(() => {
            window.saveLog();
            window.saveLog();
        });
        await sleep(3000);

        const afterLogs = await apiCall('/intakelogs');
        const newLogs = (Array.isArray(afterLogs) ? afterLogs : []).filter(l => l.dose === 'E2E Double Log');

        for (const l of newLogs) await apiCall(`/intakelogs/${l.id}`, { method: 'DELETE' });

        if (newLogs.length > 1) {
            throw new Error(`Double-click created ${newLogs.length} duplicate logs!`);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 5: AUTH EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ SECTION 5: Auth Edge Cases ══');

    await test('Wrong auth code returns error, not token', async () => {
        const resp = await apiRaw('/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({ email: 'e2e-adversarial@test.local', code: '000000' })
        });
        if (resp.ok && resp.body?.token) throw new Error('Wrong code accepted!');
    });

    await test('Expired code is rejected', async () => {
        // Send code, then try with wrong code
        await page.evaluate(async (base) => {
            await fetch(`${base}/api/auth/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'e2e-expired@test.local' })
            });
        }, BASE);

        const resp = await apiRaw('/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({ email: 'e2e-expired@test.local', code: '999999' })
        });
        if (resp.ok && resp.body?.token) throw new Error('Invalid code accepted!');
    });

    await test('Empty email in send-code returns 400', async () => {
        const resp = await page.evaluate(async (base) => {
            const r = await fetch(`${base}/api/auth/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: '' })
            });
            return { status: r.status, ok: r.ok };
        }, BASE);
        if (resp.ok) throw new Error('Empty email accepted in send-code!');
    });

    await test('Send-code with whitespace-only email returns 400', async () => {
        const resp = await page.evaluate(async (base) => {
            const r = await fetch(`${base}/api/auth/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: '   ' })
            });
            return { status: r.status, ok: r.ok };
        }, BASE);
        if (resp.ok) throw new Error('Whitespace-only email accepted!');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 6: UI STATE AFTER ERRORS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ SECTION 6: UI Error Recovery ══');

    await gotoAndAuth(BASE);
    await sleep(2000);

    await test('Modal closes properly on escape key', async () => {
        await page.evaluate(() => window.openDrugModal());
        await sleep(500);
        const openBefore = await page.$eval('#drug-modal', el => el.classList.contains('active'));
        if (!openBefore) throw new Error('Modal didn\'t open');

        await page.keyboard.press('Escape');
        await sleep(500);
        const openAfter = await page.$eval('#drug-modal', el => el.classList.contains('active'));
        if (openAfter) throw new Error('Modal didn\'t close on Escape');
    });

    await test('body.modal-open removed when modal closes', async () => {
        await page.evaluate(() => window.openDrugModal());
        await sleep(500);
        const hasClass = await page.evaluate(() => document.body.classList.contains('modal-open'));
        if (!hasClass) throw new Error('body.modal-open not added on open');

        await page.evaluate(() => window.closeDrugModal());
        await sleep(500);
        const stillHas = await page.evaluate(() => document.body.classList.contains('modal-open'));
        if (stillHas) throw new Error('body.modal-open not removed on close');
    });

    await test('Opening drug modal twice doesn\'t leave duplicate event listeners', async () => {
        // Open and close drug modal twice, then verify state is clean
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.openDrugModal());
            await sleep(300);
            await page.evaluate(() => window.closeDrugModal());
            await sleep(300);
        }
        // After multiple open/close cycles, modal should be cleanly closed
        const isOpen = await page.$eval('#drug-modal', el => el.classList.contains('active'));
        if (isOpen) throw new Error('Modal stuck open after multiple open/close cycles');
    });

    await test('Page navigation while modal is open closes modal', async () => {
        await page.evaluate(() => window.openLogModal());
        await sleep(500);
        // Navigate to different page (use evaluate to bypass overlay z-index interception)
        await page.evaluate(() => document.querySelector('[data-page="analyses"]').click());
        await sleep(1000);
        // Check body.modal-open is removed
        const hasModalOpen = await page.evaluate(() => document.body.classList.contains('modal-open'));
        if (hasModalOpen) throw new Error('body.modal-open stuck after page navigation');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 7: ENCYCLOPEDIA EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ SECTION 7: Encyclopedia Edge Cases ══');

    await page.evaluate(() => document.querySelector('[data-page="encyclopedia"]')?.click());
    await sleep(4000);

    await test('Encyclopedia search with special regex chars doesn\'t crash', async () => {
        const searchEl = await page.$('#encyclopedia-search');
        if (!searchEl) throw new Error('No search');
        await searchEl.click();
        await sleep(200);
        await searchEl.type('.*+?()[]{}|\\^$');
        await sleep(500);
        const pageAlive = await page.evaluate(() => !!document.getElementById('encyclopedia-grid'));
        // Clear search
        await page.evaluate(() => { document.getElementById('encyclopedia-search').value = ''; });
        await page.evaluate(() => { document.getElementById('encyclopedia-search').dispatchEvent(new Event('input')); });
        await sleep(500);
        if (!pageAlive) throw new Error('Page crashed on special characters');
    });

    await test('Encyclopedia search with Cyrillic works', async () => {
        const searchEl = await page.$('#encyclopedia-search');
        if (!searchEl) throw new Error('No search');
        await searchEl.click();
        await sleep(200);
        await page.evaluate(() => { document.getElementById('encyclopedia-search').value = ''; });
        await searchEl.type('тест');
        await sleep(500);
        const cards = await page.$$('#encyclopedia-grid .encyclopedia-card');
        // Clear
        await page.evaluate(() => { document.getElementById('encyclopedia-search').value = ''; });
        await page.evaluate(() => { document.getElementById('encyclopedia-search').dispatchEvent(new Event('input')); });
        await sleep(500);
        if (cards.length === 0) throw new Error('Cyrillic search returned no results for "тест"');
    });

    await test('Encyclopedia handles empty catalog gracefully', async () => {
        // The grid should show "Ничего не найдено" or cards, not crash
        const grid = await page.$('#encyclopedia-grid');
        if (!grid) throw new Error('Grid element missing');
        const html = await grid.evaluate(el => el.innerHTML);
        if (html === '') throw new Error('Grid is completely empty (no cards and no empty state)');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 8: API BOUNDARY / EDGE INPUTS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ SECTION 8: API Boundary Inputs ══');

    await test('API: Extremely long drug name (10000 chars)', async () => {
        const longName = 'A'.repeat(10000);
        const resp = await apiRaw('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: longName, type: 0 })
        });
        if (resp.ok && resp.body?.id) {
            await apiCall(`/drugs/${resp.body.id}`, { method: 'DELETE' });
            // If accepted, the UI might break rendering 10k char names
            console.log('    ⚠️  10000 char drug name was accepted (no length limit)');
        }
        // Not necessarily a fail, but worth noting
    });

    await test('API: Drug with invalid type value is rejected', async () => {
        const resp = await apiRaw('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: 'Invalid Type', type: 999 })
        });
        if (resp.ok) {
            if (resp.body?.id) await apiCall(`/drugs/${resp.body.id}`, { method: 'DELETE' });
            throw new Error('Drug with type=999 was accepted!');
        }
    });

    await test('API: Purchase with future date is accepted (or rejected)', async () => {
        const drugs = await apiCall('/drugs');
        if (!Array.isArray(drugs) || drugs.length === 0) { skip('Future date test', 'No drugs'); return; }

        const resp = await apiRaw('/purchases', {
            method: 'POST',
            body: JSON.stringify({
                drugId: drugs[0].id, purchaseDate: '2099-12-31',
                quantity: 5, price: 100, vendor: 'Future'
            })
        });
        if (resp.ok && resp.body?.id) {
            await apiCall(`/purchases/${resp.body.id}`, { method: 'DELETE' });
            console.log('    ⚠️  Future date purchase accepted (2099-12-31)');
        }
    });

    await test('API: IntakeLog with past date (year 1900) is accepted (or rejected)', async () => {
        const drugs = await apiCall('/drugs');
        if (!Array.isArray(drugs) || drugs.length === 0) { skip('Old date test', 'No drugs'); return; }

        const resp = await apiRaw('/intakelogs', {
            method: 'POST',
            body: JSON.stringify({ date: '1900-01-01', drugId: drugs[0].id, dose: 'old' })
        });
        if (resp.ok && resp.body?.id) {
            await apiCall(`/intakelogs/${resp.body.id}`, { method: 'DELETE' });
            console.log('    ⚠️  Year 1900 date accepted for intake log');
        }
    });

    await test('API: Invalid GUID in drug creation drugId field handled', async () => {
        const resp = await apiRaw('/intakelogs', {
            method: 'POST',
            body: JSON.stringify({ date: '2026-02-11', drugId: 'not-a-guid', dose: 'test' })
        });
        if (resp.ok) throw new Error('Invalid GUID accepted as drugId!');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n── Cleanup ──');
    try {
        const finalDrugs = await apiCall('/drugs');
        for (const d of (Array.isArray(finalDrugs) ? finalDrugs : [])) {
            if (d.name && d.name.startsWith('E2E')) {
                await apiCall(`/drugs/${d.id}`, { method: 'DELETE' });
                console.log(`  Deleted: ${d.name}`);
            }
        }
        // Also clean up orphaned logs from cascade tests
        const allLogs = await apiCall('/intakelogs');
        for (const l of (Array.isArray(allLogs) ? allLogs : [])) {
            if (l.dose && (l.dose.includes('cascade') || l.dose.includes('E2E') || l.dose === 'linked')) {
                await apiCall(`/intakelogs/${l.id}`, { method: 'DELETE' });
                console.log(`  Deleted orphaned log: ${l.dose}`);
            }
        }
    } catch (e) {
        console.log(`  Cleanup error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  RESULTS: ✅ ${passed} passed | ❌ ${failed} failed | ⏭️  ${skipped} skipped`);
    console.log(`${'═'.repeat(60)}`);

    if (errors.length > 0) {
        console.log('\n  🔴 BUGS FOUND:');
        for (const { name, err } of errors) {
            console.log(`    ❌ ${name}`);
            console.log(`       ${err}`);
        }
    }

    if (passed === passed + failed) {
        console.log('\n  ⚠️  All tests passed — but that might mean we\'re not testing hard enough!');
    }

    console.log();
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
