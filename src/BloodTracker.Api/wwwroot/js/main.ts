import { state } from './state.js';
import { subscribe } from './reactive.js';
import { loadSavedColor, loadSavedFont } from './components/color-picker.js';
import { initNavigation } from './components/navigation.js';
import { api } from './api.js';
import { ENDPOINTS } from './endpoints.js';
import { formatDate, formatDateForInput, escapeHtml } from './utils.js';
import { renderAsciiSkull, scaleAsciiSkull } from './effects/ascii-art.js';
import { startSparkAnimation } from './effects/sparks.js';
import { startMatrixRunes } from './effects/matrix-runes.js';
import { initProgressBar } from './effects/progress-bar.js';
import { auth } from './auth.js';
import './components/modals.js';
import './components/workoutModals.js';
import './components/purchaseModals.js';
import './components/toast.js';
import { toast } from './components/toast.js';
import './components/skeleton.js';
import './components/trendChart.js';
import { renderDashboardDrugs, loadAlerts, loadDashboardDonut } from './pages/dashboard.js';
import { renderDrugs, renderIntakeLogs, updateLogDrugSelect } from './pages/course.js';
import { renderPurchases, populateFilterDrugs, populateStatsDrugs } from './pages/courseTabs.js';
import { populateTrendSelect } from './pages/analyses.js';
import './pages/compare.js';
import { initWorkouts, renderWorkouts } from './pages/workouts.js';
import './components/asciiEngine.js';
import './components/asciiArtUI.js';
import './components/asciifyEngine.js';
import './pages/login.js';
import './pages/admin.js'
import { initEncyclopedia, renderSubstanceGrid, renderMfrGrid } from './pages/encyclopedia.js';

import type { ReferenceRange } from './types/index.js'

declare global {
    interface Window {
        skeleton: { drugCards: (n: number) => string; card: () => string }
        populateTrendSelect?: () => void
        asciify?: { init: () => void; enabled: boolean }
        auth: typeof auth
        loadDashboard: typeof loadDashboard
        loadDrugs: typeof loadDrugs
        loadIntakeLogs: typeof loadIntakeLogs
        loadAnalyses: typeof loadAnalyses
    }
}

/**
 * Загружает референсные диапазоны анализов с сервера и сохраняет в state.
 * Вызывается при инициализации приложения.
 * @returns {Promise<void>}
 */
async function loadReferenceRanges(): Promise<void> {
    try {
        const ranges = await api<ReferenceRange[]>(ENDPOINTS.referenceRanges.list);
        state.referenceRanges = Object.fromEntries(ranges.map((r: ReferenceRange) => [r.key, r]));
    } catch (e) {
        console.error('Failed to load reference ranges:', e);
        toast.error('Ошибка загрузки референсных значений');
    }
}

/**
 * Загружает данные дашборда: активный курс, препараты, статистику анализов.
 * Показывает скелетоны на время загрузки, затем рендерит карточки препаратов, алерты и donut-чарт.
 * @returns {Promise<void>}
 */
export async function loadDashboard(): Promise<void> {
    // Show skeletons before loading
    const drugsContainer = document.getElementById('dashboard-drugs');
    const alertsContainer = document.getElementById('dashboard-alerts');
    
    if (drugsContainer) {
        drugsContainer.innerHTML = window.skeleton.drugCards(3);
    }
    if (alertsContainer) {
        alertsContainer.innerHTML = window.skeleton.card();
    }

    try {
        const data = await api<{
            activeCourse: typeof state.currentCourse
            drugs: typeof state.drugs
            analysesCount: number
            lastAnalysisDate?: string
        }>(ENDPOINTS.courses.dashboard);
        state.currentCourse = data.activeCourse;
        state.drugs = data.drugs;

        (document.getElementById('analyses-count') as HTMLElement).textContent = String(data.analysesCount);
        (document.getElementById('last-analysis') as HTMLElement).textContent = data.lastAnalysisDate
            ? `Последний: ${formatDate(data.lastAnalysisDate)}`
            : 'Нет данных';

        // renderDashboardDrugs() и renderCourseHeader() теперь вызываются реактивно через subscribe(...)
        await loadAlerts();
        await loadDashboardDonut();
    } catch (e) {
        console.error('Failed to load dashboard:', e);
        toast.error('Ошибка загрузки дашборда');
    }
}

/**
 * Загружает список препаратов с сервера, рендерит карточки и обновляет селекторы логов.
 * @returns {Promise<void>}
 */
export async function loadDrugs(): Promise<void> {
    try {
        state.drugs = await api(ENDPOINTS.drugs.list);
        // renderDrugs() и updateLogDrugSelect() теперь вызываются через subscribe('drugs', ...)
    } catch (e) {
        console.error('Failed to load drugs:', e);
        toast.error('Ошибка загрузки препаратов');
    }
}

/**
 * Загружает последние 20 логов приёма препаратов и рендерит таблицу.
 * @returns {Promise<void>}
 */
export async function loadIntakeLogs(): Promise<void> {
    try {
        state.intakeLogs = await api(ENDPOINTS.intakeLogs.list + '?count=20');
        // renderIntakeLogs() теперь вызывается через subscribe('intakeLogs', ...)
    } catch (e) {
        console.error('Failed to load logs:', e);
        toast.error('Ошибка загрузки логов приёма');
    }
}

/**
 * Загружает список анализов, обновляет селекторы и тренд-чарт.
 * @returns {Promise<void>}
 */
export async function loadAnalyses(): Promise<void> {
    try {
        state.analyses = await api(ENDPOINTS.analyses.list);
        // updateAnalysisSelectors() и populateTrendSelect() вызываются через subscribe('analyses', ...)
    } catch (e) {
        console.error('Failed to load analyses:', e);
        toast.error('Ошибка загрузки анализов');
    }
}

// Экспортируем в window для использования в HTML
window.loadDashboard = loadDashboard
window.loadDrugs = loadDrugs
window.loadIntakeLogs = loadIntakeLogs
window.loadAnalyses = loadAnalyses

// Подписка на изменения списка анализов — обновляет все селекты, тренд-чарт
subscribe('analyses', () => {
    updateAnalysisSelectors();
    populateTrendSelect();
});

// Подписка на изменения списка препаратов — обновляет дашборд, курс, select логов + фильтры табов
subscribe('drugs', () => {
    renderDashboardDrugs();
    renderDrugs();
    updateLogDrugSelect();
    populateFilterDrugs();
    populateStatsDrugs();
});

// Подписка на покупки — обновляет таблицу покупок
subscribe('purchases', () => {
    renderPurchases();
});

// Подписка на каталог субстанций — обновляет грид энциклопедии
subscribe('drugCatalog', () => {
    renderSubstanceGrid();
});

// Подписка на производителей — обновляет грид производителей
subscribe('manufacturers', () => {
    renderMfrGrid();
});

// Подписка на изменения логов приёма — перерисовывает список логов
subscribe('intakeLogs', () => {
    renderIntakeLogs();
});

// Обновление тренировок — общий шедулер, чтобы не дергать renderWorkouts() по 10 раз за тик
let workoutsRenderScheduled = false;
function scheduleWorkoutsRender() {
    if (workoutsRenderScheduled) return;
    workoutsRenderScheduled = true;
    queueMicrotask(() => {
        workoutsRenderScheduled = false;
        void renderWorkouts();
    });
}

subscribe('workoutPrograms', scheduleWorkoutsRender);
subscribe('workoutDays', scheduleWorkoutsRender);
subscribe('workoutExercises', scheduleWorkoutsRender);
subscribe('workoutSets', scheduleWorkoutsRender);
subscribe('selectedProgramId', scheduleWorkoutsRender);
subscribe('selectedDayId', scheduleWorkoutsRender);
subscribe('selectedExerciseId', scheduleWorkoutsRender);

// Подписка на изменения текущего курса — обновляет шапку курса на дашборде
subscribe('currentCourse', () => {
    renderCourseHeader();
});

/**
 * Обновляет все <select> элементы для выбора анализов (основной, "до" и "после" для сравнения).
 */
function updateAnalysisSelectors(): void {
    const options = state.analyses.map(a => `<option value="${a.id}">${formatDate(a.date)} — ${escapeHtml(a.label)}</option>`).join('');
    const select = document.getElementById('analysis-select');
    const before = document.getElementById('compare-before');
    const after = document.getElementById('compare-after');
    if (select) select.innerHTML = '<option value="">Выберите анализ...</option>' + options;
    if (before) before.innerHTML = '<option value="">Выберите...</option>' + options;
    if (after) after.innerHTML = '<option value="">Выберите...</option>' + options;
}

/**
 * Обновляет шапку текущего курса на дашборде (название, даты, день, прогресс).
 */
function renderCourseHeader(): void {
    const current = state.currentCourse;

    const nameEl = document.getElementById('course-name') as HTMLElement | null;
    const datesEl = document.getElementById('course-dates') as HTMLElement | null;
    const dayEl = document.getElementById('course-day') as HTMLElement | null;
    const progressEl = document.getElementById('course-progress') as HTMLElement | null;

    if (nameEl) {
        nameEl.textContent = current?.title ?? '—';
    }

    if (datesEl) {
        datesEl.textContent = current
            ? `${formatDate(current.startDate!)} — ${formatDate(current.endDate!)}`
            : 'Не настроен';
    }

    if (dayEl) {
        dayEl.textContent = String(current?.currentDay ?? '—');
    }

    if (progressEl) {
        progressEl.textContent = current
            ? `из ${current.totalDays} дней`
            : '—';
    }
}

/**
 * Отображает имя/email пользователя в хедере, показывает кнопку админки и баннер имперсонации.
 */
function updateUserDisplay(): void {
    const user = auth.getUser();
    const userInfoEl = document.getElementById('user-info') as HTMLElement | null;
    if (userInfoEl && user) {
        userInfoEl.style.display = 'flex';
        (document.getElementById('user-email-display') as HTMLElement).textContent = user.displayName || user.email;
    }

    // Show admin tab if user is admin and not impersonating
    const adminBtn = document.getElementById('admin-nav-btn') as HTMLElement | null;
    if (adminBtn) {
        adminBtn.style.display = (auth.isAdmin() && !auth.isImpersonating()) ? '' : 'none';
    }

    // Show impersonation banner if impersonating
    if (auth.isImpersonating()) {
        showImpersonationBanner(user);
    }
}

/**
 * Показывает баннер имперсонации с email пользователя и кнопкой выхода.
 * @param {Object} user — объект пользователя с полем email
 */
function showImpersonationBanner(user: { email?: string } | null): void {
    if (document.getElementById('impersonation-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'impersonation-banner';
    banner.className = 'impersonation-banner';
    // ── Баннер имперсонации ──────────────────────────
    // [Просмотр данных: email]  [ВЫЙТИ]
    banner.innerHTML = `
        <span>Просмотр данных: <strong>${escapeHtml(user?.email || 'unknown')}</strong></span>
        <button class="impersonation-exit-btn" onclick="window.auth.stopImpersonation()">[ ВЫЙТИ ]</button>
    `;
    document.body.prepend(banner);
}

/**
 * Главная функция инициализации приложения.
 * Проверяет авторизацию, загружает данные, инициализирует компоненты и визуальные эффекты.
 * @returns {Promise<void>}
 */
async function init(): Promise<void> {
    // Auth gate — show login if not authenticated
    if (!auth.isLoggedIn()) {
        loadSavedColor();
        const { showLoginPage } = await import('./pages/login.js');
        showLoginPage();
        return;
    }

    // Auth passed — reveal the app
    document.querySelector('.app')?.classList.remove('auth-hidden');

    loadSavedColor();
    updateUserDisplay();
    await loadReferenceRanges();
    await loadAnalyses();
    await loadDrugs();
    await loadIntakeLogs();
    await loadDashboard();

    // Initialize workouts (after auth, to avoid 401 loop)
    try {
        initWorkouts();
    } catch (e) {
        console.error('[init] workouts failed:', e);
    }

    const skullStrip = document.getElementById('ascii-skeleton-strip');
    if (skullStrip) {
        skullStrip.innerHTML = renderAsciiSkull();
        setTimeout(() => {
            scaleAsciiSkull();
        }, 100);
    }

    const colorfulAscii = document.querySelector('.colorful-ascii') as HTMLElement | null;
    if (colorfulAscii) {
        const lines = colorfulAscii.textContent!.split('\n');
        const normalizedLines = lines.map((line: string) => line.trimStart());
        colorfulAscii.textContent = normalizedLines.join('\n');
    }

    initNavigation();

    // Initialize course tabs
    try {
        const { initCourseTabs } = await import('./pages/courseTabs.js');
        initCourseTabs();
    } catch (e) {
        console.error('[init] course tabs failed:', e);
    }

    // Initialize ASCII Art Studio
    try {
        const { initAsciiArtUI } = await import('./components/asciiArtUI.js');
        if (document.getElementById('ascii-art-studio')) {
            initAsciiArtUI('ascii-art-studio');
        }
    } catch (e) {
        console.error('[init] ASCII Art UI failed:', e);
    }

    // Pre-load encyclopedia catalog in background
    try {
        if (document.getElementById('encyclopedia')) {
            initEncyclopedia();
        }
    } catch (e) {
        console.error('[init] encyclopedia failed:', e);
    }

    try {
        initRunes();
    } catch (e) {
        console.error('[init] runes failed:', e);
    }

    try {
        startMatrixRunes();
    } catch (e) {
        console.error('[init] matrix runes failed:', e);
    }

    try {
        initProgressBar();
    } catch (e) {
        console.error('[init] progress bar failed:', e);
    }

    try {
        loadSavedFont();
    } catch (e) {
        console.error('[init] saved font failed:', e);
    }

    // Initialize ASCIIfy text renderer
    try {
        if (window.asciify) {
            window.asciify.init();
            // Update toggle button state on load
            const toggleBtn = document.getElementById('asciify-toggle-btn');
            if (toggleBtn) {
                toggleBtn.textContent = window.asciify.enabled ? '[ ASCII: ON ]' : '[ ASCII: OFF ]';
                toggleBtn.classList.toggle('active', window.asciify.enabled);
            }
        }
    } catch (e) {
        console.error('[init] asciify failed:', e);
    }

    try {
        setTimeout(() => {
            startSparkAnimation();
        }, 500);
    } catch (e) {
        console.error('[init] spark animation failed:', e);
    }

    let resizeTimeout: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            scaleAsciiSkull();
        }, 150);
    });

    if (state.currentCourse) {
        const titleEl = document.getElementById('course-title') as HTMLInputElement | null;
        const startEl = document.getElementById('course-start') as HTMLInputElement | null;
        const endEl = document.getElementById('course-end') as HTMLInputElement | null;
        const notesEl = document.getElementById('course-notes') as HTMLTextAreaElement | null;
        if (titleEl) titleEl.value = state.currentCourse.title || '';
        if (startEl) startEl.value = state.currentCourse.startDate?.split('T')[0] || '';
        if (endEl) endEl.value = state.currentCourse.endDate?.split('T')[0] || '';
        if (notesEl) notesEl.value = state.currentCourse.notes || '';
    }
}

/**
 * Создаёт декоративные руны в 8 позициях вокруг экрана и обновляет их каждые 8 секунд.
 */
function initRunes(): void {
    // Набор рун/символов для отображения
    const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];
    // Альтернативные символы, если руны не поддерживаются
    const altRunes = ['◊', '◆', '◇', '▲', '△', '●', '○', '■', '□', '★', '☆', '※', '§', '¶', '†', '‡', '•', '◦', '▪', '▫'];

    const positions = [
        'rune-top', 'rune-bottom', 'rune-left', 'rune-right',
        'rune-corner-tl', 'rune-corner-tr', 'rune-corner-bl', 'rune-corner-br'
    ];

    // Создаем руны для каждой позиции
    positions.forEach((position, index) => {
        const rune = document.createElement('div');
        rune.className = `rune ${position}`;

        // Выбираем случайный символ
        const symbols = runes.length > 0 ? runes : altRunes;
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        rune.textContent = symbol;

        // Устанавливаем случайную задержку анимации
        const delay = index * 0.5 + Math.random() * 2;
        rune.style.animationDelay = `${delay}s`;
        rune.style.setProperty('--rune-offset-x', `${(Math.random() - 0.5) * 10}px`);
        rune.style.setProperty('--rune-offset-y', `${(Math.random() - 0.5) * 10}px`);

        document.body.appendChild(rune);
    });

    // Периодически обновляем руны для разнообразия
    setInterval(() => {
        const existingRunes = document.querySelectorAll('.rune');
        existingRunes.forEach(rune => {
            const symbols = runes.length > 0 ? runes : altRunes;
            const newSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            rune.textContent = newSymbol;
        });
    }, 8000);
}

document.addEventListener('DOMContentLoaded', init);

// Handle 401 from api.js — show login page without reloading
window.addEventListener('bt:unauthorized', async () => {
    // Skip if login overlay is already visible
    if (document.getElementById('login-overlay')) return;
    document.querySelector('.app')?.classList.add('auth-hidden');
    const { showLoginPage } = await import('./pages/login.js');
    showLoginPage();
});
