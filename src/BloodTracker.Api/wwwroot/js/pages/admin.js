// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PAGE - User management & system stats
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { ENDPOINTS } from '../endpoints.js';
import { auth } from '../auth.js';
import { escapeHtml, formatDate, formatDateTime } from '../utils.js';

/** Текущий активный таб админ-панели ('users' или 'stats') */
let currentTab = 'users';

/** Кэш загруженных пользователей */
let usersCache = [];

/** Кэш системной статистики */
let statsCache = null;

/**
 * Форматирует размер в байтах в человекочитаемый формат (KB, MB, GB).
 * @param {number} bytes — размер в байтах
 * @returns {string} отформатированная строка (напр. "12.5 MB")
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

/**
 * Инициализирует админ-панель: рендерит layout с табами, привязывает обработчики переключения табов и поиска.
 * Вызывается при первом показе страницы admin.
 */
export function initAdminPage() {
    const container = document.getElementById('admin-panel');
    if (!container) return;

    // ── Layout админ-панели ──────────────────────────
    // Табы: [ПОЛЬЗОВАТЕЛИ] [СТАТИСТИКА]
    // Tab users: [Поиск по email] [Таблица пользователей]
    // Tab stats: [Карточки статистики] [График регистраций]
    container.innerHTML = `
        <div class="admin-tabs">
            <button class="admin-tab active" data-admin-tab="users">[ ПОЛЬЗОВАТЕЛИ ]</button>
            <button class="admin-tab" data-admin-tab="stats">[ СТАТИСТИКА ]</button>
        </div>

        <div class="admin-tab-content active" id="admin-tab-users">
            <div class="card">
                <div class="card-header">
                    <div class="card-title" data-asciify="md">[ ПОЛЬЗОВАТЕЛИ ]</div>
                    <div class="admin-search-wrap">
                        <input type="text" id="admin-user-search" placeholder="Поиск по email..." class="admin-search-input">
                    </div>
                </div>
                <div id="admin-users-table"><div class="loading">Загрузка...</div></div>
            </div>
        </div>

        <div class="admin-tab-content" id="admin-tab-stats">
            <div id="admin-stats-content"><div class="loading">Загрузка...</div></div>
        </div>
    `;

    // Tab switching
    container.querySelectorAll('.admin-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
            container.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.adminTab;
            document.getElementById(`admin-tab-${tab}`)?.classList.add('active');
            currentTab = tab;

            if (tab === 'users') loadUsers();
            if (tab === 'stats') loadStats();
        });
    });

    // Search
    document.getElementById('admin-user-search')?.addEventListener('input', (e) => {
        renderUsersTable(e.target.value.trim().toLowerCase());
    });

    loadUsers();
}

/**
 * Загружает список пользователей с сервера (GET /admin/users) и рендерит таблицу.
 * @returns {Promise<void>}
 */
async function loadUsers() {
    try {
        usersCache = await api(ENDPOINTS.admin.users.list);
        renderUsersTable();
    } catch (e) {
        document.getElementById('admin-users-table').innerHTML =
            `<div class="empty-state"><h3>Ошибка загрузки: ${e.message}</h3></div>`;
    }
}

/**
 * Рендерит таблицу пользователей с фильтрацией по email/имени.
 * Каждая строка содержит: email, имя, роль, даты, счётчики и кнопки действий.
 * @param {string} [filter=''] — строка поиска (lowercase)
 */
function renderUsersTable(filter = '') {
    const container = document.getElementById('admin-users-table');
    if (!container) return;

    let users = usersCache;
    if (filter) {
        users = users.filter(u =>
            u.email.toLowerCase().includes(filter) ||
            (u.displayName || '').toLowerCase().includes(filter)
        );
    }

    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Нет пользователей</h3></div>';
        return;
    }

    // ── Таблица пользователей ──────────────────────────
    // [Email] [Имя] [Роль badge] [Регистрация] [Последний вход]
    // [Анализы count] [Курсы count] [Тренировки count]
    // Кнопки: [Просмотр] [Toggle admin] [Удалить]
    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Имя</th>
                        <th>Роль</th>
                        <th>Регистрация</th>
                        <th>Последний вход</th>
                        <th>Анализы</th>
                        <th>Курсы</th>
                        <th>Тренировки</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => /* escHtml used for all user-supplied data */ `
                        <tr>
                            <td class="admin-email-cell">${escHtml(u.email)}</td>
                            <td>${escHtml(u.displayName || '—')}</td>
                            <td>${u.isAdmin ? '<span class="admin-badge">ADMIN</span>' : 'user'}</td>
                            <td>${formatDate(u.createdAt)}</td>
                            <td>${formatDateTime(u.lastLoginAt)}</td>
                            <td>${u.analysesCount}</td>
                            <td>${u.coursesCount}</td>
                            <td>${u.workoutsCount}</td>
                            <td class="admin-actions-cell">
                                <button class="btn btn-secondary btn-small" data-action="view" data-uid="${u.id}">Просмотр</button>
                                <button class="btn btn-secondary btn-small" data-action="toggle-admin" data-uid="${u.id}" data-make-admin="${!u.isAdmin}">${u.isAdmin ? 'Снять админа' : 'Сделать админом'}</button>
                                <button class="btn btn-secondary btn-small admin-delete-btn" data-action="delete" data-uid="${u.id}" data-email="${escHtml(u.email)}">Удалить</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Имперсонирует пользователя — получает его токен и переключает сессию.
 * @param {string} userId — ID пользователя для просмотра
 * @returns {Promise<void>}
 */
async function viewUser(userId) {
    try {
        const resp = await api(ENDPOINTS.admin.impersonate(userId));
        auth.startImpersonation(resp.token, resp.email, resp.displayName);
    } catch (e) {
        window.toast?.error('Ошибка: ' + e.message);
    }
}

/**
 * Переключает роль пользователя (admin/user).
 * @param {string} userId — ID пользователя
 * @param {boolean} makeAdmin — true = сделать админом, false = снять права
 * @returns {Promise<void>}
 */
async function toggleAdmin(userId, makeAdmin) {
    try {
        await api(ENDPOINTS.admin.users.updateRole(userId), {
            method: 'PUT',
            body: JSON.stringify({ isAdmin: makeAdmin })
        });
        window.toast?.success(makeAdmin ? 'Права администратора выданы' : 'Права администратора сняты');
        await loadUsers();
    } catch (e) {
        window.toast?.error('Ошибка: ' + e.message);
    }
}

/**
 * Удаляет пользователя после подтверждения.
 * Удаление безвозвратное — все данные пользователя теряются.
 * @param {string} userId — ID пользователя
 * @param {string} email — email для отображения в confirm-диалоге
 * @returns {Promise<void>}
 */
async function deleteUser(userId, email) {
    if (!confirm(`Удалить пользователя ${email}?\n\nЭто удалит все данные пользователя безвозвратно!`)) return;

    try {
        await api(ENDPOINTS.admin.users.delete(userId), { method: 'DELETE' });
        window.toast?.success(`Пользователь ${email} удалён`);
        await loadUsers();
    } catch (e) {
        window.toast?.error('Ошибка: ' + e.message);
    }
}

/**
 * Загружает системную статистику (GET /admin/stats) и рендерит карточки.
 * @returns {Promise<void>}
 */
async function loadStats() {
    const container = document.getElementById('admin-stats-content');
    if (!container) return;

    try {
        statsCache = await api(ENDPOINTS.admin.stats);
        renderStats();
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h3>Ошибка загрузки: ${e.message}</h3></div>`;
    }
}

/**
 * Рендерит карточки статистики и график регистраций за 30 дней.
 * Использует ApexCharts для графика (если доступен).
 */
function renderStats() {
    const container = document.getElementById('admin-stats-content');
    if (!container || !statsCache) return;
    const s = statsCache;

    // ── Грид статистики ──────────────────────────
    // [Пользователей total] [Активных 7дн] [Размер БД]
    // [Анализов total] [Курсов total] [Тренировок total]
    // [График регистраций за 30 дней]
    container.innerHTML = `
        <div class="admin-stats-grid">
            <div class="stat-card">
                <h3>Пользователей</h3>
                <div class="stat-value" data-asciify="lg">${s.totalUsers}</div>
                <div class="stat-sub">всего</div>
            </div>
            <div class="stat-card">
                <h3>Активных (7 дн.)</h3>
                <div class="stat-value" data-asciify="lg">${s.activeUsersLast7Days}</div>
                <div class="stat-sub">пользователей</div>
            </div>
            <div class="stat-card">
                <h3>Размер БД</h3>
                <div class="stat-value" data-asciify="lg">${formatBytes(s.totalDbSizeBytes)}</div>
                <div class="stat-sub">всего</div>
            </div>
            <div class="stat-card">
                <h3>Анализов</h3>
                <div class="stat-value" data-asciify="lg">${s.totalAnalyses}</div>
                <div class="stat-sub">всего</div>
            </div>
            <div class="stat-card">
                <h3>Курсов</h3>
                <div class="stat-value" data-asciify="lg">${s.totalCourses}</div>
                <div class="stat-sub">всего</div>
            </div>
            <div class="stat-card">
                <h3>Тренировок</h3>
                <div class="stat-value" data-asciify="lg">${s.totalWorkouts}</div>
                <div class="stat-sub">всего</div>
            </div>
        </div>

        ${s.recentRegistrations.length > 0 ? `
        <div class="card" style="margin-top: 20px;">
            <div class="card-header">
                <div class="card-title" data-asciify="md">[ РЕГИСТРАЦИИ (30 ДНЕЙ) ]</div>
            </div>
            <div id="admin-registrations-chart"></div>
        </div>
        ` : ''}
    `;

    // Render registrations chart if ApexCharts available
    if (s.recentRegistrations.length > 0 && window.ApexCharts) {
        const chartEl = document.getElementById('admin-registrations-chart');
        if (chartEl) {
            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#00ff00';
            const chart = new ApexCharts(chartEl, {
                chart: {
                    type: 'bar',
                    height: 250,
                    background: 'transparent',
                    toolbar: { show: false },
                    foreColor: '#888'
                },
                series: [{ name: 'Регистрации', data: s.recentRegistrations.map(r => r.count) }],
                xaxis: {
                    categories: s.recentRegistrations.map(r => r.date.slice(5)),
                    labels: { style: { fontSize: '10px' } }
                },
                yaxis: { labels: { formatter: v => Math.round(v) } },
                colors: [primaryColor],
                plotOptions: { bar: { borderRadius: 2 } },
                grid: { borderColor: '#222' },
                theme: { mode: 'dark' }
            });
            chart.render();
        }
    }

    // Refresh ASCIIfy if available
    if (window.asciify?.refresh) setTimeout(() => window.asciify.refresh(), 50);
}

// escapeHtml imported from utils.js (was duplicated as escHtml)
const escHtml = escapeHtml;

/**
 * Обработчик делегированных кликов по кнопкам действий в админ-панели.
 * Распознаёт data-action: view, toggle-admin, delete.
 */
// Event delegation for admin action buttons (no more onclick in HTML = no XSS)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const uid = btn.dataset.uid;

    if (action === 'view') viewUser(uid);
    else if (action === 'toggle-admin') toggleAdmin(uid, btn.dataset.makeAdmin === 'true');
    else if (action === 'delete') deleteUser(uid, btn.dataset.email);
});

// Expose only initAdminPage (needed by page router)
window.adminPage = { initAdminPage };

/**
 * MutationObserver для автоинициализации админ-страницы при появлении класса 'active'.
 * Срабатывает один раз (проверяет dataset.initialized).
 */
// Auto-init when admin page becomes visible
const observer = new MutationObserver(() => {
    const adminPage = document.getElementById('admin');
    if (adminPage?.classList.contains('active') && !adminPage.dataset.initialized) {
        adminPage.dataset.initialized = 'true';
        initAdminPage();
    }
});

// Start observing once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const adminPage = document.getElementById('admin');
    if (adminPage) {
        observer.observe(adminPage, { attributes: true, attributeFilter: ['class'] });
    }
});
