// ═══════════════════════════════════════════════════════════════════════════════
// AUTH - Token & session management
// ═══════════════════════════════════════════════════════════════════════════════

interface JwtPayload {
    role?: string
    [key: string]: unknown
}

interface UserInfo {
    email: string
    displayName?: string
    [key: string]: unknown
}

/**
 * Декодирует payload JWT токена из base64.
 * @param {string} token — JWT токен
 * @returns {Object|null} — декодированный payload или null при ошибке
 */
function parseJwt(token: string): JwtPayload | null {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
        return null;
    }
}

export interface Auth {
    getToken: () => string | null
    getUser: () => UserInfo | null
    setSession: (token: string, user: UserInfo) => void
    logout: () => void
    isLoggedIn: () => boolean
    isAdmin: () => boolean
    isImpersonating: () => boolean
    startImpersonation: (token: string, email: string, displayName: string) => void
    stopImpersonation: () => void
}

/** Модуль авторизации: JWT хранение, login/logout, проверка ролей, имперсонация */
export const auth: Auth = {
    getToken: (): string | null => localStorage.getItem('bt_token'),
    getUser: (): UserInfo | null => JSON.parse(localStorage.getItem('bt_user') || 'null'),
    setSession: (token: string, user: UserInfo): void => {
        localStorage.setItem('bt_token', token);
        localStorage.setItem('bt_user', JSON.stringify(user));
    },
    logout: (): void => {
        // If impersonating, just restore admin token
        const adminToken = sessionStorage.getItem('bt_admin_token');
        if (adminToken) {
            const adminUser = JSON.parse(sessionStorage.getItem('bt_admin_user') || 'null') as UserInfo | null;
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
    isLoggedIn: (): boolean => !!localStorage.getItem('bt_token'),
    isAdmin: (): boolean => {
        const token = localStorage.getItem('bt_token');
        if (!token) return false;
        const payload = parseJwt(token);
        return payload?.role === 'admin';
    },
    isImpersonating: (): boolean => !!sessionStorage.getItem('bt_admin_token'),
    startImpersonation: (token: string, email: string, displayName: string): void => {
        // Save admin token
        sessionStorage.setItem('bt_admin_token', localStorage.getItem('bt_token')!);
        sessionStorage.setItem('bt_admin_user', localStorage.getItem('bt_user')!);
        // Set impersonation token
        localStorage.setItem('bt_token', token);
        localStorage.setItem('bt_user', JSON.stringify({ email, displayName }));
        window.location.reload();
    },
    stopImpersonation: (): void => {
        const adminToken = sessionStorage.getItem('bt_admin_token');
        const adminUser = JSON.parse(sessionStorage.getItem('bt_admin_user') || 'null') as UserInfo | null;
        if (adminToken) {
            localStorage.setItem('bt_token', adminToken);
            if (adminUser) localStorage.setItem('bt_user', JSON.stringify(adminUser));
        }
        sessionStorage.removeItem('bt_admin_token');
        sessionStorage.removeItem('bt_admin_user');
        window.location.reload();
    }
};

(window as unknown as Record<string, unknown>).auth = auth;
