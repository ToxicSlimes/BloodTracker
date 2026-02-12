// ═══════════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM - Dungeon Theme
// ═══════════════════════════════════════════════════════════════════════════════

/** Иконки для каждого типа toast-уведомления */
const ICONS = {
    success: '[ \u2713 ]',
    error: '[ \u2620 ]',
    warning: '[ ! ]',
    info: '[ ? ]'
}

/** Время автоматического скрытия toast (мс) */
const DEFAULT_DURATION = 4000

let container = null

/**
 * Создаёт или возвращает существующий DOM-контейнер для toast-уведомлений.
 * @returns {HTMLDivElement} контейнер .toast-container
 */
function ensureContainer() {
    if (container && document.body.contains(container)) return container
    container = document.createElement('div')
    container.className = 'toast-container'
    container.setAttribute('aria-live', 'polite')
    container.setAttribute('aria-atomic', 'false')
    document.body.appendChild(container)
    return container
}

/**
 * Создаёт и показывает toast-уведомление с прогресс-баром и автоскрытием.
 * При наведении мыши таймер паузится.
 * @param {string} message — текст уведомления
 * @param {'success'|'error'|'warning'|'info'} [type='info'] — тип уведомления
 * @param {number} [duration=DEFAULT_DURATION] — время показа в мс
 * @returns {HTMLDivElement} созданный toast-элемент
 */
function createToast(message, type = 'info', duration = DEFAULT_DURATION) {
    const cont = ensureContainer()

    const toast = document.createElement('div')
    toast.className = `toast toast--${type}`
    toast.setAttribute('role', 'status')

    const icon = document.createElement('span')
    icon.className = 'toast-icon'
    icon.textContent = ICONS[type] || ICONS.info

    const content = document.createElement('div')
    content.className = 'toast-content'

    const msg = document.createElement('div')
    msg.className = 'toast-message'
    msg.textContent = message

    const closeBtn = document.createElement('button')
    closeBtn.className = 'toast-close'
    closeBtn.textContent = '\u00d7'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.onclick = () => removeToast(toast)

    const progress = document.createElement('div')
    progress.className = 'toast-progress'
    progress.style.width = '100%'

    content.appendChild(msg)
    toast.appendChild(icon)
    toast.appendChild(content)
    toast.appendChild(closeBtn)
    toast.appendChild(progress)
    cont.appendChild(toast)

    // Auto-dismiss with progress
    let remaining = duration
    let startTime = Date.now()
    let timerId = null
    let rafId = null

    function updateProgress() {
        const elapsed = Date.now() - startTime
        const pct = Math.max(0, 1 - elapsed / duration) * 100
        progress.style.width = pct + '%'
        if (pct > 0) {
            rafId = requestAnimationFrame(updateProgress)
        }
    }

    function startTimer() {
        startTime = Date.now() - (duration - remaining)
        timerId = setTimeout(() => removeToast(toast), remaining)
        rafId = requestAnimationFrame(updateProgress)
    }

    function pauseTimer() {
        if (timerId) clearTimeout(timerId)
        if (rafId) cancelAnimationFrame(rafId)
        remaining -= (Date.now() - startTime)
    }

    toast.addEventListener('mouseenter', pauseTimer)
    toast.addEventListener('mouseleave', startTimer)

    startTimer()

    return toast
}

/**
 * Удаляет toast-уведомление с анимацией исчезновения.
 * @param {HTMLDivElement} toast — toast-элемент для удаления
 */
function removeToast(toast) {
    if (!toast || !toast.parentNode) return
    toast.classList.add('toast-removing')
    toast.addEventListener('animationend', () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast)
    }, { once: true })
}

/**
 * Публичный API toast-уведомлений. Singleton, доступен глобально через window.toast.
 * Типы: success, error, warning, info. Автоскрытие через 4 секунды.
 */
export const toast = {
    success: (msg, duration) => createToast(msg, 'success', duration),
    error: (msg, duration) => createToast(msg, 'error', duration),
    warning: (msg, duration) => createToast(msg, 'warning', duration),
    info: (msg, duration) => createToast(msg, 'info', duration)
}

// Make globally accessible
window.toast = toast
