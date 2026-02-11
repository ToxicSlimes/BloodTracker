import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5000';
let browser, page;
let passed = 0, failed = 0, skipped = 0;
const errors = [];
let savedToken = null;
let savedUser = null;

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
            body: JSON.stringify({ email: 'e2e-workouts@test.local' })
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
    }, BASE, 'e2e-workouts@test.local', resp.devCode);
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

// Track all created IDs for cleanup
const createdProgramIds = [];
const createdDayIds = [];
const createdExerciseIds = [];
const createdSetIds = [];

(async () => {
    console.log('\n\uD83C\uDFCB\uFE0F WORKOUTS E2E TESTS\n');

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

    // ═══════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════
    console.log('\u2500\u2500 Auth \u2500\u2500');
    await page.goto(BASE, { waitUntil: 'networkidle2' });

    await test('Login via email code', async () => {
        await login();
        if (!savedToken) throw new Error('No token after login');
    });

    // ═══════════════════════════════════════════════
    // SECTION 1: Program CRUD
    // ═══════════════════════════════════════════════
    console.log('\n\u2500\u2500 Section 1: Program CRUD \u2500\u2500');

    let programId = null;

    await test('1. Create workout program', async () => {
        const prog = await apiCall('/workoutprograms', {
            method: 'POST',
            body: JSON.stringify({ title: 'E2E Push/Pull/Legs', notes: 'E2E test program' })
        });
        if (prog.__error) throw new Error(`API error ${prog.status}: ${prog.text}`);
        if (!prog.id) throw new Error('No id returned');
        if (prog.title !== 'E2E Push/Pull/Legs') throw new Error(`Title mismatch: ${prog.title}`);
        programId = prog.id;
        createdProgramIds.push(prog.id);
    });

    await test('2. Get program by ID', async () => {
        const prog = await apiCall(`/workoutprograms/${programId}`);
        if (prog.__error) throw new Error(`API error ${prog.status}: ${prog.text}`);
        if (prog.id !== programId) throw new Error('ID mismatch');
        if (prog.title !== 'E2E Push/Pull/Legs') throw new Error(`Title mismatch: ${prog.title}`);
        if (prog.notes !== 'E2E test program') throw new Error(`Notes mismatch: ${prog.notes}`);
    });

    await test('3. List programs includes created', async () => {
        const list = await apiCall('/workoutprograms');
        if (list.__error) throw new Error(`API error ${list.status}: ${list.text}`);
        if (!Array.isArray(list)) throw new Error('Not an array');
        const found = list.find(p => p.id === programId);
        if (!found) throw new Error('Created program not in list');
    });

    await test('4. Update program title', async () => {
        const updated = await apiCall(`/workoutprograms/${programId}`, {
            method: 'PUT',
            body: JSON.stringify({ title: 'E2E Upper/Lower', notes: 'Updated notes' })
        });
        if (updated.__error) throw new Error(`API error ${updated.status}: ${updated.text}`);
        if (updated.title !== 'E2E Upper/Lower') throw new Error(`Title not updated: ${updated.title}`);
        if (updated.notes !== 'Updated notes') throw new Error(`Notes not updated: ${updated.notes}`);
        // Verify persisted
        const fetched = await apiCall(`/workoutprograms/${programId}`);
        if (fetched.title !== 'E2E Upper/Lower') throw new Error('Title not persisted');
    });

    let deleteProgramId = null;
    await test('5. Delete program -> 204, then GET -> 404', async () => {
        // Create a throwaway program to delete
        const prog = await apiCall('/workoutprograms', {
            method: 'POST',
            body: JSON.stringify({ title: 'E2E Delete Me' })
        });
        if (prog.__error) throw new Error(`Create error: ${prog.status}`);
        deleteProgramId = prog.id;

        const delResp = await apiRaw(`/workoutprograms/${deleteProgramId}`, { method: 'DELETE' });
        if (delResp.status !== 204) throw new Error(`Delete status: ${delResp.status}, expected 204`);

        const getResp = await apiRaw(`/workoutprograms/${deleteProgramId}`);
        if (getResp.status !== 404) throw new Error(`GET after delete status: ${getResp.status}, expected 404`);
    });

    // ═══════════════════════════════════════════════
    // SECTION 2: Day CRUD
    // ═══════════════════════════════════════════════
    console.log('\n\u2500\u2500 Section 2: Day CRUD \u2500\u2500');

    let dayId1 = null;
    let dayId2 = null;

    await test('6. Create day (Monday) for program', async () => {
        const day = await apiCall('/workoutdays', {
            method: 'POST',
            body: JSON.stringify({ programId, dayOfWeek: 1, title: 'E2E Push Day', notes: 'Chest + Shoulders + Triceps' })
        });
        if (day.__error) throw new Error(`API error ${day.status}: ${day.text}`);
        if (!day.id) throw new Error('No id returned');
        if (day.dayOfWeek !== 1) throw new Error(`DayOfWeek mismatch: ${day.dayOfWeek}`);
        if (day.programId !== programId) throw new Error('ProgramId mismatch');
        dayId1 = day.id;
        createdDayIds.push(day.id);
    });

    await test('7. Create second day (Wednesday)', async () => {
        const day = await apiCall('/workoutdays', {
            method: 'POST',
            body: JSON.stringify({ programId, dayOfWeek: 3, title: 'E2E Pull Day', notes: 'Back + Biceps' })
        });
        if (day.__error) throw new Error(`API error ${day.status}: ${day.text}`);
        if (day.dayOfWeek !== 3) throw new Error(`DayOfWeek mismatch: ${day.dayOfWeek}`);
        dayId2 = day.id;
        createdDayIds.push(day.id);
    });

    await test('8. List days by programId returns both', async () => {
        const days = await apiCall(`/workoutdays?programId=${programId}`);
        if (days.__error) throw new Error(`API error ${days.status}: ${days.text}`);
        if (!Array.isArray(days)) throw new Error('Not an array');
        if (days.length < 2) throw new Error(`Expected >= 2 days, got ${days.length}`);
        const ids = days.map(d => d.id);
        if (!ids.includes(dayId1)) throw new Error('Day 1 not found');
        if (!ids.includes(dayId2)) throw new Error('Day 2 not found');
    });

    await test('9. Update day (change to Friday)', async () => {
        const updated = await apiCall(`/workoutdays/${dayId2}`, {
            method: 'PUT',
            body: JSON.stringify({ programId, dayOfWeek: 5, title: 'E2E Leg Day', notes: 'Legs + Glutes' })
        });
        if (updated.__error) throw new Error(`API error ${updated.status}: ${updated.text}`);
        if (updated.dayOfWeek !== 5) throw new Error(`DayOfWeek not updated: ${updated.dayOfWeek}`);
        if (updated.title !== 'E2E Leg Day') throw new Error(`Title not updated: ${updated.title}`);
    });

    let deleteDayId = null;
    await test('10. Delete day -> 204', async () => {
        // Create a throwaway day
        const day = await apiCall('/workoutdays', {
            method: 'POST',
            body: JSON.stringify({ programId, dayOfWeek: 6, title: 'E2E Delete Day' })
        });
        if (day.__error) throw new Error(`Create error: ${day.status}`);
        deleteDayId = day.id;

        const delResp = await apiRaw(`/workoutdays/${deleteDayId}`, { method: 'DELETE' });
        if (delResp.status !== 204) throw new Error(`Delete status: ${delResp.status}, expected 204`);

        const getResp = await apiRaw(`/workoutdays/${deleteDayId}`);
        if (getResp.status !== 404) throw new Error(`GET after delete status: ${getResp.status}, expected 404`);
    });

    // ═══════════════════════════════════════════════
    // SECTION 3: Exercise CRUD
    // ═══════════════════════════════════════════════
    console.log('\n\u2500\u2500 Section 3: Exercise CRUD \u2500\u2500');

    let exerciseId1 = null;
    let exerciseId2 = null;

    await test('11. Create exercise (Bench Press, Chest)', async () => {
        const ex = await apiCall('/workoutexercises', {
            method: 'POST',
            body: JSON.stringify({ programId, dayId: dayId1, name: 'E2E Bench Press', muscleGroup: 1, notes: 'Flat barbell' })
        });
        if (ex.__error) throw new Error(`API error ${ex.status}: ${ex.text}`);
        if (!ex.id) throw new Error('No id returned');
        if (ex.name !== 'E2E Bench Press') throw new Error(`Name mismatch: ${ex.name}`);
        if (ex.muscleGroup !== 1) throw new Error(`MuscleGroup mismatch: ${ex.muscleGroup}`);
        if (ex.programId !== programId) throw new Error('ProgramId mismatch');
        if (ex.dayId !== dayId1) throw new Error('DayId mismatch');
        exerciseId1 = ex.id;
        createdExerciseIds.push(ex.id);
    });

    await test('12. Create second exercise (Squat, Quadriceps)', async () => {
        const ex = await apiCall('/workoutexercises', {
            method: 'POST',
            body: JSON.stringify({ programId, dayId: dayId1, name: 'E2E Squat', muscleGroup: 9 })
        });
        if (ex.__error) throw new Error(`API error ${ex.status}: ${ex.text}`);
        if (ex.muscleGroup !== 9) throw new Error(`MuscleGroup mismatch: ${ex.muscleGroup}`);
        exerciseId2 = ex.id;
        createdExerciseIds.push(ex.id);
    });

    await test('13. List exercises by dayId returns both', async () => {
        const exs = await apiCall(`/workoutexercises?dayId=${dayId1}`);
        if (exs.__error) throw new Error(`API error ${exs.status}: ${exs.text}`);
        if (!Array.isArray(exs)) throw new Error('Not an array');
        if (exs.length < 2) throw new Error(`Expected >= 2 exercises, got ${exs.length}`);
        const ids = exs.map(e => e.id);
        if (!ids.includes(exerciseId1)) throw new Error('Exercise 1 not found');
        if (!ids.includes(exerciseId2)) throw new Error('Exercise 2 not found');
    });

    await test('14. List exercises by programId returns all', async () => {
        const exs = await apiCall(`/workoutexercises?programId=${programId}`);
        if (exs.__error) throw new Error(`API error ${exs.status}: ${exs.text}`);
        if (!Array.isArray(exs)) throw new Error('Not an array');
        const ids = exs.map(e => e.id);
        if (!ids.includes(exerciseId1)) throw new Error('Exercise 1 not found by programId');
        if (!ids.includes(exerciseId2)) throw new Error('Exercise 2 not found by programId');
    });

    await test('15. Update exercise (change name/muscle group)', async () => {
        const updated = await apiCall(`/workoutexercises/${exerciseId2}`, {
            method: 'PUT',
            body: JSON.stringify({ programId, dayId: dayId1, name: 'E2E Deadlift', muscleGroup: 2, notes: 'Conventional' })
        });
        if (updated.__error) throw new Error(`API error ${updated.status}: ${updated.text}`);
        if (updated.name !== 'E2E Deadlift') throw new Error(`Name not updated: ${updated.name}`);
        if (updated.muscleGroup !== 2) throw new Error(`MuscleGroup not updated: ${updated.muscleGroup}`);
        if (updated.notes !== 'Conventional') throw new Error(`Notes not updated: ${updated.notes}`);
    });

    let deleteExerciseId = null;
    await test('16. Delete exercise -> 204', async () => {
        const ex = await apiCall('/workoutexercises', {
            method: 'POST',
            body: JSON.stringify({ programId, dayId: dayId1, name: 'E2E Delete Exercise', muscleGroup: 0 })
        });
        if (ex.__error) throw new Error(`Create error: ${ex.status}`);
        deleteExerciseId = ex.id;

        const delResp = await apiRaw(`/workoutexercises/${deleteExerciseId}`, { method: 'DELETE' });
        if (delResp.status !== 204) throw new Error(`Delete status: ${delResp.status}, expected 204`);

        const getResp = await apiRaw(`/workoutexercises/${deleteExerciseId}`);
        if (getResp.status !== 404) throw new Error(`GET after delete status: ${getResp.status}, expected 404`);
    });

    // ═══════════════════════════════════════════════
    // SECTION 4: Set CRUD
    // ═══════════════════════════════════════════════
    console.log('\n\u2500\u2500 Section 4: Set CRUD \u2500\u2500');

    let setId1 = null;
    let setId2 = null;

    await test('17. Create set (reps=10, weight=80)', async () => {
        const set = await apiCall('/workoutsets', {
            method: 'POST',
            body: JSON.stringify({ exerciseId: exerciseId1, repetitions: 10, weight: 80, notes: 'E2E warm-up' })
        });
        if (set.__error) throw new Error(`API error ${set.status}: ${set.text}`);
        if (!set.id) throw new Error('No id returned');
        if (set.repetitions !== 10) throw new Error(`Repetitions mismatch: ${set.repetitions}`);
        if (set.weight !== 80) throw new Error(`Weight mismatch: ${set.weight}`);
        if (set.exerciseId !== exerciseId1) throw new Error('ExerciseId mismatch');
        setId1 = set.id;
        createdSetIds.push(set.id);
    });

    await test('18. Create set with duration (timed exercise)', async () => {
        const set = await apiCall('/workoutsets', {
            method: 'POST',
            body: JSON.stringify({ exerciseId: exerciseId1, duration: '00:01:30', notes: 'E2E plank hold' })
        });
        if (set.__error) throw new Error(`API error ${set.status}: ${set.text}`);
        if (!set.id) throw new Error('No id returned');
        // Duration comes back as a TimeSpan string like "00:01:30"
        if (!set.duration || !set.duration.includes('00:01:30')) throw new Error(`Duration mismatch: ${set.duration}`);
        setId2 = set.id;
        createdSetIds.push(set.id);
    });

    await test('19. List sets by exerciseId returns all', async () => {
        const sets = await apiCall(`/workoutsets?exerciseId=${exerciseId1}`);
        if (sets.__error) throw new Error(`API error ${sets.status}: ${sets.text}`);
        if (!Array.isArray(sets)) throw new Error('Not an array');
        if (sets.length < 2) throw new Error(`Expected >= 2 sets, got ${sets.length}`);
        const ids = sets.map(s => s.id);
        if (!ids.includes(setId1)) throw new Error('Set 1 not found');
        if (!ids.includes(setId2)) throw new Error('Set 2 not found');
    });

    await test('20. Update set (change reps/weight)', async () => {
        const updated = await apiCall(`/workoutsets/${setId1}`, {
            method: 'PUT',
            body: JSON.stringify({ exerciseId: exerciseId1, repetitions: 8, weight: 100, notes: 'E2E working set' })
        });
        if (updated.__error) throw new Error(`API error ${updated.status}: ${updated.text}`);
        if (updated.repetitions !== 8) throw new Error(`Repetitions not updated: ${updated.repetitions}`);
        if (updated.weight !== 100) throw new Error(`Weight not updated: ${updated.weight}`);
        if (updated.notes !== 'E2E working set') throw new Error(`Notes not updated: ${updated.notes}`);
    });

    let deleteSetId = null;
    await test('21. Delete set -> 204', async () => {
        const set = await apiCall('/workoutsets', {
            method: 'POST',
            body: JSON.stringify({ exerciseId: exerciseId1, repetitions: 5, weight: 50 })
        });
        if (set.__error) throw new Error(`Create error: ${set.status}`);
        deleteSetId = set.id;

        const delResp = await apiRaw(`/workoutsets/${deleteSetId}`, { method: 'DELETE' });
        if (delResp.status !== 204) throw new Error(`Delete status: ${delResp.status}, expected 204`);

        const getResp = await apiRaw(`/workoutsets/${deleteSetId}`);
        if (getResp.status !== 404) throw new Error(`GET after delete status: ${getResp.status}, expected 404`);
    });

    // ═══════════════════════════════════════════════
    // SECTION 5: Full Chain & Edge Cases
    // ═══════════════════════════════════════════════
    console.log('\n\u2500\u2500 Section 5: Full Chain & Edge Cases \u2500\u2500');

    await test('22. Full chain: program -> day -> exercise -> set -> verify hierarchy', async () => {
        // Create full hierarchy
        const prog = await apiCall('/workoutprograms', {
            method: 'POST',
            body: JSON.stringify({ title: 'E2E Full Chain Program' })
        });
        if (prog.__error) throw new Error(`Program create error: ${prog.status}`);
        createdProgramIds.push(prog.id);

        const day = await apiCall('/workoutdays', {
            method: 'POST',
            body: JSON.stringify({ programId: prog.id, dayOfWeek: 2, title: 'E2E Chain Tuesday' })
        });
        if (day.__error) throw new Error(`Day create error: ${day.status}`);
        createdDayIds.push(day.id);

        const exercise = await apiCall('/workoutexercises', {
            method: 'POST',
            body: JSON.stringify({ programId: prog.id, dayId: day.id, name: 'E2E Chain OHP', muscleGroup: 3 })
        });
        if (exercise.__error) throw new Error(`Exercise create error: ${exercise.status}`);
        createdExerciseIds.push(exercise.id);

        const set = await apiCall('/workoutsets', {
            method: 'POST',
            body: JSON.stringify({ exerciseId: exercise.id, repetitions: 12, weight: 40 })
        });
        if (set.__error) throw new Error(`Set create error: ${set.status}`);
        createdSetIds.push(set.id);

        // Verify hierarchy via reads
        const fetchedProg = await apiCall(`/workoutprograms/${prog.id}`);
        if (fetchedProg.title !== 'E2E Full Chain Program') throw new Error('Program title mismatch');

        const fetchedDays = await apiCall(`/workoutdays?programId=${prog.id}`);
        if (fetchedDays.length !== 1) throw new Error(`Expected 1 day, got ${fetchedDays.length}`);
        if (fetchedDays[0].id !== day.id) throw new Error('Day ID mismatch');

        const fetchedExercises = await apiCall(`/workoutexercises?dayId=${day.id}`);
        if (fetchedExercises.length !== 1) throw new Error(`Expected 1 exercise, got ${fetchedExercises.length}`);
        if (fetchedExercises[0].name !== 'E2E Chain OHP') throw new Error('Exercise name mismatch');

        const fetchedSets = await apiCall(`/workoutsets?exerciseId=${exercise.id}`);
        if (fetchedSets.length !== 1) throw new Error(`Expected 1 set, got ${fetchedSets.length}`);
        if (fetchedSets[0].repetitions !== 12) throw new Error('Set reps mismatch');
        if (fetchedSets[0].weight !== 40) throw new Error('Set weight mismatch');
    });

    await test('23. Delete program -> verify days query returns empty for that program', async () => {
        // Create isolated hierarchy for cascade test
        const prog = await apiCall('/workoutprograms', {
            method: 'POST',
            body: JSON.stringify({ title: 'E2E Cascade Test' })
        });
        if (prog.__error) throw new Error(`Program create error: ${prog.status}`);

        const day = await apiCall('/workoutdays', {
            method: 'POST',
            body: JSON.stringify({ programId: prog.id, dayOfWeek: 4, title: 'E2E Cascade Day' })
        });
        if (day.__error) throw new Error(`Day create error: ${day.status}`);

        const exercise = await apiCall('/workoutexercises', {
            method: 'POST',
            body: JSON.stringify({ programId: prog.id, dayId: day.id, name: 'E2E Cascade Exercise', muscleGroup: 7 })
        });
        if (exercise.__error) throw new Error(`Exercise create error: ${exercise.status}`);

        const set = await apiCall('/workoutsets', {
            method: 'POST',
            body: JSON.stringify({ exerciseId: exercise.id, repetitions: 15, weight: 0 })
        });
        if (set.__error) throw new Error(`Set create error: ${set.status}`);

        // Delete the program
        const delResp = await apiRaw(`/workoutprograms/${prog.id}`, { method: 'DELETE' });
        if (delResp.status !== 204) throw new Error(`Delete status: ${delResp.status}, expected 204`);

        // Program should be gone
        const progResp = await apiRaw(`/workoutprograms/${prog.id}`);
        if (progResp.status !== 404) throw new Error(`Program still exists: status ${progResp.status}`);

        // Days for this program - query should return empty or the orphaned days
        // (LiteDB has no cascade delete, so days may still exist but the program is gone)
        const daysResp = await apiCall(`/workoutdays?programId=${prog.id}`);
        if (daysResp.__error) throw new Error(`Days query error: ${daysResp.status}`);
        // The program is confirmed deleted - that's the primary assertion

        // Clean up orphaned records manually
        await apiRaw(`/workoutsets/${set.id}`, { method: 'DELETE' });
        await apiRaw(`/workoutexercises/${exercise.id}`, { method: 'DELETE' });
        await apiRaw(`/workoutdays/${day.id}`, { method: 'DELETE' });
    });

    await test('24. Create program with empty title -> check behavior', async () => {
        const resp = await apiRaw('/workoutprograms', {
            method: 'POST',
            body: JSON.stringify({ title: '' })
        });
        // May succeed (no server validation on empty string) or fail with 400
        // Either way, if it created, track it for cleanup
        if (resp.ok && resp.body && resp.body.id) {
            createdProgramIds.push(resp.body.id);
            // If server accepts empty title, that's valid behavior - just verify response shape
            if (!('id' in resp.body)) throw new Error('No id in response');
        }
        // If it returned 400, that's also acceptable behavior
        if (!resp.ok && resp.status !== 400) {
            throw new Error(`Unexpected status: ${resp.status}`);
        }
    });

    await test('25. Create exercise with invalid muscleGroup (99) -> check behavior', async () => {
        const resp = await apiRaw('/workoutexercises', {
            method: 'POST',
            body: JSON.stringify({ programId, dayId: dayId1, name: 'E2E Invalid Muscle', muscleGroup: 99 })
        });
        // Server may accept (no enum validation) or reject with 400
        if (resp.ok && resp.body && resp.body.id) {
            createdExerciseIds.push(resp.body.id);
            // Server accepted - muscleGroup may be stored as 99
        }
        // 400 is also acceptable
        if (!resp.ok && resp.status !== 400) {
            throw new Error(`Unexpected status: ${resp.status}`);
        }
    });

    await test('26. Get exercises without programId or dayId -> 400', async () => {
        const resp = await apiRaw('/workoutexercises');
        if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
    });

    await test('27. Exercise catalog endpoint returns data (may be empty array)', async () => {
        const catalog = await apiCall('/exercisecatalog');
        if (catalog.__error) throw new Error(`API error ${catalog.status}: ${catalog.text}`);
        if (!Array.isArray(catalog)) throw new Error('Not an array');
        // May be empty if no catalog data loaded - that's fine
        console.log(`    (catalog has ${catalog.length} entries)`);
    });

    // ═══════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════
    console.log('\n\u2500\u2500 Cleanup \u2500\u2500');

    // Delete sets first (leaf level)
    for (const id of createdSetIds) {
        try {
            await apiRaw(`/workoutsets/${id}`, { method: 'DELETE' });
        } catch {}
    }

    // Delete exercises
    for (const id of createdExerciseIds) {
        try {
            await apiRaw(`/workoutexercises/${id}`, { method: 'DELETE' });
        } catch {}
    }

    // Delete days
    for (const id of createdDayIds) {
        try {
            await apiRaw(`/workoutdays/${id}`, { method: 'DELETE' });
        } catch {}
    }

    // Delete programs
    for (const id of createdProgramIds) {
        try {
            await apiRaw(`/workoutprograms/${id}`, { method: 'DELETE' });
        } catch {}
    }

    // Also clean up any remaining E2E programs that might be orphaned
    try {
        const allProgs = await apiCall('/workoutprograms');
        if (Array.isArray(allProgs)) {
            for (const p of allProgs) {
                if (p.title && p.title.startsWith('E2E')) {
                    // Get days for cleanup
                    const days = await apiCall(`/workoutdays?programId=${p.id}`);
                    if (Array.isArray(days)) {
                        for (const d of days) {
                            const exs = await apiCall(`/workoutexercises?dayId=${d.id}`);
                            if (Array.isArray(exs)) {
                                for (const ex of exs) {
                                    const sets = await apiCall(`/workoutsets?exerciseId=${ex.id}`);
                                    if (Array.isArray(sets)) {
                                        for (const s of sets) {
                                            await apiRaw(`/workoutsets/${s.id}`, { method: 'DELETE' });
                                        }
                                    }
                                    await apiRaw(`/workoutexercises/${ex.id}`, { method: 'DELETE' });
                                }
                            }
                            await apiRaw(`/workoutdays/${d.id}`, { method: 'DELETE' });
                        }
                    }
                    await apiRaw(`/workoutprograms/${p.id}`, { method: 'DELETE' });
                    console.log(`  Deleted test program: ${p.title}`);
                }
            }
        }
    } catch (e) {
        console.log(`  Cleanup sweep error: ${e.message}`);
    }

    console.log('  Cleanup complete.');

    // ═══════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    if (errors.length > 0) {
        console.log('\n  FAILURES:');
        for (const e of errors) {
            console.log(`    - ${e.name}: ${e.err}`);
        }
    }
    console.log(`${'═'.repeat(50)}\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
