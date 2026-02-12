// ═══════════════════════════════════════════════════════════════════════════════
// AUTH - Token & session management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Декодирует payload JWT токена из base64.
 * @param {string} token — JWT токен
 * @returns {Object|null} — декодированный payload или null при ошибке
 */
function parseJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
        return null;
    }
}

/** Модуль авторизации: JWT хранение, login/logout, проверка ролей, имперсонация */
export const auth = {
    getToken: () => localStorage.getItem('bt_token'),
    getUser: () => JSON.parse(localStorage.getItem('bt_user') || 'null'),
    setSession: (token, user) => {
        localStorage.setItem('bt_token', token);
        localStorage.setItem('bt_user', JSON.stringify(user));
    },
    logout: () => {
        // If impersonating, just restore admin token
        const adminToken = sessionStorage.getItem('bt_admin_token');
        if (adminToken) {
            const adminUser = JSON.parse(sessionStorage.getItem('bt_admin_user') || 'null');
            localStorage.setItem('bt_token', adminToken);
            if (adminUser) localStorage.setItem('bt_user', JSON.stringify(adminUser));
            sessionStorage.removeItem('bt_admin_token');
            sessionStorage.removeItem('bt_admin_user');
            window.location.reload();
            return;
        }
        localStorage.removeItem('bt_token');
        localStorage.removeItem('bt_user');
        window.location.reload();
    },
    isLoggedIn: () => !!localStorage.getItem('bt_token'),
    isAdmin: () => {
        const token = localStorage.getItem('bt_token');
        if (!token) return false;
        const payload = parseJwt(token);
        return payload?.role === 'admin';
    },
    isImpersonating: () => !!sessionStorage.getItem('bt_admin_token'),
    startImpersonation: (token, email, displayName) => {
        // Save admin token
        sessionStorage.setItem('bt_admin_token', localStorage.getItem('bt_token'));
        sessionStorage.setItem('bt_admin_user', localStorage.getItem('bt_user'));
        // Set impersonation token
        localStorage.setItem('bt_token', token);
        localStorage.setItem('bt_user', JSON.stringify({ email, displayName }));
        window.location.reload();
    },
    stopImpersonation: () => {
        const adminToken = sessionStorage.getItem('bt_admin_token');
        const adminUser = JSON.parse(sessionStorage.getItem('bt_admin_user') || 'null');
        if (adminToken) {
            localStorage.setItem('bt_token', adminToken);
            if (adminUser) localStorage.setItem('bt_user', JSON.stringify(adminUser));
        }
        sessionStorage.removeItem('bt_admin_token');
        sessionStorage.removeItem('bt_admin_user');
        window.location.reload();
    }
};

window.auth = auth;
