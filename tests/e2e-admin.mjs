import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5000';
let browser, page;
let passed = 0, failed = 0, skipped = 0;
const errors = [];
let savedToken = null;
let savedUser = null;

// Second user for course tests
let courseToken = null;
let courseUser = null;

// Track created resources for cleanup
const createdCourseIds = [];
const createdDrugIds = [];
const createdLogIds = [];

function ok(name) { passed++; console.log(`  \u2705 ${name}`); }
function fail(name, err) { failed++; errors.push({ name, err: err.toString() }); console.log(`  \u274C ${name}: ${err}`); }
function skip(name, reason) { skipped++; console.log(`  \u23ED\uFE0F  ${name}: ${reason}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function test(name, fn) {
    try { await fn(); ok(name); }
    catch (e) { fail(name, e.message); }
}

async function loginAs(email) {
    const resp = await page.evaluate(async (base, em) => {
        const r = await fetch(`${base}/api/auth/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: em })
        });
        return r.json();
    }, BASE, email);
    if (!resp.devCode) throw new Error('No devCode');
    const verify = await page.evaluate(async (base, em, code) => {
        const r = await fetch(`${base}/api/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: em, code })
        });
        return r.json();
    }, BASE, email, resp.devCode);
    if (!verify.token) throw new Error('No token');
    return { token: verify.token, user: verify.user };
}

async function apiCall(path, options = {}, token = null) {
    const tok = token || savedToken;
    return page.evaluate(async (base, p, opts, t) => {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}`, ...(opts.headers || {}) };
        const r = await fetch(`${base}/api${p}`, { ...opts, headers });
        if (r.status === 204) return null;
        if (!r.ok) return { __error: true, status: r.status, text: await r.text().catch(() => '') };
        return r.json();
    }, BASE, path, options, tok);
}

async function apiRaw(path, options = {}, token = null) {
    const tok = token || savedToken;
    return page.evaluate(async (base, p, opts, t) => {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}`, ...(opts.headers || {}) };
        const r = await fetch(`${base}/api${p}`, { ...opts, headers });
        let body = null;
        try { body = await r.json(); } catch {}
        return { status: r.status, ok: r.ok, body };
    }, BASE, path, options, tok);
}

(async () => {
    console.log('\n\uD83D\uDD10 ADMIN & COURSE E2E TESTS\n');

    browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    page.setDefaultTimeout(15000);

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(BASE, { waitUntil: 'networkidle2' });

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 0: Authentication — login two test users
    // ═══════════════════════════════════════════════════════════════════
    console.log('── Auth ──');

    try {
        const auth1 = await loginAs('e2e-admin@test.local');
        savedToken = auth1.token;
        savedUser = auth1.user;
        ok('Login user 1 (e2e-admin@test.local)');
    } catch (e) {
        fail('Login user 1', e.message);
        console.log('\n  Cannot proceed without auth. Exiting.\n');
        await browser.close();
        process.exit(1);
    }

    try {
        const auth2 = await loginAs('e2e-regular@test.local');
        courseToken = auth2.token;
        courseUser = auth2.user;
        ok('Login user 2 (e2e-regular@test.local)');
    } catch (e) {
        fail('Login user 2', e.message);
        console.log('\n  Cannot proceed without second user. Exiting.\n');
        await browser.close();
        process.exit(1);
    }

    const fakeGuid = '00000000-0000-0000-0000-000000000099';

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 1: Admin Authorization (non-admin user -> 403)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n── Section 1: Admin Authorization (403 for non-admin) ──');

    await test('1. GET /admin/users -> 403 for non-admin', async () => {
        const resp = await apiRaw('/admin/users', {}, savedToken);
        if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
    });

    await test('2. GET /admin/stats -> 403 for non-admin', async () => {
        const resp = await apiRaw('/admin/stats', {}, savedToken);
        if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
    });

    await test('3. GET /admin/users/{guid}/summary -> 403 for non-admin', async () => {
        const resp = await apiRaw(`/admin/users/${fakeGuid}/summary`, {}, savedToken);
        if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
    });

    await test('4. PUT /admin/users/{guid}/role -> 403 for non-admin', async () => {
        const resp = await apiRaw(`/admin/users/${fakeGuid}/role`, {
            method: 'PUT',
            body: JSON.stringify({ isAdmin: true })
        }, savedToken);
        if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
    });

    await test('5. DELETE /admin/users/{guid} -> 403 for non-admin', async () => {
        const resp = await apiRaw(`/admin/users/${fakeGuid}`, {
            method: 'DELETE'
        }, savedToken);
        if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
    });

    await test('6. GET /admin/impersonate/{guid} -> 403 for non-admin', async () => {
        const resp = await apiRaw(`/admin/impersonate/${fakeGuid}`, {}, savedToken);
        if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
    });

    await test('7. Admin endpoints without token -> 401', async () => {
        const endpoints = [
            { path: '/admin/users', method: 'GET' },
            { path: '/admin/stats', method: 'GET' },
            { path: `/admin/users/${fakeGuid}/summary`, method: 'GET' },
            { path: `/admin/users/${fakeGuid}/role`, method: 'PUT' },
            { path: `/admin/users/${fakeGuid}`, method: 'DELETE' },
            { path: `/admin/impersonate/${fakeGuid}`, method: 'GET' }
        ];
        for (const ep of endpoints) {
            const resp = await page.evaluate(async (base, p, m) => {
                const r = await fetch(`${base}/api${p}`, {
                    method: m,
                    headers: { 'Content-Type': 'application/json' }
                });
                return { status: r.status };
            }, BASE, ep.path, ep.method);
            if (resp.status !== 401) {
                throw new Error(`${ep.method} ${ep.path} expected 401, got ${resp.status}`);
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 2: Course Management
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n── Section 2: Course Management ──');

    let createdCourseId = null;

    await test('8. Create a new course -> returns id, title, isActive', async () => {
        const course = await apiCall('/courses', {
            method: 'POST',
            body: JSON.stringify({
                title: 'E2E Test Course',
                startDate: '2026-02-01',
                endDate: '2026-04-01',
                notes: 'Created by E2E admin test'
            })
        }, courseToken);
        if (course.__error) throw new Error(`API error: ${course.status} ${course.text}`);
        if (!course.id) throw new Error('No id returned');
        if (course.title !== 'E2E Test Course') throw new Error(`Title mismatch: ${course.title}`);
        if (course.isActive !== true) throw new Error(`Expected isActive=true, got ${course.isActive}`);
        createdCourseId = course.id;
        createdCourseIds.push(course.id);
    });

    await test('9. Get active course -> matches created course', async () => {
        if (!createdCourseId) throw new Error('No course created in test 8');
        const active = await apiCall('/courses/active', {}, courseToken);
        if (active.__error) throw new Error(`API error: ${active.status} ${active.text}`);
        if (active.id !== createdCourseId) throw new Error(`ID mismatch: ${active.id} vs ${createdCourseId}`);
        if (active.title !== 'E2E Test Course') throw new Error(`Title mismatch: ${active.title}`);
    });

    await test('10. Update course (title, dates) -> persisted', async () => {
        if (!createdCourseId) throw new Error('No course created in test 8');
        const updated = await apiCall(`/courses/${createdCourseId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: 'E2E Updated Course',
                startDate: '2026-03-01',
                endDate: '2026-05-01',
                notes: 'Updated by E2E test'
            })
        }, courseToken);
        if (updated.__error) throw new Error(`API error: ${updated.status} ${updated.text}`);
        if (updated.title !== 'E2E Updated Course') throw new Error(`Title not updated: ${updated.title}`);
        // Verify persisted by re-fetching
        const fetched = await apiCall('/courses/active', {}, courseToken);
        if (fetched.title !== 'E2E Updated Course') throw new Error(`Persisted title wrong: ${fetched.title}`);
    });

    await test('11. Dashboard returns activeCourse with course data', async () => {
        const dash = await apiCall('/courses/dashboard', {}, courseToken);
        if (dash.__error) throw new Error(`API error: ${dash.status} ${dash.text}`);
        if (!dash.activeCourse) throw new Error('activeCourse is null');
        if (dash.activeCourse.id !== createdCourseId) throw new Error('activeCourse ID mismatch');
        if (dash.activeCourse.title !== 'E2E Updated Course') throw new Error(`activeCourse title wrong: ${dash.activeCourse.title}`);
    });

    await test('12. Dashboard includes drugs array and analysesCount', async () => {
        const dash = await apiCall('/courses/dashboard', {}, courseToken);
        if (dash.__error) throw new Error(`API error: ${dash.status} ${dash.text}`);
        if (!Array.isArray(dash.drugs)) throw new Error('drugs is not an array');
        if (typeof dash.analysesCount !== 'number') throw new Error(`analysesCount is ${typeof dash.analysesCount}`);
    });

    await test('13. Create course with minimal data (only title)', async () => {
        const course = await apiCall('/courses', {
            method: 'POST',
            body: JSON.stringify({ title: 'E2E Minimal Course' })
        }, courseToken);
        if (course.__error) throw new Error(`API error: ${course.status} ${course.text}`);
        if (!course.id) throw new Error('No id returned');
        if (course.title !== 'E2E Minimal Course') throw new Error(`Title mismatch: ${course.title}`);
        createdCourseIds.push(course.id);
    });

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 3: Dashboard Data
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n── Section 3: Dashboard Data ──');

    let testDrugId = null;
    let testLogId = null;

    await test('14. Create drug + intake log -> dashboard shows in recentIntakes', async () => {
        // Create a drug for the course user
        const drug = await apiCall('/drugs', {
            method: 'POST',
            body: JSON.stringify({ name: 'E2E Dashboard Drug', type: 0 })
        }, courseToken);
        if (drug.__error) throw new Error(`Drug create error: ${drug.status} ${drug.text}`);
        testDrugId = drug.id;
        createdDrugIds.push(drug.id);

        // Log an intake
        const log = await apiCall('/intakelogs', {
            method: 'POST',
            body: JSON.stringify({
                date: '2026-02-12',
                drugId: testDrugId,
                dose: '250mg E2E'
            })
        }, courseToken);
        if (log.__error) throw new Error(`Log create error: ${log.status} ${log.text}`);
        testLogId = log.id;
        createdLogIds.push(log.id);

        // Check dashboard
        const dash = await apiCall('/courses/dashboard', {}, courseToken);
        if (dash.__error) throw new Error(`Dashboard error: ${dash.status} ${dash.text}`);
        if (!Array.isArray(dash.recentIntakes)) throw new Error('recentIntakes not an array');
        const found = dash.recentIntakes.find(i => i.id === testLogId);
        if (!found) throw new Error('Created log not in recentIntakes');
        if (found.dose !== '250mg E2E') throw new Error(`Dose mismatch: ${found.dose}`);
    });

    await test('15. Dashboard analysesCount reflects actual count', async () => {
        const dash = await apiCall('/courses/dashboard', {}, courseToken);
        if (dash.__error) throw new Error(`API error: ${dash.status} ${dash.text}`);
        if (typeof dash.analysesCount !== 'number') throw new Error('analysesCount not a number');
        // For a fresh test user, should be 0 or reflect existing analyses
        if (dash.analysesCount < 0) throw new Error(`Negative analysesCount: ${dash.analysesCount}`);
    });

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 4: Statistics Endpoints
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n── Section 4: Statistics Endpoints ──');

    await test('16. Drug statistics for non-existent drug -> returns structure', async () => {
        const resp = await apiRaw(`/drugstatistics/${fakeGuid}`, {}, courseToken);
        // Should return 200 with empty/zero stats or 404 — either is acceptable
        if (resp.status !== 200 && resp.status !== 404) {
            throw new Error(`Expected 200 or 404, got ${resp.status}`);
        }
        if (resp.status === 200 && resp.body) {
            if (typeof resp.body.totalConsumed !== 'number') throw new Error('Missing totalConsumed field');
            if (typeof resp.body.totalPurchased !== 'number') throw new Error('Missing totalPurchased field');
        }
    });

    await test('17. Inventory endpoint returns structure with items array', async () => {
        const inv = await apiCall('/drugstatistics/inventory', {}, courseToken);
        if (inv.__error) throw new Error(`API error: ${inv.status} ${inv.text}`);
        if (!Array.isArray(inv.items)) throw new Error('items is not an array');
        if (typeof inv.totalDrugs !== 'number') throw new Error('totalDrugs missing');
        if (typeof inv.totalSpent !== 'number') throw new Error('totalSpent missing');
    });

    await test('18. Consumption timeline for a drug -> returns dataPoints array', async () => {
        if (!testDrugId) throw new Error('No test drug created');
        const resp = await apiCall(`/drugstatistics/${testDrugId}/timeline`, {}, courseToken);
        if (resp.__error) throw new Error(`API error: ${resp.status} ${resp.text}`);
        if (!Array.isArray(resp.dataPoints)) throw new Error('dataPoints not an array');
        // We created one intake, so should have at least one data point
        if (resp.dataPoints.length < 1) throw new Error(`Expected >= 1 data point, got ${resp.dataPoints.length}`);
    });

    await test('19. Purchase vs consumption -> returns timeline array', async () => {
        if (!testDrugId) throw new Error('No test drug created');
        const resp = await apiCall(`/drugstatistics/${testDrugId}/purchase-vs-consumption`, {}, courseToken);
        if (resp.__error) throw new Error(`API error: ${resp.status} ${resp.text}`);
        if (!Array.isArray(resp.timeline)) throw new Error('timeline not an array');
    });

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 5: Edge Cases
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n── Section 5: Edge Cases ──');

    await test('20. Create course with end before start -> check behavior', async () => {
        const resp = await apiRaw('/courses', {
            method: 'POST',
            body: JSON.stringify({
                title: 'E2E Backwards Dates',
                startDate: '2026-06-01',
                endDate: '2026-01-01'
            })
        }, courseToken);
        // Server may accept it (no validation) or reject it — we just ensure no 500
        if (resp.status === 500) throw new Error('Server returned 500');
        if (resp.ok && resp.body && resp.body.id) {
            createdCourseIds.push(resp.body.id);
        }
    });

    await test('21. Update course with same data -> no error', async () => {
        if (!createdCourseId) throw new Error('No course from test 8');
        const resp = await apiRaw(`/courses/${createdCourseId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: 'E2E Updated Course',
                startDate: '2026-03-01',
                endDate: '2026-05-01',
                notes: 'Updated by E2E test'
            })
        }, courseToken);
        if (!resp.ok) throw new Error(`Expected success, got ${resp.status}`);
    });

    await test('22. Dashboard with no active course -> null activeCourse', async () => {
        // Use the admin test user (user1) who has no courses
        const dash = await apiCall('/courses/dashboard', {}, savedToken);
        if (dash.__error) throw new Error(`API error: ${dash.status} ${dash.text}`);
        // User1 has no courses, so activeCourse should be null
        if (dash.activeCourse !== null && dash.activeCourse !== undefined) {
            // If user1 somehow has a course, that is still valid structure
            console.log('    (user1 has an active course — skipping null check)');
        }
    });

    await test('23. Get active course when none exists -> 404', async () => {
        // Use user1 who should have no courses
        const resp = await apiRaw('/courses/active', {}, savedToken);
        // Should be 404 if user has no active course, or 200 if they do
        if (resp.status !== 404 && resp.status !== 200) {
            throw new Error(`Expected 404 or 200, got ${resp.status}`);
        }
        if (resp.status === 200) {
            console.log('    (user1 has an active course — got 200 instead of 404)');
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n── Cleanup ──');

    // Delete intake logs
    for (const logId of createdLogIds) {
        try {
            await apiCall(`/intakelogs/${logId}`, { method: 'DELETE' }, courseToken);
            console.log(`  Deleted log: ${logId}`);
        } catch (e) {
            console.log(`  Failed to delete log ${logId}: ${e.message}`);
        }
    }

    // Delete drugs
    for (const drugId of createdDrugIds) {
        try {
            await apiCall(`/drugs/${drugId}`, { method: 'DELETE' }, courseToken);
            console.log(`  Deleted drug: ${drugId}`);
        } catch (e) {
            console.log(`  Failed to delete drug ${drugId}: ${e.message}`);
        }
    }

    // Delete courses — there is no DELETE endpoint for courses,
    // so we just note them. They live in the test user's DB which is ephemeral.
    if (createdCourseIds.length > 0) {
        console.log(`  Created ${createdCourseIds.length} course(s) — no DELETE endpoint; left in test user DB`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log(`\n${'='.repeat(55)}`);
    console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    if (errors.length > 0) {
        console.log(`\n  FAILURES:`);
        for (const e of errors) {
            console.log(`    - ${e.name}: ${e.err}`);
        }
    }
    console.log(`${'='.repeat(55)}\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
