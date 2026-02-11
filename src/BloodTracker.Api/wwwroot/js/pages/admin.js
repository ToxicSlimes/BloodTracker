// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PAGE - User management & system stats
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { auth } from '../auth.js';

let currentTab = 'users';
let usersCache = [];
let statsCache = null;

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export function initAdminPage() {
    const container = document.getElementById('admin-panel');
    if (!container) return;

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

async function loadUsers() {
    try {
        usersCache = await api('/admin/users');
        renderUsersTable();
    } catch (e) {
        document.getElementById('admin-users-table').innerHTML =
            `<div class="empty-state"><h3>Ошибка загрузки: ${e.message}</h3></div>`;
    }
}

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
                    ${users.map(u => `
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
                                <button class="btn btn-secondary btn-small" onclick="window.adminPage.viewUser('${u.id}')">Просмотр</button>
                                <button class="btn btn-secondary btn-small" onclick="window.adminPage.toggleAdmin('${u.id}', ${!u.isAdmin})">${u.isAdmin ? 'Снять админа' : 'Сделать админом'}</button>
                                <button class="btn btn-secondary btn-small admin-delete-btn" onclick="window.adminPage.deleteUser('${u.id}', '${escHtml(u.email)}')">Удалить</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function viewUser(userId) {
    try {
        const resp = await api(`/admin/impersonate/${userId}`);
        auth.startImpersonation(resp.token, resp.email, resp.displayName);
    } catch (e) {
        window.toast?.error('Ошибка: ' + e.message);
    }
}

async function toggleAdmin(userId, makeAdmin) {
    try {
        await api(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ isAdmin: makeAdmin })
        });
        window.toast?.success(makeAdmin ? 'Права администратора выданы' : 'Права администратора сняты');
        await loadUsers();
    } catch (e) {
        window.toast?.error('Ошибка: ' + e.message);
    }
}

async function deleteUser(userId, email) {
    if (!confirm(`Удалить пользователя ${email}?\n\nЭто удалит все данные пользователя безвозвратно!`)) return;

    try {
        await api(`/admin/users/${userId}`, { method: 'DELETE' });
        window.toast?.success(`Пользователь ${email} удалён`);
        await loadUsers();
    } catch (e) {
        window.toast?.error('Ошибка: ' + e.message);
    }
}

async function loadStats() {
    const container = document.getElementById('admin-stats-content');
    if (!container) return;

    try {
        statsCache = await api('/admin/stats');
        renderStats();
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h3>Ошибка загрузки: ${e.message}</h3></div>`;
    }
}

function renderStats() {
    const container = document.getElementById('admin-stats-content');
    if (!container || !statsCache) return;
    const s = statsCache;

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

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Expose to window for onclick handlers
window.adminPage = { initAdminPage, viewUser, toggleAdmin, deleteUser };

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
