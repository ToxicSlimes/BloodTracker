import { state } from './state.js';
import { loadSavedColor, loadSavedFont } from './components/color-picker.js';
import { initNavigation } from './components/navigation.js';
import { api } from './api.js';
import { formatDate, formatDateForInput } from './utils.js';
import { renderAsciiSkull, scaleAsciiSkull } from './effects/ascii-art.js';
import { startSparkAnimation } from './effects/sparks.js';
import { startMatrixRunes } from './effects/matrix-runes.js';
import { initProgressBar } from './effects/progress-bar.js';
import { auth } from './auth.js';
import './components/modals.js';
import './components/workoutModals.js';
import './components/purchaseModals.js';
import './components/toast.js';
import './components/skeleton.js';
import './components/trendChart.js';
import './pages/dashboard.js';
import './pages/course.js';
import './pages/courseTabs.js';
import './pages/analyses.js';
import './pages/compare.js';
import './pages/workouts.js';
import './components/asciiEngine.js';
import './components/asciiArtUI.js';
import './components/asciifyEngine.js';
import './pages/login.js';
import './pages/admin.js';

async function loadReferenceRanges() {
    try {
        const ranges = await api('/referenceranges');
        state.referenceRanges = Object.fromEntries(ranges.map(r => [r.key, r]));
    } catch (e) {
        console.error('Failed to load reference ranges:', e);
    }
}

export async function loadDashboard() {
    try {
        const data = await api('/courses/dashboard');
        state.currentCourse = data.activeCourse;
        state.drugs = data.drugs;

        document.getElementById('course-name').textContent = state.currentCourse?.title || '—';
        document.getElementById('course-dates').textContent = state.currentCourse
            ? `${formatDate(state.currentCourse.startDate)} — ${formatDate(state.currentCourse.endDate)}`
            : 'Не настроен';
        document.getElementById('course-day').textContent = state.currentCourse?.currentDay || '—';
        document.getElementById('course-progress').textContent = state.currentCourse
            ? `из ${state.currentCourse.totalDays} дней`
            : '—';
        document.getElementById('analyses-count').textContent = data.analysesCount;
        document.getElementById('last-analysis').textContent = data.lastAnalysisDate
            ? `Последний: ${formatDate(data.lastAnalysisDate)}`
            : 'Нет данных';

        const { renderDashboardDrugs, loadAlerts, loadDashboardDonut } = await import('./pages/dashboard.js');
        renderDashboardDrugs();
        await loadAlerts();
        await loadDashboardDonut();
    } catch (e) {
        console.error('Failed to load dashboard:', e);
    }
}

export async function loadDrugs() {
    try {
        state.drugs = await api('/drugs');
        const { renderDrugs, updateLogDrugSelect } = await import('./pages/course.js');
        renderDrugs();
        updateLogDrugSelect();
    } catch (e) {
        console.error('Failed to load drugs:', e);
    }
}

export async function loadIntakeLogs() {
    try {
        state.intakeLogs = await api('/intakelogs?count=20');
        const { renderIntakeLogs } = await import('./pages/course.js');
        renderIntakeLogs();
    } catch (e) {
        console.error('Failed to load logs:', e);
    }
}

export async function loadAnalyses() {
    try {
        state.analyses = await api('/analyses');
        updateAnalysisSelectors();
        // Populate trend chart parameter selector
        if (typeof window.populateTrendSelect === 'function') {
            window.populateTrendSelect();
        }
    } catch (e) {
        console.error('Failed to load analyses:', e);
    }
}

// Экспортируем в window для использования в HTML
window.loadDashboard = loadDashboard
window.loadDrugs = loadDrugs
window.loadIntakeLogs = loadIntakeLogs
window.loadAnalyses = loadAnalyses

function updateAnalysisSelectors() {
    const options = state.analyses.map(a => `<option value="${a.id}">${formatDate(a.date)} — ${a.label}</option>`).join('');
    const select = document.getElementById('analysis-select');
    const before = document.getElementById('compare-before');
    const after = document.getElementById('compare-after');
    if (select) select.innerHTML = '<option value="">Выберите анализ...</option>' + options;
    if (before) before.innerHTML = '<option value="">Выберите...</option>' + options;
    if (after) after.innerHTML = '<option value="">Выберите...</option>' + options;
}

function updateUserDisplay() {
    const user = auth.getUser();
    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl && user) {
        userInfoEl.style.display = 'flex';
        document.getElementById('user-email-display').textContent = user.displayName || user.email;
    }

    // Show admin tab if user is admin and not impersonating
    const adminBtn = document.getElementById('admin-nav-btn');
    if (adminBtn) {
        adminBtn.style.display = (auth.isAdmin() && !auth.isImpersonating()) ? '' : 'none';
    }

    // Show impersonation banner if impersonating
    if (auth.isImpersonating()) {
        showImpersonationBanner(user);
    }
}

function showImpersonationBanner(user) {
    if (document.getElementById('impersonation-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'impersonation-banner';
    banner.className = 'impersonation-banner';
    banner.innerHTML = `
        <span>Просмотр данных: <strong>${user?.email || 'unknown'}</strong></span>
        <button class="impersonation-exit-btn" onclick="window.auth.stopImpersonation()">[ ВЫЙТИ ]</button>
    `;
    document.body.prepend(banner);
}

async function init() {
    // Auth gate — show login if not authenticated
    if (!auth.isLoggedIn()) {
        loadSavedColor();
        const { showLoginPage } = await import('./pages/login.js');
        showLoginPage();
        return;
    }

    loadSavedColor();
    updateUserDisplay();
    await loadReferenceRanges();
    await loadAnalyses();
    await loadDrugs();
    await loadIntakeLogs();
    await loadDashboard();

    const skullStrip = document.getElementById('ascii-skeleton-strip');
    if (skullStrip) {
        skullStrip.innerHTML = renderAsciiSkull();
        setTimeout(() => {
            scaleAsciiSkull();
        }, 100);
    }

    const colorfulAscii = document.querySelector('.colorful-ascii');
    if (colorfulAscii) {
        const lines = colorfulAscii.textContent.split('\n');
        const normalizedLines = lines.map(line => line.trimStart());
        colorfulAscii.textContent = normalizedLines.join('\n');
    }

    initNavigation();

    // Initialize course tabs
    const { initCourseTabs } = await import('./pages/courseTabs.js');
    initCourseTabs();

    // Initialize ASCII Art Studio
    const { initAsciiArtUI } = await import('./components/asciiArtUI.js');
    if (document.getElementById('ascii-art-studio')) {
        initAsciiArtUI('ascii-art-studio');
    }

    initRunes();

    startMatrixRunes();

    initProgressBar();

    loadSavedFont();

    // Initialize ASCIIfy text renderer
    if (window.asciify) {
        window.asciify.init();
        // Update toggle button state on load
        const toggleBtn = document.getElementById('asciify-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = window.asciify.enabled ? '[ ASCII: ON ]' : '[ ASCII: OFF ]';
            toggleBtn.classList.toggle('active', window.asciify.enabled);
        }
    }

    setTimeout(() => {
        startSparkAnimation();
    }, 500);

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            scaleAsciiSkull();
        }, 150);
    });

    if (state.currentCourse) {
        const titleEl = document.getElementById('course-title');
        const startEl = document.getElementById('course-start');
        const endEl = document.getElementById('course-end');
        const notesEl = document.getElementById('course-notes');
        if (titleEl) titleEl.value = state.currentCourse.title || '';
        if (startEl) startEl.value = state.currentCourse.startDate?.split('T')[0] || '';
        if (endEl) endEl.value = state.currentCourse.endDate?.split('T')[0] || '';
        if (notesEl) notesEl.value = state.currentCourse.notes || '';
    }
}

function initRunes() {
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
