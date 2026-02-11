import puppeteer from 'puppeteer';

// ═══════════════════════════════════════════════════════════════════════════════
// E2E FULL TEST SUITE: API + Frontend + UI + Integration
// Covers: Drug Catalog, Encyclopedia, Purchase Tracking, Modals, Navigation,
//         Badges, Inventory Breakdown, All Drug Types, CSS, Auth
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = 'http://localhost:5000';
let browser, page;
let passed = 0, failed = 0, skipped = 0;
const errors = [];

function ok(name) { passed++; console.log(`  ✅ ${name}`); }
function fail(name, err) { failed++; errors.push({ name, err: err.toString() }); console.log(`  ❌ ${name}: ${err}`); }
function skip(name, reason) { skipped++; console.log(`  ⏭️  ${name}: ${reason}`); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function test(name, fn) {
    try { await fn(); ok(name); }
    catch (e) { fail(name, e.message); }
}

// ─── Auth Helper: tries multiple email addresses for devCode fallback ───
async function login() {
    const emails = ['e2e-full@test.local', 'e2e-fallback@test.local', 'e2e-alt@puppeteer.local'];

    for (const email of emails) {
        try {
            const sendResp = await page.evaluate(async (base, em) => {
                const r = await fetch(`${base}/api/auth/send-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: em })
                });
                return r.json();
            }, BASE, email);

            if (!sendResp.devCode) continue;

            const verifyResp = await page.evaluate(async (base, em, code) => {
                const r = await fetch(`${base}/api/auth/verify-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: em, code })
                });
                return r.json();
            }, BASE, email, sendResp.devCode);

            if (!verifyResp.token) continue;

            savedToken = verifyResp.token;
            savedUser = verifyResp.user;
            await page.evaluate((token, user) => {
                localStorage.setItem('bt_token', token);
                localStorage.setItem('bt_user', JSON.stringify(user));
            }, verifyResp.token, verifyResp.user);

            return verifyResp.token;
        } catch {
            continue;
        }
    }
    throw new Error('All login attempts failed (SMTP active, no devCode)');
}

// Saved token value (not relying on localStorage which can be cleared by anti-reload guard)
let savedToken = null;
let savedUser = null;

// Helper: navigate and re-inject token after page load
async function gotoAndAuth(url) {
    await page.goto(url, { waitUntil: 'networkidle2' });
    if (savedToken) {
        await page.evaluate((t, u) => {
            localStorage.setItem('bt_token', t);
            if (u) localStorage.setItem('bt_user', JSON.stringify(u));
        }, savedToken, savedUser);
    }
}

// ─── API Helper (uses savedToken directly) ───
async function apiCall(path, options = {}) {
    return page.evaluate(async (base, p, opts, tok) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tok}`,
            ...(opts.headers || {})
        };
        const r = await fetch(`${base}/api${p}`, { ...opts, headers });
        if (r.status === 204) return null;
        if (!r.ok) return { __error: true, status: r.status, statusText: r.statusText };
        return r.json();
    }, BASE, path, options, savedToken);
}

// ─── Raw fetch (returns status + body) ───
async function apiRaw(path, options = {}) {
    return page.evaluate(async (base, p, opts, tok) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tok}`,
            ...(opts.headers || {})
        };
        const r = await fetch(`${base}/api${p}`, { ...opts, headers });
        let body = null;
        try { body = await r.json(); } catch {}
        return { status: r.status, ok: r.ok, body };
    }, BASE, path, options, savedToken);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
(async () => {
    console.log('\n🧪 E2E FULL TEST SUITE\n');
    console.log(`  Target: ${BASE}`);
    console.log(`  Date: ${new Date().toISOString()}\n`);

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

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 0: Authentication
    // ═══════════════════════════════════════════════════════════════════════
    console.log('══ PHASE 0: Auth ══');

    await gotoAndAuth(BASE);
    let token;
    await test('Login via email code', async () => {
        token = await login();
        if (!token) throw new Error('Token is falsy');
    });

    if (!token) {
        console.log('\n⚠️  Auth failed — running structure-only tests\n');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: HTML Structure & DOM
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ PHASE 1: HTML Structure & DOM ══');

    await gotoAndAuth(BASE);

    await test('Page loads with correct title', async () => {
        const title = await page.title();
        if (!title.includes('BloodTracker')) throw new Error(`Title: ${title}`);
    });

    // Navigation
    await test('All 7 navigation tabs exist', async () => {
        const tabs = await page.$$eval('nav [data-page]', els => els.map(e => e.dataset.page));
        const expected = ['dashboard', 'course', 'analyses', 'compare', 'workouts', 'encyclopedia', 'ascii-studio'];
        for (const t of expected) {
            if (!tabs.includes(t)) throw new Error(`Missing tab: ${t}`);
        }
    });

    await test('Admin tab hidden by default', async () => {
        const display = await page.$eval('#admin-nav-btn', el => getComputedStyle(el).display);
        if (display !== 'none') throw new Error(`Admin tab visible: ${display}`);
    });

    // Encyclopedia page structure
    await test('Encyclopedia page section exists', async () => {
        const el = await page.$('#encyclopedia');
        if (!el) throw new Error('#encyclopedia not found');
    });

    await test('Encyclopedia has search input', async () => {
        const el = await page.$('#encyclopedia-search');
        if (!el) throw new Error('#encyclopedia-search not found');
    });

    await test('Encyclopedia has category tabs container', async () => {
        const el = await page.$('#encyclopedia-tabs');
        if (!el) throw new Error('#encyclopedia-tabs not found');
    });

    await test('Encyclopedia has substance grid', async () => {
        const el = await page.$('#encyclopedia-grid');
        if (!el) throw new Error('#encyclopedia-grid not found');
    });

    await test('Encyclopedia has manufacturer tabs (All/ФАРМА/UGL)', async () => {
        const tabs = await page.$$eval('#mfr-tabs .encyclopedia-tab', els =>
            els.map(e => e.textContent.trim())
        );
        if (!tabs.includes('ВСЕ')) throw new Error('Missing ВСЕ tab');
        if (!tabs.includes('ФАРМА')) throw new Error('Missing ФАРМА tab');
        if (!tabs.includes('UGL')) throw new Error('Missing UGL tab');
    });

    await test('Encyclopedia has manufacturer grid', async () => {
        const el = await page.$('#mfr-grid');
        if (!el) throw new Error('#mfr-grid not found');
    });

    // Drug modal structure
    await test('Drug modal has catalog autocomplete', async () => {
        const el = await page.$('#drug-catalog-search');
        if (!el) throw new Error('#drug-catalog-search not found');
        const hidden = await page.$('#drug-catalog-id');
        if (!hidden) throw new Error('#drug-catalog-id not found');
        const dropdown = await page.$('#drug-catalog-dropdown');
        if (!dropdown) throw new Error('#drug-catalog-dropdown not found');
    });

    await test('Drug modal has substance info panel', async () => {
        const el = await page.$('#substance-info-panel');
        if (!el) throw new Error('#substance-info-panel not found');
    });

    await test('Drug modal has manufacturer dropdown', async () => {
        const search = await page.$('#drug-mfr-search');
        if (!search) throw new Error('#drug-mfr-search not found');
        const hidden = await page.$('#drug-mfr-id');
        if (!hidden) throw new Error('#drug-mfr-id not found');
        const dropdown = await page.$('#drug-mfr-dropdown');
        if (!dropdown) throw new Error('#drug-mfr-dropdown not found');
    });

    await test('Drug modal has 5 drug types', async () => {
        const options = await page.$$eval('#drug-type option', els => els.map(e => e.value));
        if (options.length !== 5) throw new Error(`Expected 5 types, got ${options.length}: ${options}`);
        for (let i = 0; i < 5; i++) {
            if (!options.includes(String(i))) throw new Error(`Missing type ${i}`);
        }
    });

    await test('Drug type labels are correct', async () => {
        const labels = await page.$$eval('#drug-type option', els => els.map(e => e.textContent.trim()));
        const expected = ['ОРАЛЬНЫЙ', 'ИНЪЕКЦИОННЫЙ', 'ПОДКОЖНЫЙ', 'ТРАНСДЕРМАЛЬНЫЙ', 'НАЗАЛЬНЫЙ'];
        for (const lbl of expected) {
            if (!labels.some(l => l.includes(lbl))) throw new Error(`Missing label: ${lbl}`);
        }
    });

    // Drug modal field order
    await test('Drug modal field order: catalog → name → type → dosage → mfr → amount → schedule → notes', async () => {
        const html = await page.$eval('#drug-modal .modal-body', el => el.innerHTML);
        const catalogIdx = html.indexOf('drug-catalog-search');
        const nameIdx = html.indexOf('drug-name');
        const typeIdx = html.indexOf('drug-type');
        const dosageIdx = html.indexOf('drug-dosage');
        const mfrIdx = html.indexOf('drug-mfr-search');
        const amountIdx = html.indexOf('drug-amount');
        const scheduleIdx = html.indexOf('drug-schedule');
        const notesIdx = html.indexOf('drug-notes');
        if (catalogIdx >= nameIdx) throw new Error('Catalog should be before Name');
        if (nameIdx >= typeIdx) throw new Error('Name should be before Type');
        if (typeIdx >= mfrIdx) throw new Error('Type should be before Manufacturer');
        if (mfrIdx >= amountIdx) throw new Error('Manufacturer should be before Amount');
        if (amountIdx >= notesIdx) throw new Error('Amount should be before Notes');
    });

    // Log modal structure
    await test('#log-purchase select exists', async () => {
        const el = await page.$('#log-purchase');
        if (!el) throw new Error('Not found');
    });

    await test('#log-purchase has "Авто" default', async () => {
        const text = await page.$eval('#log-purchase', el => el.options[0]?.textContent);
        if (!text.includes('Авто')) throw new Error(`First option: ${text}`);
    });

    await test('Log modal field order: date → drug → purchase → dose → note', async () => {
        const html = await page.$eval('#log-modal .modal-body', el => el.innerHTML);
        const drugIdx = html.indexOf('log-drug');
        const purchaseIdx = html.indexOf('log-purchase');
        const doseIdx = html.indexOf('log-dose');
        if (drugIdx >= purchaseIdx) throw new Error('Drug should be before Purchase');
        if (purchaseIdx >= doseIdx) throw new Error('Purchase should be before Dose');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: CSS Validation
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ PHASE 2: CSS Validation ══');

    await test('catalog.css loads successfully', async () => {
        const resp = await page.evaluate(async () => {
            const r = await fetch('/css/catalog.css');
            return { ok: r.ok, status: r.status };
        });
        if (!resp.ok) throw new Error(`Status: ${resp.status}`);
    });

    await test('CSS: .catalog-dropdown styles exist', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.catalog-dropdown {')) throw new Error('Missing .catalog-dropdown');
        if (!css.includes('.catalog-dropdown.active')) throw new Error('Missing .catalog-dropdown.active');
    });

    await test('CSS: .substance-info-panel styles exist', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.substance-info-panel {')) throw new Error('Missing');
        if (!css.includes('.substance-info-panel.active')) throw new Error('Missing .active');
    });

    await test('CSS: manufacturer dropdown styles exist', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.mfr-dropdown-list')) throw new Error('Missing .mfr-dropdown-list');
        if (!css.includes('.mfr-dropdown-item')) throw new Error('Missing .mfr-dropdown-item');
        if (!css.includes('.mfr-type-pharma')) throw new Error('Missing .mfr-type-pharma');
        if (!css.includes('.mfr-type-ugl')) throw new Error('Missing .mfr-type-ugl');
    });

    await test('CSS: all 5 drug type badge styles', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        // 3 new types in catalog.css (oral/inject are in components.css)
        if (!css.includes('.badge-subcutaneous')) throw new Error('Missing .badge-subcutaneous');
        if (!css.includes('.badge-transdermal')) throw new Error('Missing .badge-transdermal');
        if (!css.includes('.badge-nasal')) throw new Error('Missing .badge-nasal');
    });

    await test('CSS: badge-purchase styles', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.badge-purchase')) throw new Error('Missing');
    });

    await test('CSS: badge-manufacturer styles', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.badge-manufacturer')) throw new Error('Missing');
    });

    await test('CSS: badge-catalog styles', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.badge-catalog')) throw new Error('Missing');
    });

    await test('CSS: purchase-breakdown styles', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.purchase-breakdown {')) throw new Error('Missing .purchase-breakdown');
        if (!css.includes('.purchase-breakdown-line')) throw new Error('Missing .purchase-breakdown-line');
    });

    await test('CSS: encyclopedia page styles', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.encyclopedia-tabs')) throw new Error('Missing .encyclopedia-tabs');
        if (!css.includes('.encyclopedia-tab')) throw new Error('Missing .encyclopedia-tab');
        if (!css.includes('.encyclopedia-grid')) throw new Error('Missing .encyclopedia-grid');
        if (!css.includes('.encyclopedia-card')) throw new Error('Missing .encyclopedia-card');
        if (!css.includes('.encyclopedia-badge')) throw new Error('Missing .encyclopedia-badge');
    });

    await test('CSS: encyclopedia card expand styles', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.encyclopedia-card.expanded')) throw new Error('Missing .expanded');
        if (!css.includes('.encyclopedia-card-detail')) throw new Error('Missing .card-detail');
    });

    await test('CSS: category badge colors (11 categories)', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        const cats = ['aas', 'peptide', 'sarm', 'pct', 'fatburner', 'growthhormone',
            'antiestrogen', 'insulin', 'prohormone', 'dopamineagonist', 'other'];
        for (const c of cats) {
            if (!css.includes(`.cat-badge-${c}`)) throw new Error(`Missing .cat-badge-${c}`);
        }
    });

    await test('CSS: drug type badge colors (5 types)', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        const types = ['oral', 'injectable', 'subcutaneous', 'transdermal', 'nasal'];
        for (const t of types) {
            if (!css.includes(`.type-badge-${t}`)) throw new Error(`Missing .type-badge-${t}`);
        }
    });

    await test('CSS: responsive breakpoints for encyclopedia', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('@media')) throw new Error('No media queries');
        if (!css.includes('600px')) throw new Error('Missing 600px breakpoint');
    });

    await test('CSS: manufacturer grid styles', async () => {
        const css = await page.evaluate(async () => (await fetch('/css/catalog.css')).text());
        if (!css.includes('.mfr-grid')) throw new Error('Missing .mfr-grid');
        if (!css.includes('.mfr-card')) throw new Error('Missing .mfr-card');
        if (!css.includes('.mfr-card-name')) throw new Error('Missing .mfr-card-name');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3: JS Module Validation
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ PHASE 3: JS Modules ══');

    await test('api.js: catalogApi object with 5 methods', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/api.js')).text());
        if (!js.includes('catalogApi')) throw new Error('catalogApi not found');
        const methods = ['substances', 'popular', 'substance', 'manufacturers', 'manufacturer'];
        for (const m of methods) {
            if (!js.includes(`${m}:`)) throw new Error(`Missing method: ${m}`);
        }
    });

    await test('api.js: catalogApi.categories endpoint', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/api.js')).text());
        if (!js.includes('/drugcatalog/categories')) throw new Error('Missing categories endpoint');
    });

    await test('api.js: purchaseApi.options endpoint', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/api.js')).text());
        if (!js.includes('/purchases/options/')) throw new Error('Missing options endpoint');
    });

    await test('state.js: catalog state fields', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/state.js')).text());
        if (!js.includes('drugCatalog:')) throw new Error('Missing drugCatalog');
        if (!js.includes('manufacturers:')) throw new Error('Missing manufacturers');
        if (!js.includes('catalogLoaded:')) throw new Error('Missing catalogLoaded');
    });

    await test('encyclopedia.js: initEncyclopedia exported', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/encyclopedia.js')).text());
        if (!js.includes('window.initEncyclopedia')) throw new Error('initEncyclopedia not on window');
    });

    await test('encyclopedia.js: CATEGORY_NAMES has 11 entries', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/encyclopedia.js')).text());
        const cats = ['ААС', 'Пептиды', 'SARMs', 'ПКТ', 'Жиросжигатели',
            'Гормон роста', 'Антиэстрогены', 'Инсулин', 'Прогормоны', 'Агонисты дофамина', 'Другое'];
        for (const c of cats) {
            if (!js.includes(c)) throw new Error(`Missing category: ${c}`);
        }
    });

    await test('encyclopedia.js: search debounce (200ms)', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/encyclopedia.js')).text());
        if (!js.includes('200')) throw new Error('No 200ms debounce');
        if (!js.includes('setTimeout')) throw new Error('No setTimeout for debounce');
    });

    await test('encyclopedia.js: card expand/collapse', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/encyclopedia.js')).text());
        if (!js.includes("toggle('expanded')")) throw new Error('No expand toggle');
    });

    await test('modals.js: loadPurchaseOptions function', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/components/modals.js')).text());
        if (!js.includes('async function loadPurchaseOptions')) throw new Error('Not found');
    });

    await test('modals.js: clearSubstanceInfo on window', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/components/modals.js')).text());
        if (!js.includes('clearSubstanceInfo')) throw new Error('Not found');
    });

    await test('course.js: badge-purchase for intake logs', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/course.js')).text());
        if (!js.includes('badge-purchase')) throw new Error('Not found');
        if (!js.includes('purchaseLabel')) throw new Error('purchaseLabel not found');
    });

    await test('course.js: editLog button in log entries', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/course.js')).text());
        if (!js.includes("editLog('")) throw new Error('editLog not found');
    });

    await test('course.js: manufacturer badge rendering', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/course.js')).text());
        if (!js.includes('badge-manufacturer')) throw new Error('badge-manufacturer not found');
        if (!js.includes('manufacturerName')) throw new Error('manufacturerName not found');
    });

    await test('courseTabs.js: purchaseBreakdown in inventory', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/courseTabs.js')).text());
        if (!js.includes('purchaseBreakdown')) throw new Error('purchaseBreakdown not found');
        if (!js.includes('purchase-breakdown-line')) throw new Error('breakdown line not found');
        if (!js.includes('unallocatedConsumed')) throw new Error('unallocatedConsumed not found');
    });

    await test('dashboard.js: all 5 drug type badges', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/pages/dashboard.js')).text());
        if (!js.includes('badge-subcutaneous') && !js.includes('ПОДКОЖНЫЙ'))
            throw new Error('Missing subcutaneous type');
    });

    await test('main.js: encyclopedia import and init', async () => {
        const js = await page.evaluate(async () => (await fetch('/js/main.js')).text());
        if (!js.includes('encyclopedia')) throw new Error('encyclopedia not imported/referenced');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 4: Authenticated API Tests — Drug Catalog
    // ═══════════════════════════════════════════════════════════════════════
    if (token) {
        console.log('\n══ PHASE 4: Drug Catalog API ══');

        await gotoAndAuth(BASE);
        await sleep(2000);

        // Substances
        await test('GET /drugcatalog/substances returns 80+ items', async () => {
            const items = await apiCall('/drugcatalog/substances');
            if (!Array.isArray(items)) throw new Error('Not array');
            if (items.length < 80) throw new Error(`Only ${items.length} substances`);
        });

        await test('GET /drugcatalog/substances/popular returns subset', async () => {
            const popular = await apiCall('/drugcatalog/substances/popular');
            if (!Array.isArray(popular)) throw new Error('Not array');
            if (popular.length === 0) throw new Error('Empty popular list');
            const all = await apiCall('/drugcatalog/substances');
            if (popular.length >= all.length) throw new Error('Popular should be subset');
            // All popular items should have isPopular flag
            for (const p of popular) {
                if (!p.isPopular) throw new Error(`${p.name} not marked popular`);
            }
        });

        await test('Substance has required fields', async () => {
            const items = await apiCall('/drugcatalog/substances');
            const item = items[0];
            const requiredFields = ['id', 'name', 'category', 'drugType', 'isPopular', 'sortOrder'];
            for (const f of requiredFields) {
                if (!(f in item)) throw new Error(`Missing field: ${f}`);
            }
        });

        await test('GET /drugcatalog/substances?category=0 (AAS only)', async () => {
            const aas = await apiCall('/drugcatalog/substances?category=0');
            if (!Array.isArray(aas)) throw new Error('Not array');
            if (aas.length === 0) throw new Error('No AAS substances');
            for (const s of aas) {
                if (s.category !== 0) throw new Error(`${s.name} has category ${s.category}, expected 0`);
            }
        });

        await test('GET /drugcatalog/substances?search=тестостерон', async () => {
            const results = await apiCall('/drugcatalog/substances?search=%D1%82%D0%B5%D1%81%D1%82%D0%BE%D1%81%D1%82%D0%B5%D1%80%D0%BE%D0%BD');
            if (!Array.isArray(results)) throw new Error('Not array');
            if (results.length === 0) throw new Error('No results for тестостерон');
        });

        await test('GET /drugcatalog/substances?drugType=0 (oral only)', async () => {
            const oral = await apiCall('/drugcatalog/substances?drugType=0');
            if (!Array.isArray(oral)) throw new Error('Not array');
            for (const s of oral) {
                if (s.drugType !== 0) throw new Error(`${s.name} type ${s.drugType}, expected 0`);
            }
        });

        await test('GET /drugcatalog/substances/{id} returns single item', async () => {
            const all = await apiCall('/drugcatalog/substances');
            const item = await apiCall(`/drugcatalog/substances/${all[0].id}`);
            if (!item || !item.name) throw new Error('No item returned');
            if (item.id !== all[0].id) throw new Error('ID mismatch');
        });

        await test('GET /drugcatalog/substances/{invalid} returns 404', async () => {
            const resp = await apiRaw('/drugcatalog/substances/nonexistent_id_12345');
            if (resp.status !== 404) throw new Error(`Expected 404, got ${resp.status}`);
        });

        // Manufacturers
        await test('GET /drugcatalog/manufacturers returns 80+ items', async () => {
            const mfrs = await apiCall('/drugcatalog/manufacturers');
            if (!Array.isArray(mfrs)) throw new Error('Not array');
            if (mfrs.length < 80) throw new Error(`Only ${mfrs.length} manufacturers`);
        });

        await test('Manufacturer has required fields', async () => {
            const mfrs = await apiCall('/drugcatalog/manufacturers');
            const mfr = mfrs[0];
            const requiredFields = ['id', 'name', 'type', 'sortOrder'];
            for (const f of requiredFields) {
                if (!(f in mfr)) throw new Error(`Missing field: ${f}`);
            }
        });

        await test('GET /drugcatalog/manufacturers?type=0 (pharma)', async () => {
            const pharma = await apiCall('/drugcatalog/manufacturers?type=0');
            if (!Array.isArray(pharma)) throw new Error('Not array');
            if (pharma.length === 0) throw new Error('No pharma manufacturers');
            for (const m of pharma) {
                if (m.type !== 0) throw new Error(`${m.name} type ${m.type}, expected 0`);
            }
        });

        await test('GET /drugcatalog/manufacturers?type=1 (UGL)', async () => {
            const ugl = await apiCall('/drugcatalog/manufacturers?type=1');
            if (!Array.isArray(ugl)) throw new Error('Not array');
            if (ugl.length === 0) throw new Error('No UGL manufacturers');
            for (const m of ugl) {
                if (m.type !== 1) throw new Error(`${m.name} type ${m.type}, expected 1`);
            }
        });

        await test('Pharma + UGL = Total manufacturers', async () => {
            const all = await apiCall('/drugcatalog/manufacturers');
            const pharma = await apiCall('/drugcatalog/manufacturers?type=0');
            const ugl = await apiCall('/drugcatalog/manufacturers?type=1');
            if (pharma.length + ugl.length !== all.length)
                throw new Error(`${pharma.length} + ${ugl.length} != ${all.length}`);
        });

        await test('Known pharma manufacturers exist', async () => {
            const mfrs = await apiCall('/drugcatalog/manufacturers');
            const names = mfrs.map(m => m.name);
            for (const req of ['Sandoz (Novartis)', 'Norma Hellas', 'Aburaihan Co']) {
                if (!names.includes(req)) throw new Error(`Missing: ${req}`);
            }
        });

        await test('Known UGL manufacturers exist', async () => {
            const mfrs = await apiCall('/drugcatalog/manufacturers');
            const names = mfrs.map(m => m.name);
            for (const req of ['Andras Pharma', 'Golden Dragon Pharmaceuticals', 'Zerox Pharmaceuticals', 'ZETTA Pharmaceuticals']) {
                if (!names.includes(req)) throw new Error(`Missing: ${req}`);
            }
        });

        await test('GET /drugcatalog/manufacturers/{id} returns single', async () => {
            const all = await apiCall('/drugcatalog/manufacturers');
            const mfr = await apiCall(`/drugcatalog/manufacturers/${all[0].id}`);
            if (!mfr || !mfr.name) throw new Error('No mfr returned');
        });

        // Categories
        await test('GET /drugcatalog/categories returns enum values', async () => {
            const cats = await apiCall('/drugcatalog/categories');
            if (!Array.isArray(cats)) throw new Error('Not array');
            if (cats.length < 10) throw new Error(`Only ${cats.length} categories`);
            // Each should have value and name
            for (const c of cats) {
                if (!('value' in c) || !('name' in c))
                    throw new Error('Category missing value or name');
            }
        });

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 5: Purchase Tracking API
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n══ PHASE 5: Purchase Tracking API ══');

        // Ensure test drugs exist
        let testDrugs = await apiCall('/drugs');
        if (!Array.isArray(testDrugs)) testDrugs = [];
        if (testDrugs.length === 0) {
            await apiCall('/drugs', {
                method: 'POST',
                body: JSON.stringify({ name: 'E2E Full Drug 1', type: 1 })
            });
            await apiCall('/drugs', {
                method: 'POST',
                body: JSON.stringify({ name: 'E2E Full Drug 2', type: 0 })
            });
            testDrugs = await apiCall('/drugs');
        }
        const drug1Id = testDrugs[0].id;
        const drug2Id = testDrugs.length > 1 ? testDrugs[1].id : null;

        await test('GET /purchases/options/{drugId} returns array', async () => {
            const opts = await apiCall(`/purchases/options/${drug1Id}`);
            if (!Array.isArray(opts)) throw new Error('Not array');
        });

        await test('IntakeLog DTO includes purchaseId and purchaseLabel', async () => {
            const log = await apiCall('/intakelogs', {
                method: 'POST',
                body: JSON.stringify({ date: '2026-02-11', drugId: drug1Id, dose: 'DTO test' })
            });
            if (!('purchaseId' in log)) throw new Error('Missing purchaseId');
            if (!('purchaseLabel' in log)) throw new Error('Missing purchaseLabel');
            if (log.purchaseId !== null) throw new Error('Should be null');
            await apiCall(`/intakelogs/${log.id}`, { method: 'DELETE' });
        });

        await test('Create log with purchaseId, verify purchaseLabel', async () => {
            const purchase = await apiCall('/purchases', {
                method: 'POST',
                body: JSON.stringify({
                    drugId: drug1Id, purchaseDate: '2026-02-10',
                    quantity: 10, price: 1500, vendor: 'E2E Full Vendor'
                })
            });
            const log = await apiCall('/intakelogs', {
                method: 'POST',
                body: JSON.stringify({
                    date: '2026-02-11', drugId: drug1Id,
                    dose: '250mg', purchaseId: purchase.id
                })
            });
            if (log.purchaseId !== purchase.id) throw new Error('purchaseId mismatch');
            if (!log.purchaseLabel || !log.purchaseLabel.includes('E2E Full Vendor'))
                throw new Error(`Bad label: ${log.purchaseLabel}`);
            await apiCall(`/intakelogs/${log.id}`, { method: 'DELETE' });
            await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });
        });

        await test('Purchase remaining stock calculation', async () => {
            const purchase = await apiCall('/purchases', {
                method: 'POST',
                body: JSON.stringify({
                    drugId: drug1Id, purchaseDate: '2026-02-10',
                    quantity: 5, price: 500, vendor: 'Stock Calc'
                })
            });
            // Create 3 logs from this purchase
            const logs = [];
            for (let i = 0; i < 3; i++) {
                const l = await apiCall('/intakelogs', {
                    method: 'POST',
                    body: JSON.stringify({
                        date: `2026-02-1${i}`, drugId: drug1Id,
                        dose: `dose${i}`, purchaseId: purchase.id
                    })
                });
                logs.push(l);
            }
            const opts = await apiCall(`/purchases/options/${drug1Id}`);
            const thisOpt = opts.find(o => o.id === purchase.id);
            if (!thisOpt) throw new Error('Purchase not in options');
            if (thisOpt.remainingStock !== 2) throw new Error(`Expected 2 remaining, got ${thisOpt.remainingStock}`);
            // Cleanup
            for (const l of logs) await apiCall(`/intakelogs/${l.id}`, { method: 'DELETE' });
            await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });
        });

        await test('Update log to add purchaseId', async () => {
            const purchase = await apiCall('/purchases', {
                method: 'POST',
                body: JSON.stringify({
                    drugId: drug1Id, purchaseDate: '2026-02-10',
                    quantity: 10, price: 100, vendor: 'Update PID'
                })
            });
            const log = await apiCall('/intakelogs', {
                method: 'POST',
                body: JSON.stringify({ date: '2026-02-11', drugId: drug1Id, dose: 'no-pid' })
            });
            if (log.purchaseId !== null) throw new Error('Should start null');
            const updated = await apiCall(`/intakelogs/${log.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    date: '2026-02-11', drugId: drug1Id,
                    dose: 'with-pid', purchaseId: purchase.id
                })
            });
            if (updated.purchaseId !== purchase.id) throw new Error('Update failed');
            if (!updated.purchaseLabel.includes('Update PID')) throw new Error('Label wrong');
            await apiCall(`/intakelogs/${log.id}`, { method: 'DELETE' });
            await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });
        });

        if (drug2Id) {
            await test('Reject purchaseId for wrong drug (validation)', async () => {
                const purchase = await apiCall('/purchases', {
                    method: 'POST',
                    body: JSON.stringify({
                        drugId: drug1Id, purchaseDate: '2026-02-10',
                        quantity: 5, price: 100, vendor: 'Wrong Drug'
                    })
                });
                // Try log with drug2 but purchase belongs to drug1
                const resp = await apiRaw('/intakelogs', {
                    method: 'POST',
                    body: JSON.stringify({
                        date: '2026-02-11', drugId: drug2Id,
                        dose: 'x', purchaseId: purchase.id
                    })
                });
                if (resp.ok) throw new Error('Should have been rejected');
                await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });
            });
        }

        await test('Inventory includes purchaseBreakdown per drug', async () => {
            const inv = await apiCall('/drugstatistics/inventory');
            if (!inv || !Array.isArray(inv.items)) throw new Error('No items');
            for (const item of inv.items) {
                if (!('purchaseBreakdown' in item)) throw new Error('Missing purchaseBreakdown');
                if (!('unallocatedConsumed' in item)) throw new Error('Missing unallocatedConsumed');
                if (!Array.isArray(item.purchaseBreakdown)) throw new Error('Not array');
            }
        });

        await test('Inventory purchaseBreakdown item has correct fields', async () => {
            // Create purchase + logs to ensure breakdown exists
            const purchase = await apiCall('/purchases', {
                method: 'POST',
                body: JSON.stringify({
                    drugId: drug1Id, purchaseDate: '2026-02-10',
                    quantity: 5, price: 500, vendor: 'Breakdown Test'
                })
            });
            const log = await apiCall('/intakelogs', {
                method: 'POST',
                body: JSON.stringify({
                    date: '2026-02-11', drugId: drug1Id,
                    dose: 'bd', purchaseId: purchase.id
                })
            });
            const inv = await apiCall('/drugstatistics/inventory');
            const drugItem = inv.items.find(i => i.drugId === drug1Id);
            if (!drugItem) throw new Error('Drug not in inventory');
            if (drugItem.purchaseBreakdown.length > 0) {
                const bd = drugItem.purchaseBreakdown[0];
                for (const f of ['purchaseId', 'label', 'purchased', 'consumed', 'remaining']) {
                    if (!(f in bd)) throw new Error(`Breakdown missing field: ${f}`);
                }
            }
            await apiCall(`/intakelogs/${log.id}`, { method: 'DELETE' });
            await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });
        });

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 6: Drug CRUD with Catalog Fields
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n══ PHASE 6: Drug CRUD + Catalog Fields ══');

        await test('DrugDto includes catalogItemId and manufacturerId', async () => {
            const drugs = await apiCall('/drugs');
            if (drugs.length === 0) throw new Error('No drugs');
            const drug = drugs[0];
            // Fields should exist even if null
            if (!('catalogItemId' in drug)) throw new Error('Missing catalogItemId');
            if (!('manufacturerId' in drug)) throw new Error('Missing manufacturerId');
        });

        await test('DrugDto includes manufacturerName', async () => {
            const drugs = await apiCall('/drugs');
            const drug = drugs[0];
            if (!('manufacturerName' in drug)) throw new Error('Missing manufacturerName');
        });

        await test('Create drug with catalogItemId and manufacturerId', async () => {
            const substances = await apiCall('/drugcatalog/substances');
            const mfrs = await apiCall('/drugcatalog/manufacturers');
            if (substances.length === 0 || mfrs.length === 0) throw new Error('No catalog data');

            const drug = await apiCall('/drugs', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'E2E Catalog Drug',
                    type: 1,
                    catalogItemId: substances[0].id,
                    manufacturerId: mfrs[0].id
                })
            });
            if (!drug.catalogItemId) throw new Error('catalogItemId not saved');
            if (!drug.manufacturerId) throw new Error('manufacturerId not saved');
            if (!drug.manufacturerName) throw new Error('manufacturerName not resolved');
            if (drug.manufacturerName !== mfrs[0].name)
                throw new Error(`Expected ${mfrs[0].name}, got ${drug.manufacturerName}`);

            // Cleanup
            await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
        });

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 7: UI Interaction Tests
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n══ PHASE 7: UI Interaction ══');

        await gotoAndAuth(BASE);
        await sleep(3000);

        // Navigation
        await test('Click encyclopedia tab navigates to encyclopedia page', async () => {
            const btn = await page.$('[data-page="encyclopedia"]');
            if (!btn) throw new Error('Encyclopedia nav button not found');
            await btn.click();
            await sleep(1000);
            const pageEl = await page.$('#encyclopedia');
            const isActive = await pageEl.evaluate(el => el.classList.contains('active'));
            if (!isActive) throw new Error('Encyclopedia page not active');
        });

        await test('Encyclopedia page renders category tabs after init', async () => {
            // Wait for data to load
            await sleep(3000);
            const tabs = await page.$$eval('#encyclopedia-tabs .encyclopedia-tab', els =>
                els.map(e => e.textContent.trim())
            );
            if (tabs.length < 2) throw new Error(`Only ${tabs.length} tabs, expected 2+`);
            if (!tabs[0].includes('ВСЕ')) throw new Error('First tab not ВСЕ');
        });

        await test('Encyclopedia page renders substance cards', async () => {
            const cards = await page.$$('#encyclopedia-grid .encyclopedia-card');
            if (cards.length === 0) throw new Error('No substance cards rendered');
        });

        await test('Encyclopedia substance cards show name and badges', async () => {
            const hasName = await page.$eval(
                '#encyclopedia-grid .encyclopedia-card .encyclopedia-card-name',
                el => el.textContent.trim().length > 0
            );
            if (!hasName) throw new Error('Card name empty');
            const badges = await page.$$('#encyclopedia-grid .encyclopedia-badge');
            if (badges.length === 0) throw new Error('No badges on cards');
        });

        await test('Encyclopedia manufacturer cards render', async () => {
            const cards = await page.$$('#mfr-grid .mfr-card');
            if (cards.length === 0) throw new Error('No manufacturer cards rendered');
        });

        await test('Encyclopedia category tab click filters substances', async () => {
            const initialCount = await page.$$eval('#encyclopedia-grid .encyclopedia-card', els => els.length);
            // Click a specific category tab (not "All")
            const tabs = await page.$$('#encyclopedia-tabs .encyclopedia-tab');
            if (tabs.length > 1) {
                await tabs[1].click();
                await sleep(500);
                const filteredCount = await page.$$eval('#encyclopedia-grid .encyclopedia-card', els => els.length);
                if (filteredCount >= initialCount && initialCount > 10) {
                    throw new Error(`Filter didn't reduce: ${filteredCount} >= ${initialCount}`);
                }
                // Click "All" to reset
                await tabs[0].click();
                await sleep(500);
            }
        });

        await test('Encyclopedia search filters substances', async () => {
            const searchEl = await page.$('#encyclopedia-search');
            if (!searchEl) throw new Error('Search not found');
            const initialCount = await page.$$eval('#encyclopedia-grid .encyclopedia-card', els => els.length);
            await searchEl.type('zzzznonexistent');
            await sleep(500);
            const afterCount = await page.$$eval('#encyclopedia-grid .encyclopedia-card', els => els.length);
            if (afterCount >= initialCount && initialCount > 0) {
                throw new Error('Search didn\'t filter');
            }
            // Clear search
            await searchEl.click({ clickCount: 3 });
            await searchEl.press('Backspace');
            await sleep(500);
        });

        await test('Encyclopedia manufacturer type tabs work', async () => {
            const allCards = await page.$$eval('#mfr-grid .mfr-card', els => els.length);
            const pharmaTab = await page.$('#mfr-tabs [data-mfr-type="0"]');
            if (pharmaTab) {
                await pharmaTab.click();
                await sleep(500);
                const pharmaCount = await page.$$eval('#mfr-grid .mfr-card', els => els.length);
                if (pharmaCount >= allCards && allCards > 5) {
                    throw new Error('Pharma filter didnt reduce');
                }
                // Reset
                const allTab = await page.$('#mfr-tabs [data-mfr-type="all"]');
                if (allTab) await allTab.click();
                await sleep(500);
            }
        });

        await test('Encyclopedia card expand/collapse on click', async () => {
            const card = await page.$('#encyclopedia-grid .encyclopedia-card');
            if (!card) throw new Error('No card found');
            // Click to expand
            await card.click();
            await sleep(300);
            const isExpanded = await card.evaluate(el => el.classList.contains('expanded'));
            if (!isExpanded) throw new Error('Card not expanded');
            // Click to collapse
            await card.click();
            await sleep(300);
            const isCollapsed = await card.evaluate(el => !el.classList.contains('expanded'));
            if (!isCollapsed) throw new Error('Card not collapsed');
        });

        // Navigate to course page for modal tests
        const courseBtn = await page.$('[data-page="course"]');
        if (courseBtn) await courseBtn.click();
        await sleep(2000);

        // Drug modal interaction
        await test('Drug modal opens with catalog autocomplete', async () => {
            await page.evaluate(() => window.openDrugModal());
            await sleep(500);
            const active = await page.$eval('#drug-modal', el => el.classList.contains('active'));
            if (!active) throw new Error('Drug modal not active');
            const catalogInput = await page.$('#drug-catalog-search');
            if (!catalogInput) throw new Error('Catalog input not found');
            await page.evaluate(() => window.closeDrugModal());
        });

        // Log modal interaction
        await test('Log modal opens with purchase dropdown', async () => {
            const fn = await page.evaluate(() => typeof window.openLogModal);
            if (fn !== 'function') throw new Error('openLogModal not a function');
            await page.evaluate(() => window.openLogModal());
            await sleep(1000);
            const active = await page.$eval('#log-modal', el => el.classList.contains('active'));
            if (!active) throw new Error('Log modal not active');
            const purchaseEl = await page.$('#log-purchase');
            const isVisible = await page.$eval('#log-purchase', el => {
                const s = getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden';
            });
            if (!isVisible) throw new Error('Purchase select not visible');
            await page.evaluate(() => window.closeLogModal());
        });

        await test('Drug change triggers purchase options load', async () => {
            const drugs = await apiCall('/drugs');
            if (drugs.length === 0) { skip('Drug change trigger', 'No drugs'); return; }

            // Create temp purchase
            const purchase = await apiCall('/purchases', {
                method: 'POST',
                body: JSON.stringify({
                    drugId: drugs[0].id, purchaseDate: '2026-02-11',
                    quantity: 10, price: 500, vendor: 'UI Trigger Test'
                })
            });

            await page.evaluate(() => window.openLogModal());
            await sleep(500);
            await page.select('#log-drug', drugs[0].id);
            await sleep(2000);
            const optCount = await page.$eval('#log-purchase', el => el.options.length);
            if (optCount < 2) throw new Error(`Expected 2+ options, got ${optCount}`);
            await page.evaluate(() => window.closeLogModal());
            await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });
        });

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 8: Dashboard & Course Page Rendering
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n══ PHASE 8: Dashboard & Course Rendering ══');

        // Go to dashboard
        const dashBtn = await page.$('[data-page="dashboard"]');
        if (dashBtn) await dashBtn.click();
        await sleep(3000);

        await test('Dashboard loads without errors', async () => {
            const statCards = await page.$$('.stat-card');
            if (statCards.length < 3) throw new Error(`Only ${statCards.length} stat cards`);
        });

        await test('Dashboard drug cards have type badges', async () => {
            const html = await page.$eval('#dashboard-drugs', el => el.innerHTML);
            // At least loading or drug cards should be present
            if (html.includes('Загрузка...') || html.includes('badge-')) {
                // Fine — either loading or has badges
            } else if (html.includes('Нет данных') || html.includes('empty-state')) {
                // Also fine — no drugs
            } else {
                // Check the JS renders badge classes
                const js = await page.evaluate(async () => (await fetch('/js/pages/dashboard.js')).text());
                if (!js.includes('badge-oral') && !js.includes('badge-inject'))
                    throw new Error('Dashboard JS missing drug type badges');
            }
        });

        // Navigate to course → logs tab
        const courseNav = await page.$('[data-page="course"]');
        if (courseNav) await courseNav.click();
        await sleep(2000);

        await test('Course page renders tabs', async () => {
            const tabs = await page.$$eval('.course-tab', els => els.map(e => e.textContent.trim()));
            if (tabs.length < 4) throw new Error(`Only ${tabs.length} course tabs`);
            const expected = ['ПРЕПАРАТЫ', 'ЛОГИ ПРИЁМА', 'РЕЕСТР', 'СТАТИСТИКА'];
            for (const t of expected) {
                if (!tabs.some(tab => tab.includes(t))) throw new Error(`Missing tab: ${t}`);
            }
        });

        // Course tab switching
        await test('Course tab switching works (inventory tab)', async () => {
            const inventoryTab = await page.$('[data-tab="inventory"]');
            if (!inventoryTab) throw new Error('Inventory tab not found');
            await inventoryTab.click();
            await sleep(1000);
            const tabContent = await page.$('#tab-inventory');
            const isActive = await tabContent.evaluate(el => el.classList.contains('active'));
            if (!isActive) throw new Error('Inventory tab content not active');
        });

        await test('Course tab switching works (logs tab)', async () => {
            const logsTab = await page.$('[data-tab="logs"]');
            if (!logsTab) throw new Error('Logs tab not found');
            await logsTab.click();
            await sleep(1000);
            const tabContent = await page.$('#tab-logs');
            const isActive = await tabContent.evaluate(el => el.classList.contains('active'));
            if (!isActive) throw new Error('Logs tab content not active');
        });

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 9: Auth & Security
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n══ PHASE 9: Auth & Security ══');

        await test('API returns 401 without token', async () => {
            const resp = await page.evaluate(async (base) => {
                const r = await fetch(`${base}/api/drugs`, {
                    headers: { 'Content-Type': 'application/json' }
                });
                return { status: r.status };
            }, BASE);
            if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
        });

        await test('API returns 401 with invalid token', async () => {
            const resp = await page.evaluate(async (base) => {
                const r = await fetch(`${base}/api/drugs`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer invalid.token.here'
                    }
                });
                return { status: r.status };
            }, BASE);
            if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
        });

        await test('DrugCatalog endpoints require auth', async () => {
            const resp = await page.evaluate(async (base) => {
                const r = await fetch(`${base}/api/drugcatalog/substances`);
                return { status: r.status };
            }, BASE);
            if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
        });

        await test('Health endpoint is public', async () => {
            const resp = await page.evaluate(async (base) => {
                const r = await fetch(`${base}/healthz`);
                return { status: r.status, ok: r.ok };
            }, BASE);
            if (!resp.ok) throw new Error(`Health check failed: ${resp.status}`);
        });

        await test('Admin endpoints return 403 for non-admin', async () => {
            const resp = await apiRaw('/admin/users');
            if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
        });

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 10: Full E2E Flow — Drug + Purchase + Log + Verify
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n══ PHASE 10: Full E2E Flow ══');

        await test('Complete flow: create drug → purchase → log → verify inventory', async () => {
            // 1. Create drug with catalog info
            const substances = await apiCall('/drugcatalog/substances/popular');
            const mfrs = await apiCall('/drugcatalog/manufacturers?type=0');

            const drug = await apiCall('/drugs', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'E2E Flow Test Drug',
                    type: 1,
                    dosage: '250mg/ml',
                    catalogItemId: substances.length > 0 ? substances[0].id : null,
                    manufacturerId: mfrs.length > 0 ? mfrs[0].id : null
                })
            });
            if (!drug.id) throw new Error('Drug not created');

            // 2. Create purchase
            const purchase = await apiCall('/purchases', {
                method: 'POST',
                body: JSON.stringify({
                    drugId: drug.id, purchaseDate: '2026-02-01',
                    quantity: 10, price: 3000, vendor: 'E2E Pharmacy'
                })
            });
            if (!purchase.id) throw new Error('Purchase not created');

            // 3. Create intake log with purchaseId
            const log1 = await apiCall('/intakelogs', {
                method: 'POST',
                body: JSON.stringify({
                    date: '2026-02-05', drugId: drug.id,
                    dose: '250mg', purchaseId: purchase.id
                })
            });
            if (!log1.id) throw new Error('Log not created');
            if (log1.purchaseId !== purchase.id) throw new Error('PurchaseId not linked');

            // 4. Create log WITHOUT purchaseId
            const log2 = await apiCall('/intakelogs', {
                method: 'POST',
                body: JSON.stringify({
                    date: '2026-02-06', drugId: drug.id, dose: '250mg'
                })
            });
            if (log2.purchaseId !== null) throw new Error('Should be null');

            // 5. Verify purchase options
            const opts = await apiCall(`/purchases/options/${drug.id}`);
            const opt = opts.find(o => o.id === purchase.id);
            if (!opt) throw new Error('Purchase not in options');
            if (opt.remainingStock !== 9) throw new Error(`Expected 9 remaining, got ${opt.remainingStock}`);

            // 6. Verify inventory
            const inv = await apiCall('/drugstatistics/inventory');
            const invItem = inv.items.find(i => i.drugId === drug.id);
            if (!invItem) throw new Error('Drug not in inventory');
            if (invItem.unallocatedConsumed < 1) throw new Error('UnallocatedConsumed should be >= 1');

            // 7. Verify drug statistics
            const stats = await apiCall(`/drugstatistics/${drug.id}`);
            if (stats.consumed < 2) throw new Error(`Expected consumed >= 2, got ${stats.consumed}`);

            // Cleanup
            await apiCall(`/intakelogs/${log1.id}`, { method: 'DELETE' });
            await apiCall(`/intakelogs/${log2.id}`, { method: 'DELETE' });
            await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });
            await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
        });

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 11: Edge Cases & Validation
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n══ PHASE 11: Edge Cases ══');

        await test('Empty purchase options for drug with no purchases', async () => {
            const drug = await apiCall('/drugs', {
                method: 'POST',
                body: JSON.stringify({ name: 'E2E No Purchases', type: 0 })
            });
            const opts = await apiCall(`/purchases/options/${drug.id}`);
            if (!Array.isArray(opts)) throw new Error('Not array');
            if (opts.length !== 0) throw new Error(`Expected 0, got ${opts.length}`);
            await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
        });

        await test('Catalog search with empty query returns all', async () => {
            const all = await apiCall('/drugcatalog/substances');
            const searched = await apiCall('/drugcatalog/substances?search=');
            if (searched.length !== all.length)
                throw new Error(`Empty search: ${searched.length} vs all: ${all.length}`);
        });

        await test('Purchase options label format includes vendor and date', async () => {
            const drug = await apiCall('/drugs', {
                method: 'POST',
                body: JSON.stringify({ name: 'E2E Label Format', type: 1 })
            });
            const purchase = await apiCall('/purchases', {
                method: 'POST',
                body: JSON.stringify({
                    drugId: drug.id, purchaseDate: '2026-01-15',
                    quantity: 5, price: 100, vendor: 'LabelTestVendor'
                })
            });
            const opts = await apiCall(`/purchases/options/${drug.id}`);
            const opt = opts.find(o => o.id === purchase.id);
            if (!opt.label.includes('LabelTestVendor')) throw new Error('Vendor missing from label');
            if (!opt.label.includes('15.01.2026') && !opt.label.includes('2026'))
                throw new Error(`Date missing from label: ${opt.label}`);
            await apiCall(`/purchases/${purchase.id}`, { method: 'DELETE' });
            await apiCall(`/drugs/${drug.id}`, { method: 'DELETE' });
        });

        await test('Multiple categories in catalog contain different substances', async () => {
            const aas = await apiCall('/drugcatalog/substances?category=0');
            const pct = await apiCall('/drugcatalog/substances?category=3');
            if (aas.length === 0 || pct.length === 0)
                throw new Error(`AAS: ${aas.length}, PCT: ${pct.length}`);
            const aasIds = new Set(aas.map(s => s.id));
            const overlap = pct.filter(s => aasIds.has(s.id));
            if (overlap.length > 0)
                throw new Error('AAS and PCT overlap!');
        });

        // Cleanup test drugs
        console.log('\n── Cleanup ──');
        const finalDrugs = await apiCall('/drugs');
        for (const d of finalDrugs) {
            if (d.name.startsWith('E2E')) {
                await apiCall(`/drugs/${d.id}`, { method: 'DELETE' });
                console.log(`  Deleted test drug: ${d.name}`);
            }
        }

    } // end if (token)

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 12: Console Errors Check
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n══ PHASE 12: Console Errors ══');

    await test('No critical JS console errors', async () => {
        const critical = consoleErrors.filter(e =>
            !e.includes('favicon') &&
            !e.includes('404') &&
            !e.includes('Unauthorized') &&
            !e.includes('net::ERR') &&
            !e.includes('google') &&
            !e.includes('gsi') &&
            !e.includes('GSI_LOGGER') &&
            !e.includes('origin is not allowed') &&
            !e.includes('500') &&
            !e.includes('403')
        );
        if (critical.length > 0) {
            throw new Error(`${critical.length} errors:\n    ${critical.slice(0, 5).join('\n    ')}`);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  RESULTS: ✅ ${passed} passed | ❌ ${failed} failed | ⏭️  ${skipped} skipped`);
    console.log(`${'═'.repeat(60)}`);

    if (errors.length > 0) {
        console.log('\n  Failed tests:');
        for (const { name, err } of errors) {
            console.log(`    ❌ ${name}: ${err}`);
        }
    }

    console.log();
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
