// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE - Google OAuth & Email Magic Code
// ═══════════════════════════════════════════════════════════════════════════════

import { API_URL } from '../config.js';
import { auth } from '../auth.js';

const LOGIN_ASCII = `
    ╔══════════════════════════════════════════════════╗
    ║                                                  ║
    ║      ███████╗███╗   ██╗████████╗███████╗██████╗  ║
    ║      ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗ ║
    ║      █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝ ║
    ║      ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗ ║
    ║      ███████╗██║ ╚████║   ██║   ███████╗██║  ██║ ║
    ║      ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝ ║
    ║                                                  ║
    ║          T H E   D U N G E O N                   ║
    ║                                                  ║
    ╚══════════════════════════════════════════════════╝`;

let codeTimer = null;

export function showLoginPage() {
    // Hide main app
    document.querySelector('.app')?.classList.add('auth-hidden');

    // Remove existing login overlay if any
    document.getElementById('login-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
        <div class="login-container">
            <pre class="login-ascii">${LOGIN_ASCII}</pre>

            <div class="login-form" id="login-step-email">
                <div id="google-signin-container">
                    <button class="login-btn login-btn-google" id="google-login-btn" onclick="window.loginPage.googleLogin()">
                        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                        [ ВОЙТИ ЧЕРЕЗ GOOGLE ]
                    </button>
                </div>

                <div class="login-divider">
                    <span>или</span>
                </div>

                <div class="login-field">
                    <label>Email</label>
                    <input type="email" id="login-email" placeholder="your@email.com" autocomplete="email">
                </div>
                <button class="login-btn login-btn-primary" id="send-code-btn" onclick="window.loginPage.sendCode()">
                    [ ОТПРАВИТЬ КОД ]
                </button>
                <div id="login-error" class="login-error"></div>
            </div>

            <div class="login-form" id="login-step-code" style="display: none;">
                <p class="login-hint">Код отправлен на <strong id="login-email-display"></strong></p>
                <div class="login-field">
                    <label>Код подтверждения</label>
                    <input type="text" id="login-code" placeholder="000000" maxlength="6" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]*">
                </div>
                <button class="login-btn login-btn-primary" id="verify-code-btn" onclick="window.loginPage.verifyCode()">
                    [ ПОДТВЕРДИТЬ ]
                </button>
                <button class="login-btn login-btn-secondary" onclick="window.loginPage.backToEmail()">
                    [ НАЗАД ]
                </button>
                <div id="login-code-timer" class="login-timer"></div>
                <div id="login-code-error" class="login-error"></div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Enter key handling
    document.getElementById('login-email')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.loginPage.sendCode();
    });
    document.getElementById('login-code')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.loginPage.verifyCode();
    });

    // Initialize Google Sign-In
    initGoogleAuth();
}

async function initGoogleAuth() {
    try {
        const res = await fetch(`${API_URL}/api/auth/config`);
        if (!res.ok) return;
        const config = await res.json();
        if (config.googleClientId && window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
                client_id: config.googleClientId,
                callback: window.handleGoogleCredential
            });
            // Show the Google button only if configured
            const googleContainer = document.getElementById('google-signin-container');
            if (googleContainer) googleContainer.style.display = 'block';
        } else {
            // Hide Google button if not configured
            const googleContainer = document.getElementById('google-signin-container');
            if (googleContainer) googleContainer.style.display = 'none';
            // Also hide the divider if Google is not available
            const divider = document.querySelector('.login-divider');
            if (divider) divider.style.display = 'none';
        }
    } catch (e) {
        console.warn('Failed to load auth config:', e);
        // Hide Google button on error
        const googleContainer = document.getElementById('google-signin-container');
        if (googleContainer) googleContainer.style.display = 'none';
        const divider = document.querySelector('.login-divider');
        if (divider) divider.style.display = 'none';
    }
}

async function handleAuthResponse(data) {
    if (data.token && data.user) {
        auth.setSession(data.token, data.user);
        document.getElementById('login-overlay')?.remove();
        document.querySelector('.app')?.classList.remove('auth-hidden');
        window.location.reload();
    }
}

async function googleLogin() {
    // Google Sign-In with popup using GSI
    if (!window.google?.accounts?.id) {
        showError('login-error', 'Google Sign-In не загружен. Проверьте подключение к интернету.');
        return;
    }

    // Trigger Google One Tap or prompt
    window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            showError('login-error', 'Google авторизация недоступна. Попробуйте email.');
        }
    });
}

// Called by Google GSI callback
window.handleGoogleCredential = async function(response) {
    try {
        const res = await fetch(`${API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showError('login-error', err.error || 'Ошибка авторизации Google');
            return;
        }

        const data = await res.json();
        await handleAuthResponse(data);
    } catch (e) {
        showError('login-error', 'Ошибка подключения к серверу');
    }
};

async function sendCode() {
    const email = document.getElementById('login-email')?.value?.trim();
    if (!email) {
        showError('login-error', 'Введите email');
        return;
    }

    const btn = document.getElementById('send-code-btn');
    btn.disabled = true;
    btn.textContent = '[ ОТПРАВКА... ]';
    hideError('login-error');

    try {
        const res = await fetch(`${API_URL}/api/auth/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showError('login-error', err.error || 'Ошибка отправки кода');
            btn.disabled = false;
            btn.textContent = '[ ОТПРАВИТЬ КОД ]';
            return;
        }

        // Switch to code input
        document.getElementById('login-step-email').style.display = 'none';
        document.getElementById('login-step-code').style.display = 'block';
        document.getElementById('login-email-display').textContent = email;
        document.getElementById('login-code').focus();

        // Start countdown timer
        startCodeTimer();
    } catch (e) {
        showError('login-error', 'Ошибка подключения к серверу');
        btn.disabled = false;
        btn.textContent = '[ ОТПРАВИТЬ КОД ]';
    }
}

async function verifyCode() {
    const email = document.getElementById('login-email')?.value?.trim();
    const code = document.getElementById('login-code')?.value?.trim();
    if (!code || code.length !== 6) {
        showError('login-code-error', 'Введите 6-значный код');
        return;
    }

    const btn = document.getElementById('verify-code-btn');
    btn.disabled = true;
    btn.textContent = '[ ПРОВЕРКА... ]';
    hideError('login-code-error');

    try {
        const res = await fetch(`${API_URL}/api/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showError('login-code-error', err.error || 'Неверный или просроченный код');
            btn.disabled = false;
            btn.textContent = '[ ПОДТВЕРДИТЬ ]';
            return;
        }

        const data = await res.json();
        await handleAuthResponse(data);
    } catch (e) {
        showError('login-code-error', 'Ошибка подключения к серверу');
        btn.disabled = false;
        btn.textContent = '[ ПОДТВЕРДИТЬ ]';
    }
}

function backToEmail() {
    document.getElementById('login-step-email').style.display = 'block';
    document.getElementById('login-step-code').style.display = 'none';
    if (codeTimer) clearInterval(codeTimer);
    const btn = document.getElementById('send-code-btn');
    btn.disabled = false;
    btn.textContent = '[ ОТПРАВИТЬ КОД ]';
}

function startCodeTimer() {
    let seconds = 600; // 10 minutes
    const timerEl = document.getElementById('login-code-timer');
    if (codeTimer) clearInterval(codeTimer);

    codeTimer = setInterval(() => {
        seconds--;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        timerEl.textContent = `Код действителен: ${m}:${s.toString().padStart(2, '0')}`;
        if (seconds <= 0) {
            clearInterval(codeTimer);
            timerEl.textContent = 'Код истёк. Запросите новый.';
        }
    }, 1000);
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// Expose to window for inline onclick handlers
window.loginPage = { googleLogin, sendCode, verifyCode, backToEmail, showLoginPage };
window.showLoginPage = showLoginPage;
