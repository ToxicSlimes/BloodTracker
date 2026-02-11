import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5000';
let browser, page;
let passed = 0, failed = 0, skipped = 0;
const errors = [];
let savedToken = null;
let savedUser = null;

// Track all created analysis IDs for cleanup
const createdAnalysisIds = [];

function ok(name) { passed++; console.log(`  \u2705 ${name}`); }
function fail(name, err) { failed++; errors.push({ name, err: err.toString() }); console.log(`  \u274c ${name}: ${err}`); }
function skip(name, reason) { skipped++; console.log(`  \u23ed\ufe0f  ${name}: ${reason}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function test(name, fn) {
    try { await fn(); ok(name); }
    catch (e) { fail(name, e.message); }
}

async function login() {
    const resp = await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/auth/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'e2e-analyses@test.local' })
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
    }, BASE, 'e2e-analyses@test.local', resp.devCode);
    if (!verify.token) throw new Error('No token');
    savedToken = verify.token;
    savedUser = verify.user;
    await page.evaluate((t, u) => {
        localStorage.setItem('bt_token', t);
        localStorage.setItem('bt_user', JSON.stringify(u));
    }, savedToken, savedUser);
    return savedToken;
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

// Helper: create an analysis and track its ID for cleanup
async function createAnalysis(data) {
    const result = await apiCall('/analyses', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (result && !result.__error && result.id) {
        createdAnalysisIds.push(result.id);
    }
    return result;
}

(async () => {
    console.log('\n\ud83d\udd2c ANALYSES E2E TESTS\n');

    browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // =============================================================================
    // AUTH
    // =============================================================================
    console.log('\u2550\u2550 Auth \u2550\u2550');
    await page.goto(BASE, { waitUntil: 'networkidle2' });

    await test('Login via email code', async () => {
        await login();
        if (!savedToken) throw new Error('Token not saved');
    });

    if (!savedToken) {
        console.log('\n  FATAL: Cannot authenticate. Aborting tests.\n');
        await browser.close();
        process.exit(1);
    }

    // =============================================================================
    // SECTION 1: CRUD Operations
    // =============================================================================
    console.log('\n\u2550\u2550 Section 1: CRUD Operations \u2550\u2550');

    let firstAnalysisId = null;

    await test('1. Create analysis with values', async () => {
        const data = {
            date: '2026-01-15T00:00:00Z',
            label: 'E2E Test Analysis #1',
            laboratory: 'E2E Lab',
            notes: 'Created by E2E test suite',
            values: { testosterone: 25.5, hemoglobin: 150, alt: 35 }
        };
        const result = await createAnalysis(data);
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        if (!result.id) throw new Error('No ID returned');
        if (result.label !== 'E2E Test Analysis #1') throw new Error(`Label mismatch: ${result.label}`);
        if (!result.values || result.values.testosterone !== 25.5) throw new Error('Values not stored correctly');
        if (result.values.hemoglobin !== 150) throw new Error(`Hemoglobin mismatch: ${result.values.hemoglobin}`);
        firstAnalysisId = result.id;
    });

    await test('2. Get analysis by ID', async () => {
        if (!firstAnalysisId) throw new Error('No analysis created in test 1');
        const result = await apiCall(`/analyses/${firstAnalysisId}`);
        if (result.__error) throw new Error(`API error ${result.status}`);
        if (result.id !== firstAnalysisId) throw new Error('ID mismatch');
        if (result.label !== 'E2E Test Analysis #1') throw new Error(`Label mismatch: ${result.label}`);
        if (result.laboratory !== 'E2E Lab') throw new Error(`Lab mismatch: ${result.laboratory}`);
        if (result.notes !== 'Created by E2E test suite') throw new Error(`Notes mismatch: ${result.notes}`);
        if (result.values.testosterone !== 25.5) throw new Error('Testosterone value mismatch');
    });

    await test('3. List all analyses includes created one', async () => {
        const list = await apiCall('/analyses');
        if (list.__error) throw new Error(`API error ${list.status}`);
        if (!Array.isArray(list)) throw new Error('Not an array');
        const found = list.find(a => a.id === firstAnalysisId);
        if (!found) throw new Error('Created analysis not found in list');
    });

    await test('4. Update analysis (change label, add values)', async () => {
        if (!firstAnalysisId) throw new Error('No analysis to update');
        const updateData = {
            id: firstAnalysisId,
            date: '2026-01-15T00:00:00Z',
            label: 'E2E Test Analysis #1 UPDATED',
            laboratory: 'E2E Lab Updated',
            notes: 'Updated by E2E test',
            values: { testosterone: 28.0, hemoglobin: 155, alt: 40, creatinine: 90 }
        };
        const result = await apiCall(`/analyses/${firstAnalysisId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        if (result.label !== 'E2E Test Analysis #1 UPDATED') throw new Error(`Label not updated: ${result.label}`);
        if (result.values.creatinine !== 90) throw new Error('New value creatinine not stored');
        if (result.values.testosterone !== 28.0) throw new Error('Testosterone not updated');

        // Verify persistence via GET
        const fetched = await apiCall(`/analyses/${firstAnalysisId}`);
        if (fetched.label !== 'E2E Test Analysis #1 UPDATED') throw new Error('Update did not persist');
    });

    let deleteTargetId = null;

    await test('5. Delete analysis returns 204, then GET returns 404', async () => {
        // Create a throwaway analysis to delete
        const temp = await createAnalysis({
            date: '2026-01-10T00:00:00Z',
            label: 'E2E Delete Target',
            values: { glucose: 5.0 }
        });
        if (temp.__error) throw new Error(`Create failed: ${temp.status}`);
        deleteTargetId = temp.id;

        // Delete
        const delRaw = await apiRaw(`/analyses/${deleteTargetId}`, { method: 'DELETE' });
        if (delRaw.status !== 204) throw new Error(`Expected 204, got ${delRaw.status}`);

        // Remove from tracking since already deleted
        const idx = createdAnalysisIds.indexOf(deleteTargetId);
        if (idx !== -1) createdAnalysisIds.splice(idx, 1);

        // Verify 404
        const getRaw = await apiRaw(`/analyses/${deleteTargetId}`);
        if (getRaw.status !== 404) throw new Error(`Expected 404 after delete, got ${getRaw.status}`);
    });

    await test('6. Create analysis with empty values dict', async () => {
        const result = await createAnalysis({
            date: '2026-01-12T00:00:00Z',
            label: 'E2E Empty Values',
            values: {}
        });
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        if (!result.id) throw new Error('No ID returned');
        // Values should be empty object
        const keys = Object.keys(result.values || {});
        if (keys.length !== 0) throw new Error(`Expected 0 values, got ${keys.length}`);
    });

    await test('7. Create analysis with only label and date (minimal)', async () => {
        const result = await createAnalysis({
            date: '2026-01-11T00:00:00Z',
            label: 'E2E Minimal'
        });
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        if (!result.id) throw new Error('No ID returned');
        if (result.label !== 'E2E Minimal') throw new Error(`Label mismatch: ${result.label}`);
    });

    await test('8. Get non-existent analysis (random GUID) returns 404', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const raw = await apiRaw(`/analyses/${fakeId}`);
        if (raw.status !== 404) throw new Error(`Expected 404, got ${raw.status}`);
    });

    // =============================================================================
    // SECTION 2: Analysis Values & Reference Ranges
    // =============================================================================
    console.log('\n\u2550\u2550 Section 2: Values & Reference Ranges \u2550\u2550');

    let analysisWithKnownParams = null;

    await test('9. Create analysis with known parameters (testosterone, hemoglobin)', async () => {
        const result = await createAnalysis({
            date: '2026-02-01T00:00:00Z',
            label: 'E2E Known Params',
            values: {
                testosterone: 20.0,
                hemoglobin: 145,
                hematocrit: 44,
                alt: 25,
                ast: 30,
                creatinine: 80,
                glucose: 5.2,
                cholesterol: 4.5
            }
        });
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        if (result.values.testosterone !== 20.0) throw new Error('Testosterone not stored');
        if (result.values.hemoglobin !== 145) throw new Error('Hemoglobin not stored');
        if (result.values.cholesterol !== 4.5) throw new Error('Cholesterol not stored');
        analysisWithKnownParams = result;
    });

    await test('10. Get alerts for analysis with out-of-range values', async () => {
        // Create analysis with out-of-range values
        // testosterone ref: 8.33-30.19; hemoglobin ref: 130-170; alt ref: 0-50
        const outOfRange = await createAnalysis({
            date: '2026-02-02T00:00:00Z',
            label: 'E2E Out of Range',
            values: {
                testosterone: 5.0,   // Low (ref 8.33-30.19)
                hemoglobin: 180,     // High (ref 130-170)
                alt: 25              // Normal (ref 0-50)
            }
        });
        if (outOfRange.__error) throw new Error(`Create failed: ${outOfRange.status}`);

        const alerts = await apiCall(`/analyses/${outOfRange.id}/alerts`);
        if (alerts.__error) throw new Error(`Alerts API error: ${alerts.status}`);
        if (!Array.isArray(alerts)) throw new Error('Alerts not an array');
        // Should have alerts for testosterone (low) and hemoglobin (high), but NOT alt (normal)
        if (alerts.length < 2) throw new Error(`Expected at least 2 alerts, got ${alerts.length}`);
        const testosteroneAlert = alerts.find(a => a.key === 'testosterone');
        if (!testosteroneAlert) throw new Error('No testosterone alert');
        // ValueStatus: 0=Normal, 1=Low, 2=SlightlyHigh, 3=High
        if (testosteroneAlert.status !== 1) throw new Error(`Expected Low (1), got ${testosteroneAlert.status}`);
        const hemoglobinAlert = alerts.find(a => a.key === 'hemoglobin');
        if (!hemoglobinAlert) throw new Error('No hemoglobin alert');
        const altAlert = alerts.find(a => a.key === 'alt');
        if (altAlert) throw new Error('alt should NOT have alert (it is normal)');
    });

    await test('11. Get alerts for analysis with all-normal values', async () => {
        if (!analysisWithKnownParams) throw new Error('No analysis from test 9');
        const alerts = await apiCall(`/analyses/${analysisWithKnownParams.id}/alerts`);
        if (alerts.__error) throw new Error(`Alerts API error: ${alerts.status}`);
        if (!Array.isArray(alerts)) throw new Error('Alerts not an array');
        // All values in test 9 are within normal range, so alerts should be empty
        if (alerts.length !== 0) throw new Error(`Expected 0 alerts for normal values, got ${alerts.length}: ${JSON.stringify(alerts.map(a => a.key))}`);
    });

    await test('12. Get reference ranges returns non-empty array', async () => {
        const ranges = await apiCall('/referenceranges');
        if (ranges.__error) throw new Error(`API error: ${ranges.status}`);
        if (!Array.isArray(ranges)) throw new Error('Not an array');
        if (ranges.length < 10) throw new Error(`Expected 10+ ranges, got ${ranges.length}`);
        // Check structure
        const first = ranges[0];
        if (!first.key) throw new Error('Missing key');
        if (!first.name) throw new Error('Missing name');
        if (first.min === undefined) throw new Error('Missing min');
        if (first.max === undefined) throw new Error('Missing max');
        if (!first.unit && first.unit !== '') throw new Error('Missing unit');
    });

    await test('13. Reference ranges include testosterone and hemoglobin', async () => {
        const ranges = await apiCall('/referenceranges');
        if (ranges.__error) throw new Error(`API error: ${ranges.status}`);
        const keys = ranges.map(r => r.key);
        if (!keys.includes('testosterone')) throw new Error('Missing testosterone');
        if (!keys.includes('hemoglobin')) throw new Error('Missing hemoglobin');
        if (!keys.includes('alt')) throw new Error('Missing alt');
        if (!keys.includes('cholesterol')) throw new Error('Missing cholesterol');
    });

    // =============================================================================
    // SECTION 3: Comparison
    // =============================================================================
    console.log('\n\u2550\u2550 Section 3: Comparison \u2550\u2550');

    let beforeAnalysisId = null;
    let afterAnalysisId = null;

    await test('14. Compare two analyses with same parameters returns deltas', async () => {
        const before = await createAnalysis({
            date: '2026-01-01T00:00:00Z',
            label: 'E2E Compare Before',
            values: { testosterone: 10.0, hemoglobin: 140, alt: 30 }
        });
        if (before.__error) throw new Error(`Create before failed: ${before.status}`);
        beforeAnalysisId = before.id;

        const after = await createAnalysis({
            date: '2026-02-01T00:00:00Z',
            label: 'E2E Compare After',
            values: { testosterone: 20.0, hemoglobin: 150, alt: 25 }
        });
        if (after.__error) throw new Error(`Create after failed: ${after.status}`);
        afterAnalysisId = after.id;

        const compare = await apiCall(`/analyses/compare?beforeId=${beforeAnalysisId}&afterId=${afterAnalysisId}`);
        if (compare.__error) throw new Error(`Compare API error: ${compare.status}`);
        if (!compare.before) throw new Error('Missing before');
        if (!compare.after) throw new Error('Missing after');
        if (!Array.isArray(compare.comparisons)) throw new Error('Comparisons not an array');
        if (compare.comparisons.length === 0) throw new Error('No comparisons returned');
        // Check that we have comparison items for our known parameters
        const testComp = compare.comparisons.find(c => c.key === 'testosterone');
        if (!testComp) throw new Error('No testosterone comparison');
        if (testComp.beforeValue !== 10.0) throw new Error(`Before value wrong: ${testComp.beforeValue}`);
        if (testComp.afterValue !== 20.0) throw new Error(`After value wrong: ${testComp.afterValue}`);
    });

    await test('15. Compare deltaPercent is calculated correctly (10->20 = +100%)', async () => {
        if (!beforeAnalysisId || !afterAnalysisId) throw new Error('Need analyses from test 14');
        const compare = await apiCall(`/analyses/compare?beforeId=${beforeAnalysisId}&afterId=${afterAnalysisId}`);
        if (compare.__error) throw new Error(`Compare API error: ${compare.status}`);
        const testComp = compare.comparisons.find(c => c.key === 'testosterone');
        if (!testComp) throw new Error('No testosterone comparison');
        // 10 -> 20 = ((20-10)/10) * 100 = 100%
        if (Math.abs(testComp.deltaPercent - 100) > 0.01) throw new Error(`Expected 100%, got ${testComp.deltaPercent}%`);
    });

    await test('16. Compare with non-existent beforeId returns 404', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000001';
        const raw = await apiRaw(`/analyses/compare?beforeId=${fakeId}&afterId=${afterAnalysisId}`);
        if (raw.status !== 404) throw new Error(`Expected 404, got ${raw.status}`);
    });

    await test('17. Compare analyses with different parameter sets', async () => {
        const a1 = await createAnalysis({
            date: '2026-03-01T00:00:00Z',
            label: 'E2E Diff Params A',
            values: { testosterone: 15.0, glucose: 5.0 }
        });
        if (a1.__error) throw new Error(`Create a1 failed: ${a1.status}`);

        const a2 = await createAnalysis({
            date: '2026-03-15T00:00:00Z',
            label: 'E2E Diff Params B',
            values: { testosterone: 18.0, hemoglobin: 145 }
        });
        if (a2.__error) throw new Error(`Create a2 failed: ${a2.status}`);

        const compare = await apiCall(`/analyses/compare?beforeId=${a1.id}&afterId=${a2.id}`);
        if (compare.__error) throw new Error(`Compare API error: ${compare.status}`);
        // Testosterone is in both, so should have a comparison
        const testComp = compare.comparisons.find(c => c.key === 'testosterone');
        if (!testComp) throw new Error('No testosterone comparison');
        if (testComp.beforeValue !== 15.0) throw new Error(`Before wrong: ${testComp.beforeValue}`);
        if (testComp.afterValue !== 18.0) throw new Error(`After wrong: ${testComp.afterValue}`);

        // glucose is only in before -> afterValue should be null (value=0 in map, handler returns null when 0)
        const glucoseComp = compare.comparisons.find(c => c.key === 'glucose');
        if (glucoseComp) {
            // If present, afterValue should be null
            if (glucoseComp.afterValue !== null) throw new Error(`Glucose afterValue should be null, got ${glucoseComp.afterValue}`);
        }

        // hemoglobin is only in after -> beforeValue should be null
        const hemoComp = compare.comparisons.find(c => c.key === 'hemoglobin');
        if (hemoComp) {
            if (hemoComp.beforeValue !== null) throw new Error(`Hemoglobin beforeValue should be null, got ${hemoComp.beforeValue}`);
        }
    });

    // =============================================================================
    // SECTION 4: PDF Import
    // =============================================================================
    console.log('\n\u2550\u2550 Section 4: PDF Import \u2550\u2550');

    await test('18. Import PDF with empty file returns 400', async () => {
        const raw = await page.evaluate(async (base, tok) => {
            const formData = new FormData();
            const emptyBlob = new Blob([], { type: 'application/pdf' });
            formData.append('file', emptyBlob, 'empty.pdf');
            const r = await fetch(`${base}/api/analyses/import-pdf`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${tok}` },
                body: formData
            });
            return { status: r.status, ok: r.ok, text: await r.text().catch(() => '') };
        }, BASE, savedToken);
        if (raw.status !== 400) throw new Error(`Expected 400, got ${raw.status}`);
    });

    await test('19. Import non-PDF file returns 400', async () => {
        const raw = await page.evaluate(async (base, tok) => {
            const formData = new FormData();
            const textBlob = new Blob(['hello world'], { type: 'text/plain' });
            formData.append('file', textBlob, 'test.txt');
            const r = await fetch(`${base}/api/analyses/import-pdf`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${tok}` },
                body: formData
            });
            return { status: r.status, ok: r.ok, text: await r.text().catch(() => '') };
        }, BASE, savedToken);
        if (raw.status !== 400) throw new Error(`Expected 400, got ${raw.status}`);
    });

    await test('20. Import PDF endpoint requires auth (401 without token)', async () => {
        const raw = await page.evaluate(async (base) => {
            const formData = new FormData();
            const blob = new Blob(['fake pdf'], { type: 'application/pdf' });
            formData.append('file', blob, 'test.pdf');
            const r = await fetch(`${base}/api/analyses/import-pdf`, {
                method: 'POST',
                body: formData
            });
            return { status: r.status };
        }, BASE);
        if (raw.status !== 401) throw new Error(`Expected 401, got ${raw.status}`);
    });

    // =============================================================================
    // SECTION 5: Edge Cases
    // =============================================================================
    console.log('\n\u2550\u2550 Section 5: Edge Cases \u2550\u2550');

    await test('21. Create analysis with very long label (5000 chars)', async () => {
        const longLabel = 'E2E ' + 'X'.repeat(4996);
        const result = await createAnalysis({
            date: '2026-01-20T00:00:00Z',
            label: longLabel,
            values: { glucose: 5.0 }
        });
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        if (!result.id) throw new Error('No ID returned');
        if (result.label.length < 4000) throw new Error(`Label truncated to ${result.label.length} chars`);
    });

    await test('22. Create analysis with special chars in label', async () => {
        const specialLabel = 'E2E <script>alert("xss")</script> \'; DROP TABLE analyses;-- & "quotes"';
        const result = await createAnalysis({
            date: '2026-01-21T00:00:00Z',
            label: specialLabel,
            values: { alt: 20 }
        });
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        // Label should be stored as-is (LiteDB stores strings safely)
        if (result.label !== specialLabel) throw new Error(`Label not stored verbatim: ${result.label}`);
    });

    await test('23. Create analysis with negative parameter values', async () => {
        const result = await createAnalysis({
            date: '2026-01-22T00:00:00Z',
            label: 'E2E Negative Values',
            values: { testosterone: -5.0, hemoglobin: -10 }
        });
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        if (result.values.testosterone !== -5.0) throw new Error(`Expected -5.0, got ${result.values.testosterone}`);
        if (result.values.hemoglobin !== -10) throw new Error(`Expected -10, got ${result.values.hemoglobin}`);
    });

    await test('24. Create analysis with very large parameter value (999999.99)', async () => {
        const result = await createAnalysis({
            date: '2026-01-23T00:00:00Z',
            label: 'E2E Large Value',
            values: { testosterone: 999999.99 }
        });
        if (result.__error) throw new Error(`API error ${result.status}: ${result.text}`);
        if (result.values.testosterone !== 999999.99) throw new Error(`Expected 999999.99, got ${result.values.testosterone}`);
    });

    await test('25. Update analysis with mismatched ID in URL vs body returns 400', async () => {
        if (!firstAnalysisId) throw new Error('No analysis from test 1');
        const mismatchedId = '11111111-1111-1111-1111-111111111111';
        const raw = await apiRaw(`/analyses/${firstAnalysisId}`, {
            method: 'PUT',
            body: JSON.stringify({
                id: mismatchedId,
                date: '2026-01-15T00:00:00Z',
                label: 'E2E Mismatch',
                values: {}
            })
        });
        if (raw.status !== 400) throw new Error(`Expected 400 for ID mismatch, got ${raw.status}`);
    });

    await test('26. Delete same analysis twice - second returns 404', async () => {
        // Create a fresh one to delete
        const temp = await createAnalysis({
            date: '2026-01-24T00:00:00Z',
            label: 'E2E Double Delete',
            values: {}
        });
        if (temp.__error) throw new Error(`Create failed: ${temp.status}`);
        const id = temp.id;

        // First delete
        const del1 = await apiRaw(`/analyses/${id}`, { method: 'DELETE' });
        if (del1.status !== 204) throw new Error(`First delete: expected 204, got ${del1.status}`);

        // Remove from tracking
        const idx = createdAnalysisIds.indexOf(id);
        if (idx !== -1) createdAnalysisIds.splice(idx, 1);

        // Second delete
        const del2 = await apiRaw(`/analyses/${id}`, { method: 'DELETE' });
        if (del2.status !== 404) throw new Error(`Second delete: expected 404, got ${del2.status}`);
    });

    // =============================================================================
    // CLEANUP
    // =============================================================================
    console.log('\n\u2550\u2550 Cleanup \u2550\u2550');

    let cleanedCount = 0;
    for (const id of createdAnalysisIds) {
        try {
            const raw = await apiRaw(`/analyses/${id}`, { method: 'DELETE' });
            if (raw.status === 204) cleanedCount++;
        } catch (e) {
            // Ignore cleanup errors
        }
    }
    console.log(`  Deleted ${cleanedCount} test analyses (of ${createdAnalysisIds.length} tracked)`);

    // Also clean up any straggler E2E analyses (belt and suspenders)
    try {
        const allAnalyses = await apiCall('/analyses');
        if (Array.isArray(allAnalyses)) {
            for (const a of allAnalyses) {
                if (a.label && a.label.startsWith('E2E')) {
                    await apiRaw(`/analyses/${a.id}`, { method: 'DELETE' });
                    console.log(`  Cleaned straggler: ${a.label}`);
                }
            }
        }
    } catch (e) {
        // Ignore
    }

    // =============================================================================
    // SUMMARY
    // =============================================================================
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  RESULTS: ${passed} passed | ${failed} failed | ${skipped} skipped`);
    if (errors.length > 0) {
        console.log(`\n  Failures:`);
        for (const e of errors) {
            console.log(`    - ${e.name}: ${e.err}`);
        }
    }
    console.log(`${'='.repeat(50)}\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
