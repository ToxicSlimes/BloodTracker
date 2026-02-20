// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE - Google OAuth & Email Magic Code
// ═══════════════════════════════════════════════════════════════════════════════

import { API_URL } from '../config.js';
import { ENDPOINTS } from '../endpoints.js';
import { auth } from '../auth.js';
import { showGateScene, playGateOpenAnimation } from '../dungeon/dungeonGate.js';

/** ASCII-арт баннер для страницы логина */
const LOGIN_ASCII = `\
╔════════════════════════════════════════════════╗
║                                                ║
║   ███████╗███╗   ██╗████████╗███████╗██████╗   ║
║   ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗  ║
║   █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝  ║
║   ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗  ║
║   ███████╗██║ ╚████║   ██║   ███████╗██║  ██║  ║
║   ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝  ║
║                                                ║
║             T H E   D U N G E O N              ║
║                                                ║
╚════════════════════════════════════════════════╝`;

/** ID таймера обратного отсчёта кода подтверждения */
let codeTimer = null;

/**
 * Показывает страницу логина (overlay поверх приложения).
 * Создаёт DOM-элементы формы email + code, привязывает Enter-обработчики,
 * инициализирует Google Sign-In.
 */
export function showLoginPage() {
    // Hide main app
    document.querySelector('.app')?.classList.add('auth-hidden');

    // Remove existing login overlay if any
    document.getElementById('login-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.className = 'login-overlay';
    // ── Login overlay ──────────────────────────
    // [ASCII баннер]
    // Step 1 (email): [Google кнопка] [Divider] [Email input] [Отправить код]
    // Step 2 (code):  [Hint email] [Code input] [Подтвердить] [Назад] [Таймер]
    overlay.innerHTML = `

        <div class="login-container">
            <pre class="login-ascii">${LOGIN_ASCII}</pre>

            <div class="login-form" id="login-step-email">
                <div class="google-btn-wrapper" id="google-signin-container" style="display:none">
                    <button class="login-btn login-btn-google" type="button">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        [ ВОЙТИ ЧЕРЕЗ GOOGLE ]
                    </button>
                    <div id="google-signin-btn" class="google-btn-overlay"></div>
                </div>

                <div class="login-divider" id="login-divider" style="display:none">
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

    // Show dungeon gate scene behind login
    try { showGateScene(); } catch {}

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

/**
 * Инициализирует Google Sign-In: загружает конфиг с сервера, рендерит кнопку.
 * Если Google Client ID не настроен или GSI недоступен — скрывает кнопку.
 * @returns {Promise<void>}
 */
async function initGoogleAuth() {
    const googleContainer = document.getElementById('google-signin-container');
    const divider = document.getElementById('login-divider');
    const hide = () => {
        if (googleContainer) googleContainer.style.display = 'none';
        if (divider) divider.style.display = 'none';
    };
    try {
        const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.config}`);
        if (!res.ok) { hide(); return; }
        const config = await res.json();
        if (config.googleClientId && window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
                client_id: config.googleClientId,
                callback: window.handleGoogleCredential
            });
            // Hidden real Google button overlays our custom styled one
            const btnContainer = document.getElementById('google-signin-btn');
            if (btnContainer) {
                window.google.accounts.id.renderButton(btnContainer, {
                    type: 'standard',
                    theme: 'filled_black',
                    size: 'large',
                    text: 'signin_with',
                    width: 400
                });
            }
            if (googleContainer) googleContainer.style.display = 'block';
            if (divider) divider.style.display = 'flex';
        } else {
            hide();
        }
    } catch (e) {
        console.warn('Failed to load auth config:', e);
        hide();
    }
}

/**
 * Обрабатывает успешный ответ авторизации (token + user).
 * Сохраняет сессию, убирает overlay, перезагружает страницу.
 * @param {Object} data — ответ сервера с полями token и user
 * @returns {Promise<void>}
 */
async function handleAuthResponse(data) {
    if (data.token && data.user) {
        auth.setSession(data.token, data.user);

        // Play dungeon gate opening animation before reload
        try {
            await playGateOpenAnimation();
        } catch {}

        document.getElementById('login-overlay')?.remove();
        document.querySelector('.app')?.classList.remove('auth-hidden');
        window.location.reload();
    }
}

/**
 * Callback Google GSI — вызывается после клика по кнопке Google Sign-In.
 * Отправляет idToken на сервер для верификации.
 * @param {Object} response — ответ Google GSI с полем credential
 * @returns {Promise<void>}
 */
// Called by Google GSI callback (from renderButton click)
window.handleGoogleCredential = async function(response) {
    try {
        const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.google}`, {
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

/**
 * Отправляет magic code на указанный email.
 * При успехе — переключает UI на шаг ввода кода и запускает таймер.
 * Если SMTP недоступен — сервер возвращает devCode для автозаполнения.
 * @returns {Promise<void>}
 */
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
        const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.sendCode}`, {
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

        const data = await res.json().catch(() => ({}));

        // Switch to code input
        document.getElementById('login-step-email').style.display = 'none';
        document.getElementById('login-step-code').style.display = 'block';
        document.getElementById('login-email-display').textContent = email;

        // If SMTP failed, server returns devCode — auto-fill it
        if (data.devCode) {
            document.getElementById('login-code').value = data.devCode;
            showError('login-code-error', '⚠ SMTP недоступен — код подставлен автоматически');
        } else {
            document.getElementById('login-code').focus();
        }

        // Start countdown timer
        startCodeTimer();
    } catch (e) {
        showError('login-error', 'Ошибка подключения к серверу');
        btn.disabled = false;
        btn.textContent = '[ ОТПРАВИТЬ КОД ]';
    }
}

/**
 * Верифицирует 6-значный код подтверждения email.
 * При успехе — вызывает handleAuthResponse для сохранения сессии.
 * @returns {Promise<void>}
 */
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
        const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.verifyCode}`, {
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

/**
 * Возвращает UI на шаг ввода email (из шага ввода кода).
 * Останавливает таймер, сбрасывает состояние кнопки.
 */
function backToEmail() {
    document.getElementById('login-step-email').style.display = 'block';
    document.getElementById('login-step-code').style.display = 'none';
    if (codeTimer) clearInterval(codeTimer);
    const btn = document.getElementById('send-code-btn');
    btn.disabled = false;
    btn.textContent = '[ ОТПРАВИТЬ КОД ]';
}

/**
 * Запускает 10-минутный таймер обратного отсчёта для кода подтверждения.
 * По истечении показывает сообщение об истечении кода.
 */
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

/**
 * Показывает сообщение об ошибке в указанном элементе.
 * @param {string} id — ID DOM-элемента для отображения ошибки
 * @param {string} msg — текст ошибки
 */
function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

/**
 * Скрывает сообщение об ошибке в указанном элементе.
 * @param {string} id — ID DOM-элемента ошибки
 */
function hideError(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// Expose to window for inline onclick handlers
window.loginPage = { sendCode, verifyCode, backToEmail, showLoginPage };
window.showLoginPage = showLoginPage;
