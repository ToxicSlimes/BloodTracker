import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5000';
let browser, page;
let passed = 0, failed = 0, skipped = 0;
const errors = [];
let savedToken = null;
let savedUser = null;

// Track all created entity IDs for cleanup
const createdDrugs = [];
const createdAnalyses = [];
const createdWorkoutPrograms = [];
const createdIntakeLogs = [];
const createdPurchases = [];

function ok(name) { passed++; console.log(`  \u2705 ${name}`); }
function fail(name, err) { failed++; errors.push({ name, err: err.toString() }); console.log(`  \u274C ${name}: ${err}`); }
function skip(name, reason) { skipped++; console.log(`  \u23ED\uFE0F  ${name}: ${reason}`); }
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
            body: JSON.stringify({ email: 'e2e-stress@test.local' })
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
    }, BASE, 'e2e-stress@test.local', resp.devCode);
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

(async () => {
    console.log('\n\u26A1 STRESS & EDGE CASE E2E TESTS\n');

    browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // ========================================================================
    // AUTH
    // ========================================================================
    console.log('\u2550\u2550 Auth \u2550\u2550');
    await page.goto(BASE, { waitUntil: 'networkidle2' });

    try {
        await login();
        ok('Login via email code');
    } catch (e) {
        fail('Login', e.message);
        console.log('\n  FATAL: Cannot authenticate. Aborting.\n');
        await browser.close();
        process.exit(1);
    }

    // ========================================================================
    // SECTION 1: Concurrent API Calls
    // ========================================================================
    console.log('\n\u2550\u2550 Section 1: Concurrent API Calls \u2550\u2550');

    // 1. Fire 10 parallel GET /api/drugs -> all 10 return 200
    await test('10 parallel GET /api/drugs all return 200', async () => {
        const results = await page.evaluate(async (base, tok) => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(fetch(`${base}/api/drugs`, {
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` }
                }).then(r => ({ status: r.status, ok: r.ok })));
            }
            return Promise.all(promises);
        }, BASE, savedToken);

        if (results.length !== 10) throw new Error(`Expected 10 results, got ${results.length}`);
        const failures = results.filter(r => !r.ok);
        if (failures.length > 0) throw new Error(`${failures.length}/10 failed: statuses ${failures.map(f => f.status).join(',')}`);
    });

    // 2. Fire 5 parallel POST /api/drugs (different names) -> all 5 create successfully
    await test('5 parallel POST /api/drugs all create successfully', async () => {
        const results = await page.evaluate(async (base, tok) => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(fetch(`${base}/api/drugs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                    body: JSON.stringify({ name: `STRESS-Concurrent-${i}-${Date.now()}`, type: i % 5 })
                }).then(async r => ({ status: r.status, ok: r.ok, body: await r.json().catch(() => null) })));
            }
            return Promise.all(promises);
        }, BASE, savedToken);

        if (results.length !== 5) throw new Error(`Expected 5 results, got ${results.length}`);
        const failures = results.filter(r => !r.ok);
        if (failures.length > 0) throw new Error(`${failures.length}/5 failed: ${JSON.stringify(failures)}`);

        // Track for cleanup
        for (const r of results) {
            if (r.body && r.body.id) createdDrugs.push(r.body.id);
        }

        // Verify no duplicates by checking IDs are all unique
        const ids = results.map(r => r.body?.id).filter(Boolean);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) throw new Error('Duplicate IDs detected');
    });

    // 3. Fire 10 parallel GET /api/courses/dashboard -> all succeed
    await test('10 parallel GET /api/courses/dashboard all succeed', async () => {
        const results = await page.evaluate(async (base, tok) => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(fetch(`${base}/api/courses/dashboard`, {
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` }
                }).then(r => ({ status: r.status, ok: r.ok })));
            }
            return Promise.all(promises);
        }, BASE, savedToken);

        if (results.length !== 10) throw new Error(`Expected 10 results, got ${results.length}`);
        const failures = results.filter(r => !r.ok);
        if (failures.length > 0) throw new Error(`${failures.length}/10 dashboard calls failed`);
    });

    // 4. Fire 5 parallel GET to different endpoints simultaneously
    await test('5 parallel GETs to different endpoints all succeed', async () => {
        const results = await page.evaluate(async (base, tok) => {
            const endpoints = [
                '/api/drugs',
                '/api/analyses',
                '/api/courses/dashboard',
                '/api/drugstatistics/inventory',
                '/api/referenceranges'
            ];
            const promises = endpoints.map(ep =>
                fetch(`${base}${ep}`, {
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` }
                }).then(r => ({ endpoint: ep, status: r.status, ok: r.ok }))
            );
            return Promise.all(promises);
        }, BASE, savedToken);

        if (results.length !== 5) throw new Error(`Expected 5, got ${results.length}`);
        for (const r of results) {
            if (!r.ok) throw new Error(`${r.endpoint} returned ${r.status}`);
        }
    });

    // ========================================================================
    // SECTION 2: Rapid Sequential Operations
    // ========================================================================
    console.log('\n\u2550\u2550 Section 2: Rapid Sequential Operations \u2550\u2550');

    // 5. Create 20 drugs rapidly in sequence -> all 20 created, list returns exactly 20+
    await test('Create 20 drugs rapidly in sequence', async () => {
        const beforeList = await apiCall('/drugs');
        const beforeCount = Array.isArray(beforeList) ? beforeList.length : 0;

        const ids = await page.evaluate(async (base, tok) => {
            const created = [];
            for (let i = 0; i < 20; i++) {
                const r = await fetch(`${base}/api/drugs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                    body: JSON.stringify({ name: `STRESS-Rapid-${i}`, type: i % 5 })
                });
                const data = await r.json();
                if (data.id) created.push(data.id);
            }
            return created;
        }, BASE, savedToken);

        if (ids.length !== 20) throw new Error(`Only created ${ids.length}/20 drugs`);
        createdDrugs.push(...ids);

        const afterList = await apiCall('/drugs');
        const afterCount = Array.isArray(afterList) ? afterList.length : 0;
        if (afterCount < beforeCount + 20) throw new Error(`Expected at least ${beforeCount + 20} drugs, got ${afterCount}`);
    });

    // 6. Create drug, immediately delete, then try GET -> 404
    await test('Create-delete-verify gone cycle', async () => {
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: 'STRESS-DeleteMe', type: 0 })
        });
        if (!drug || drug.__error) throw new Error('Failed to create drug');

        const delResult = await apiRaw(`/drugs/${drug.id}`, { method: 'DELETE' });
        if (delResult.status !== 204) throw new Error(`Delete returned ${delResult.status}`);

        // GET the deleted drug - should be 404 (drugs endpoint is list-only, so check list)
        const allDrugs = await apiCall('/drugs');
        const found = allDrugs.find(d => d.id === drug.id);
        if (found) throw new Error('Drug still found after deletion');
    });

    // 7. Create drug + 10 intake logs rapidly -> all logs created with correct drugId
    await test('Create drug + 10 intake logs rapidly', async () => {
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: 'STRESS-LogTarget', type: 1 })
        });
        if (!drug || drug.__error) throw new Error('Failed to create drug');
        createdDrugs.push(drug.id);

        const logIds = await page.evaluate(async (base, tok, drugId) => {
            const ids = [];
            for (let i = 0; i < 10; i++) {
                const r = await fetch(`${base}/api/intakelogs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                    body: JSON.stringify({
                        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
                        drugId: drugId,
                        dose: `${(i + 1) * 10}mg`,
                        note: `Rapid log #${i}`
                    })
                });
                const data = await r.json();
                if (data.id) ids.push(data.id);
            }
            return ids;
        }, BASE, savedToken, drug.id);

        if (logIds.length !== 10) throw new Error(`Only created ${logIds.length}/10 logs`);
        createdIntakeLogs.push(...logIds);

        // Verify all logs belong to the correct drug
        const logs = await apiCall(`/intakelogs?drugId=${drug.id}`);
        const matchingLogs = logs.filter(l => l.drugId === drug.id);
        if (matchingLogs.length < 10) throw new Error(`Expected 10+ logs for drug, found ${matchingLogs.length}`);
    });

    // 8. Rapid create-update-delete cycle: create drug -> update name -> delete -> verify gone
    await test('Rapid create-update-delete cycle', async () => {
        // Create
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: 'STRESS-Lifecycle-v1', type: 2 })
        });
        if (!drug || drug.__error) throw new Error('Create failed');

        // Update
        const updated = await apiCall(`/drugs/${drug.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: 'STRESS-Lifecycle-v2', type: 3 })
        });
        if (!updated || updated.__error) throw new Error(`Update failed: ${JSON.stringify(updated)}`);
        if (updated.name !== 'STRESS-Lifecycle-v2') throw new Error(`Name not updated: ${updated.name}`);

        // Delete
        const del = await apiRaw(`/drugs/${drug.id}`, { method: 'DELETE' });
        if (del.status !== 204) throw new Error(`Delete returned ${del.status}`);

        // Verify gone
        const allDrugs = await apiCall('/drugs');
        const found = allDrugs.find(d => d.id === drug.id);
        if (found) throw new Error('Drug still exists after delete');
    });

    // ========================================================================
    // SECTION 3: Large Data
    // ========================================================================
    console.log('\n\u2550\u2550 Section 3: Large Data \u2550\u2550');

    // 9. Create analysis with 50 blood parameters -> succeeds, GET returns all 50
    await test('Create analysis with 50 blood parameters', async () => {
        const values = {};
        const paramNames = [
            'hemoglobin', 'hematocrit', 'rbc', 'wbc', 'platelets',
            'mcv', 'mch', 'mchc', 'rdw', 'mpv',
            'neutrophils', 'lymphocytes', 'monocytes', 'eosinophils', 'basophils',
            'glucose', 'urea', 'creatinine', 'uric_acid', 'total_protein',
            'albumin', 'bilirubin_total', 'bilirubin_direct', 'alt', 'ast',
            'ggt', 'alkaline_phosphatase', 'ldh', 'amylase', 'lipase',
            'cholesterol', 'triglycerides', 'hdl', 'ldl', 'vldl',
            'iron', 'ferritin', 'transferrin', 'tibc', 'calcium',
            'sodium', 'potassium', 'chloride', 'phosphorus', 'magnesium',
            'tsh', 'ft3', 'ft4', 'testosterone', 'cortisol'
        ];
        for (let i = 0; i < 50; i++) {
            values[paramNames[i]] = parseFloat((Math.random() * 100).toFixed(2));
        }

        const analysis = await apiCall('/analyses', {
            method: 'POST',
            body: JSON.stringify({
                date: '2026-01-15',
                label: 'STRESS-50params',
                laboratory: 'StressLab',
                notes: 'Testing 50 parameters',
                values
            })
        });
        if (!analysis || analysis.__error) throw new Error(`Create failed: ${JSON.stringify(analysis)}`);
        createdAnalyses.push(analysis.id);

        // Verify all 50 values returned
        const keys = Object.keys(analysis.values || {});
        if (keys.length !== 50) throw new Error(`Expected 50 values, got ${keys.length}`);
    });

    // 10. Create drug with maximum-length fields -> check behavior
    await test('Create drug with very long fields (1000 char name)', async () => {
        const longName = 'STRESS-' + 'A'.repeat(993);
        const longNotes = 'N'.repeat(5000);

        const result = await apiRaw('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: longName, type: 0, notes: longNotes })
        });

        if (result.ok) {
            // Accepted - track for cleanup
            if (result.body && result.body.id) createdDrugs.push(result.body.id);
            // Verify name preserved
            if (result.body.name.length < 100) throw new Error('Name was truncated unexpectedly');
        } else {
            // Rejected with 400 is also acceptable behavior
            if (result.status !== 400 && result.status !== 413) {
                throw new Error(`Unexpected status ${result.status} for long fields`);
            }
        }
    });

    // 11. Create 10 analyses, then list -> all 10 returned
    await test('Create 10 analyses then list all', async () => {
        const beforeList = await apiCall('/analyses');
        const beforeCount = Array.isArray(beforeList) ? beforeList.length : 0;

        const ids = await page.evaluate(async (base, tok) => {
            const created = [];
            for (let i = 0; i < 10; i++) {
                const values = {};
                values[`param_${i}`] = (i + 1) * 1.5;
                values['hemoglobin'] = 14.0 + i * 0.1;
                const r = await fetch(`${base}/api/analyses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                    body: JSON.stringify({
                        date: `2026-02-${String(i + 1).padStart(2, '0')}`,
                        label: `STRESS-Batch-${i}`,
                        values
                    })
                });
                const data = await r.json();
                if (data.id) created.push(data.id);
            }
            return created;
        }, BASE, savedToken);

        if (ids.length !== 10) throw new Error(`Only created ${ids.length}/10 analyses`);
        createdAnalyses.push(...ids);

        const afterList = await apiCall('/analyses');
        const afterCount = Array.isArray(afterList) ? afterList.length : 0;
        if (afterCount < beforeCount + 10) throw new Error(`Expected ${beforeCount + 10}+ analyses, got ${afterCount}`);

        // Verify each created ID is in the list
        for (const id of ids) {
            const found = afterList.find(a => a.id === id);
            if (!found) throw new Error(`Analysis ${id} not found in list`);
        }
    });

    // ========================================================================
    // SECTION 4: Boundary & Weird Inputs
    // ========================================================================
    console.log('\n\u2550\u2550 Section 4: Boundary & Weird Inputs \u2550\u2550');

    // 12. Drug name with unicode (emoji, Chinese, Arabic, RTL) -> created and retrieved
    await test('Drug names with unicode (emoji, CJK, Arabic, RTL)', async () => {
        const unicodeNames = [
            'STRESS-\uD83D\uDC89\uD83E\uDDA0\uD83D\uDCAA-Emoji',
            'STRESS-\u4E2D\u6587\u836F\u7269-Chinese',
            'STRESS-\u062F\u0648\u0627\u0621\u0639\u0631\u0628\u064A-Arabic',
            'STRESS-\u05EA\u05E8\u05D5\u05E4\u05D4-Hebrew'
        ];

        for (const name of unicodeNames) {
            const drug = await apiCall('/drugs', {
                method: 'POST',
                body: JSON.stringify({ name, type: 0 })
            });
            if (!drug || drug.__error) throw new Error(`Failed to create drug with name: ${name}`);
            createdDrugs.push(drug.id);
            if (drug.name !== name) throw new Error(`Name mismatch for unicode drug. Got: ${drug.name}`);
        }

        // Verify all exist in the list
        const allDrugs = await apiCall('/drugs');
        for (const name of unicodeNames) {
            const found = allDrugs.find(d => d.name === name);
            if (!found) throw new Error(`Unicode drug not found in list: ${name}`);
        }
    });

    // 13. Analysis values with edge numbers
    await test('Analysis with edge-case numeric values', async () => {
        const edgeValues = {
            'zero_val': 0,
            'negative_val': -1,
            'tiny_val': 0.001,
            'large_val': 999999,
            'decimal_val': 123.456789
        };

        const analysis = await apiCall('/analyses', {
            method: 'POST',
            body: JSON.stringify({
                date: '2026-01-20',
                label: 'STRESS-EdgeNumbers',
                values: edgeValues
            })
        });
        if (!analysis || analysis.__error) throw new Error(`Create failed: ${JSON.stringify(analysis)}`);
        createdAnalyses.push(analysis.id);

        // Verify values preserved
        const vals = analysis.values;
        if (vals['zero_val'] !== 0) throw new Error(`Zero not preserved: ${vals['zero_val']}`);
        if (vals['negative_val'] !== -1) throw new Error(`Negative not preserved: ${vals['negative_val']}`);
        if (Math.abs(vals['tiny_val'] - 0.001) > 0.0001) throw new Error(`Tiny not preserved: ${vals['tiny_val']}`);
        if (vals['large_val'] !== 999999) throw new Error(`Large not preserved: ${vals['large_val']}`);
    });

    // 14. ISO date edge cases: midnight UTC, end of year, leap day
    await test('ISO date edge cases (midnight, year-end, leap day)', async () => {
        const dateCases = [
            { date: '2026-01-01T00:00:00Z', label: 'STRESS-Midnight' },
            { date: '2025-12-31', label: 'STRESS-YearEnd' },
            { date: '2024-02-29', label: 'STRESS-LeapDay' }
        ];

        for (const { date, label } of dateCases) {
            const analysis = await apiCall('/analyses', {
                method: 'POST',
                body: JSON.stringify({
                    date,
                    label,
                    values: { hemoglobin: 14.5 }
                })
            });
            if (!analysis || analysis.__error) throw new Error(`Failed for date ${date}: ${JSON.stringify(analysis)}`);
            createdAnalyses.push(analysis.id);
        }
    });

    // ========================================================================
    // SECTION 5: API Error Resilience
    // ========================================================================
    console.log('\n\u2550\u2550 Section 5: API Error Resilience \u2550\u2550');

    // 15. POST to non-existent endpoint -> 404 or 405
    await test('POST to non-existent endpoint returns 404 or 405', async () => {
        const result = await apiRaw('/nonexistent-endpoint-xyz', {
            method: 'POST',
            body: JSON.stringify({ foo: 'bar' })
        });
        if (result.status !== 404 && result.status !== 405) throw new Error(`Expected 404 or 405, got ${result.status}`);
    });

    // 16. Send malformed JSON body -> 400
    await test('Malformed JSON body returns 400', async () => {
        const result = await page.evaluate(async (base, tok) => {
            const r = await fetch(`${base}/api/drugs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                body: '{ this is not valid json !!!}'
            });
            return { status: r.status, ok: r.ok };
        }, BASE, savedToken);
        if (result.status !== 400) throw new Error(`Expected 400, got ${result.status}`);
    });

    // 17. Send valid JSON but wrong shape (array instead of object) -> check behavior
    await test('Array instead of object body returns error', async () => {
        const result = await apiRaw('/drugs', {
            method: 'POST',
            body: JSON.stringify([{ name: 'x', type: 0 }])
        });
        // Should either fail (400/415) or produce an error - should NOT create a valid drug
        if (result.ok && result.body && result.body.id) {
            // If it somehow created something, that's unexpected but clean up
            createdDrugs.push(result.body.id);
            throw new Error('Array body unexpectedly created a drug');
        }
        // Any non-success status is acceptable (400, 415, 422, 500)
        if (result.ok) throw new Error(`Expected error for array body, got ${result.status}`);
    });

    // 18. Extremely large request body (100KB JSON) -> check behavior (accepted or 413)
    await test('Very large request body (100KB) handled gracefully', async () => {
        const result = await page.evaluate(async (base, tok) => {
            // Build a ~100KB JSON body
            const bigNotes = 'X'.repeat(100000);
            const body = JSON.stringify({ name: 'STRESS-BigBody', type: 0, notes: bigNotes });
            const r = await fetch(`${base}/api/drugs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                body
            });
            let respBody = null;
            try { respBody = await r.json(); } catch {}
            return { status: r.status, ok: r.ok, body: respBody };
        }, BASE, savedToken);

        if (result.ok) {
            // Server accepted the large body - track for cleanup
            if (result.body && result.body.id) createdDrugs.push(result.body.id);
            // This is acceptable behavior
        } else {
            // 400, 413, or 500 are all acceptable for rejecting oversized requests
            if (![400, 413, 414, 500].includes(result.status)) {
                throw new Error(`Unexpected status ${result.status} for large body`);
            }
        }
    });

    // ========================================================================
    // CLEANUP
    // ========================================================================
    console.log('\n\u2550\u2550 Cleanup \u2550\u2550');

    // Delete intake logs first (they reference drugs)
    let cleanedLogs = 0;
    for (const id of createdIntakeLogs) {
        try {
            await apiRaw(`/intakelogs/${id}`, { method: 'DELETE' });
            cleanedLogs++;
        } catch {}
    }
    if (cleanedLogs > 0) console.log(`  Deleted ${cleanedLogs} intake logs`);

    // Delete purchases
    let cleanedPurchases = 0;
    for (const id of createdPurchases) {
        try {
            await apiRaw(`/purchases/${id}`, { method: 'DELETE' });
            cleanedPurchases++;
        } catch {}
    }
    if (cleanedPurchases > 0) console.log(`  Deleted ${cleanedPurchases} purchases`);

    // Delete all STRESS- drugs via listing (catch any we missed tracking)
    const allDrugs = await apiCall('/drugs');
    let cleanedDrugs = 0;
    if (Array.isArray(allDrugs)) {
        for (const d of allDrugs) {
            if (d.name && d.name.startsWith('STRESS-')) {
                try {
                    await apiRaw(`/drugs/${d.id}`, { method: 'DELETE' });
                    cleanedDrugs++;
                } catch {}
            }
        }
    }
    console.log(`  Deleted ${cleanedDrugs} STRESS drugs`);

    // Delete all STRESS- analyses
    const allAnalyses = await apiCall('/analyses');
    let cleanedAnalyses = 0;
    if (Array.isArray(allAnalyses)) {
        for (const a of allAnalyses) {
            if (a.label && a.label.startsWith('STRESS-')) {
                try {
                    await apiRaw(`/analyses/${a.id}`, { method: 'DELETE' });
                    cleanedAnalyses++;
                } catch {}
            }
        }
    }
    console.log(`  Deleted ${cleanedAnalyses} STRESS analyses`);

    // Delete all STRESS- workout programs
    const allPrograms = await apiCall('/workoutprograms');
    let cleanedPrograms = 0;
    if (Array.isArray(allPrograms)) {
        for (const p of allPrograms) {
            if (p.title && p.title.startsWith('STRESS-')) {
                try {
                    await apiRaw(`/workoutprograms/${p.id}`, { method: 'DELETE' });
                    cleanedPrograms++;
                } catch {}
            }
        }
    }
    console.log(`  Deleted ${cleanedPrograms} STRESS workout programs`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log(`\n${'='.repeat(55)}`);
    console.log(`  RESULTS: ${passed} passed | ${failed} failed | ${skipped} skipped`);
    if (errors.length > 0) {
        console.log(`\n  Failures:`);
        for (const e of errors) {
            console.log(`    - ${e.name}: ${e.err}`);
        }
    }
    console.log(`${'='.repeat(55)}\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
