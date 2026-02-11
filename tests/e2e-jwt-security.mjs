import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5000';
let browser, page;
let passed = 0, failed = 0, skipped = 0;
const errors = [];
let savedToken = null;
let savedUser = null;
let savedCode = null;

function ok(name) { passed++; console.log(`  ✅ ${name}`); }
function fail(name, err) { failed++; errors.push({ name, err: err.toString() }); console.log(`  ❌ ${name}: ${err}`); }
function skip(name, reason) { skipped++; console.log(`  ⏭️  ${name}: ${reason}`); }
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
            body: JSON.stringify({ email: 'e2e-jwt@test.local' })
        });
        return r.json();
    }, BASE);
    if (!resp.devCode) throw new Error('No devCode');
    savedCode = resp.devCode;
    const verify = await page.evaluate(async (base, email, code) => {
        const r = await fetch(`${base}/api/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        return r.json();
    }, BASE, 'e2e-jwt@test.local', resp.devCode);
    if (!verify.token) throw new Error('No token');
    savedToken = verify.token;
    savedUser = verify.user;
    return savedToken;
}

async function apiRaw(path, options = {}, token = null) {
    const tok = token || savedToken;
    return page.evaluate(async (base, p, opts, t) => {
        const headers = { ...(opts.headers || {}) };
        if (t) headers['Authorization'] = `Bearer ${t}`;
        if (!opts.skipContentType) headers['Content-Type'] = 'application/json';
        const r = await fetch(`${base}/api${p}`, { ...opts, headers });
        let body = null;
        try { body = await r.json(); } catch {}
        return { status: r.status, ok: r.ok, body };
    }, BASE, path, options, tok);
}

// Send raw request with fully custom Authorization header (no auto Bearer prefix)
async function apiRawHeader(path, authHeaderValue) {
    return page.evaluate(async (base, p, authVal) => {
        const headers = { 'Content-Type': 'application/json' };
        if (authVal !== null && authVal !== undefined) {
            headers['Authorization'] = authVal;
        }
        const r = await fetch(`${base}/api${p}`, { headers });
        let body = null;
        try { body = await r.json(); } catch {}
        return { status: r.status, ok: r.ok, body };
    }, BASE, path, authHeaderValue);
}

// Send request with token in a custom header (not Authorization)
async function apiWrongHeader(path, headerName, token) {
    return page.evaluate(async (base, p, hName, t) => {
        const headers = { 'Content-Type': 'application/json' };
        headers[hName] = `Bearer ${t}`;
        const r = await fetch(`${base}/api${p}`, { headers });
        let body = null;
        try { body = await r.json(); } catch {}
        return { status: r.status, ok: r.ok, body };
    }, BASE, path, headerName, token);
}

// Tamper with JWT token — modifies payload claims and re-encodes (invalid signature)
async function tamperToken(token, modifications) {
    return page.evaluate((tok, mods) => {
        function b64urlDecode(str) {
            str = str.replace(/-/g, '+').replace(/_/g, '/');
            while (str.length % 4) str += '=';
            return atob(str);
        }
        function b64urlEncode(str) {
            return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        }

        const parts = tok.split('.');
        const payload = JSON.parse(b64urlDecode(parts[1]));
        for (const [key, value] of Object.entries(mods)) {
            payload[key] = value;
        }
        parts[1] = b64urlEncode(JSON.stringify(payload));
        return parts.join('.');
    }, token, modifications);
}

// Craft a completely custom JWT (header + payload, custom or no signature)
async function craftToken(header, payload, signature) {
    return page.evaluate((hdr, pld, sig) => {
        function b64urlEncode(str) {
            return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        }
        const h = b64urlEncode(JSON.stringify(hdr));
        const p = b64urlEncode(JSON.stringify(pld));
        return `${h}.${p}.${sig || ''}`;
    }, header, payload, signature || '');
}

(async () => {
    console.log('\n🔑 JWT SECURITY E2E TESTS\n');

    browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // Navigate to app so we have a page context for fetch calls
    await page.goto(BASE, { waitUntil: 'networkidle2' });

    // ═══════════════════════════════════════════════════════════════
    // AUTH: Get a valid token for testing
    // ═══════════════════════════════════════════════════════════════
    console.log('── Auth Setup ──');
    try {
        await login();
        ok('Login via email code — got valid JWT');
    } catch (e) {
        fail('Login', e.message);
        console.log('\n⚠️  Cannot proceed without a valid token. Aborting.\n');
        await browser.close();
        process.exit(1);
    }

    const PROTECTED = '/drugs';

    // ═══════════════════════════════════════════════════════════════
    // SECTION 1: Token Validation
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── Section 1: Token Validation ──');

    await test('1. No token → 401 on protected endpoint', async () => {
        const resp = await page.evaluate(async (base, path) => {
            const r = await fetch(`${base}/api${path}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            return { status: r.status };
        }, BASE, PROTECTED);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    await test('2. Empty Authorization header → 401', async () => {
        const resp = await apiRawHeader(PROTECTED, '');
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    await test('3. "Bearer " with no token → 401', async () => {
        const resp = await apiRawHeader(PROTECTED, 'Bearer ');
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    await test('4. Completely random string as token → 401', async () => {
        const resp = await apiRawHeader(PROTECTED, 'Bearer totally.not.a.jwt.token.at.all');
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    await test('5. Well-formed JWT but wrong signature → 401', async () => {
        // Take the valid token, flip some chars in the signature segment
        const corruptedToken = await page.evaluate((tok) => {
            const parts = tok.split('.');
            // Corrupt the signature by reversing it
            const sig = parts[2];
            parts[2] = sig.split('').reverse().join('');
            return parts.join('.');
        }, savedToken);
        const resp = await apiRawHeader(PROTECTED, `Bearer ${corruptedToken}`);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // SECTION 2: Token Tampering
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── Section 2: Token Tampering ──');

    await test('6. Tamper role claim to "admin" → 401 (signature mismatch)', async () => {
        const tampered = await tamperToken(savedToken, { role: 'admin' });
        const resp = await apiRawHeader(PROTECTED, `Bearer ${tampered}`);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    await test('7. Tamper sub claim to different user GUID → 401', async () => {
        const tampered = await tamperToken(savedToken, { sub: '00000000-0000-0000-0000-000000000000' });
        const resp = await apiRawHeader(PROTECTED, `Bearer ${tampered}`);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    await test('8. Tamper email to admin email → 401', async () => {
        const tampered = await tamperToken(savedToken, { email: 'admin@bloodtracker.app' });
        const resp = await apiRawHeader(PROTECTED, `Bearer ${tampered}`);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // SECTION 3: Algorithm Attacks
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── Section 3: Algorithm Attacks ──');

    await test('9. Craft token with alg:"none" (no signature) → 401', async () => {
        // Decode the valid payload to reuse its claims
        const payload = await page.evaluate((tok) => {
            function b64urlDecode(str) {
                str = str.replace(/-/g, '+').replace(/_/g, '/');
                while (str.length % 4) str += '=';
                return atob(str);
            }
            return JSON.parse(b64urlDecode(tok.split('.')[1]));
        }, savedToken);

        const noneToken = await craftToken(
            { alg: 'none', typ: 'JWT' },
            payload,
            '' // no signature
        );
        const resp = await apiRawHeader(PROTECTED, `Bearer ${noneToken}`);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    await test('10. Craft token with empty signature segment → 401', async () => {
        // Take valid header+payload but empty signature
        const emptySignatureToken = await page.evaluate((tok) => {
            const parts = tok.split('.');
            return `${parts[0]}.${parts[1]}.`;
        }, savedToken);
        const resp = await apiRawHeader(PROTECTED, `Bearer ${emptySignatureToken}`);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // SECTION 4: Token Lifecycle
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── Section 4: Token Lifecycle ──');

    await test('11. Valid token works on all protected endpoints', async () => {
        const endpoints = ['/drugs', '/analyses', '/courses/dashboard'];
        for (const ep of endpoints) {
            const resp = await apiRaw(ep);
            if (resp.status === 401) throw new Error(`${ep} returned 401 with valid token`);
            // 200 or 404 or empty is fine — just not 401
            if (resp.status >= 500) throw new Error(`${ep} returned ${resp.status}`);
        }
    });

    await test('12. Auth code can only be used once (replay fails)', async () => {
        // savedCode was already used during login(). Try to use it again.
        if (!savedCode) throw new Error('No saved code from login');
        const replay = await page.evaluate(async (base, email, code) => {
            const r = await fetch(`${base}/api/auth/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            return { status: r.status, body: await r.json() };
        }, BASE, 'e2e-jwt@test.local', savedCode);
        if (replay.status !== 401) throw new Error(`Expected 401 on code reuse, got ${replay.status}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // SECTION 5: Header Injection
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── Section 5: Header Injection ──');

    await test('13. "Basic" scheme instead of "Bearer" → 401', async () => {
        const resp = await apiRawHeader(PROTECTED, `Basic ${savedToken}`);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    await test('14. Token in wrong header (X-Auth-Token) → 401', async () => {
        const resp = await apiWrongHeader(PROTECTED, 'X-Auth-Token', savedToken);
        if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  RESULTS: ${passed} passed | ${failed} failed | ${skipped} skipped`);
    if (errors.length > 0) {
        console.log('\n  Failures:');
        for (const { name, err } of errors) {
            console.log(`    - ${name}: ${err}`);
        }
    }
    console.log(`${'═'.repeat(50)}\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
