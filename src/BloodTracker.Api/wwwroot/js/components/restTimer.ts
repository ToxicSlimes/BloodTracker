import { state } from '../state.js'

let timerInterval: ReturnType<typeof setInterval> | null = null
let notificationShown = false
let audioContext: AudioContext | null = null

export function initRestTimer(): void {
    const container = document.getElementById('rest-timer-container')
    if (!container) return

    container.innerHTML = `
        <div class="rest-timer-bar" id="rest-timer-bar">
            <div class="rest-timer-display">
                <div>
                    <div class="rest-timer-label">Отдых</div>
                    <div class="rest-timer-time" id="rest-timer-time">00:00</div>
                </div>
                <div class="rest-timer-label" id="rest-timer-progress">0 / 90s</div>
            </div>
            <div class="rest-timer-controls">
                <button class="rest-timer-btn" id="rest-timer-pause">ПАУЗА</button>
                <button class="rest-timer-btn" id="rest-timer-skip">ПРОПУСТИТЬ</button>
                <button class="rest-timer-btn" id="rest-timer-minus">-15s</button>
                <button class="rest-timer-btn" id="rest-timer-plus">+30s</button>
            </div>
        </div>
    `

    document.getElementById('rest-timer-pause')?.addEventListener('click', toggleTimer)
    document.getElementById('rest-timer-skip')?.addEventListener('click', stopTimer)
    document.getElementById('rest-timer-minus')?.addEventListener('click', () => adjustTimer(-15))
    document.getElementById('rest-timer-plus')?.addEventListener('click', () => adjustTimer(30))
}

export function startRestTimer(durationSeconds: number = 90): void {
    state.restTimerState = {
        isRunning: true,
        remainingSeconds: durationSeconds,
        totalSeconds: durationSeconds,
        startTime: Date.now(),
        pausedAt: undefined
    }
    notificationShown = false

    const bar = document.getElementById('rest-timer-bar')
    if (bar) {
        bar.classList.add('active')
        bar.classList.remove('alert')
    }

    if (timerInterval) clearInterval(timerInterval)
    
    timerInterval = setInterval(() => {
        if (!state.restTimerState.isRunning || state.restTimerState.pausedAt) return

        const elapsed = Math.floor((Date.now() - (state.restTimerState.startTime || 0)) / 1000)
        state.restTimerState.remainingSeconds = Math.max(0, state.restTimerState.totalSeconds - elapsed)

        updateTimerDisplay()

        if (state.restTimerState.remainingSeconds <= 0) {
            onTimerComplete()
        } else if (state.restTimerState.remainingSeconds <= 5) {
            const bar = document.getElementById('rest-timer-bar')
            if (bar) bar.classList.add('alert')
        }
    }, 100)

    requestNotificationPermission()
}

function updateTimerDisplay(): void {
    const timeEl = document.getElementById('rest-timer-time')
    const progressEl = document.getElementById('rest-timer-progress')
    
    if (!timeEl || !progressEl) return

    const remaining = state.restTimerState.remainingSeconds
    const total = state.restTimerState.totalSeconds
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    
    timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    progressEl.textContent = `${remaining}s / ${total}s`
}

function toggleTimer(): void {
    if (!state.restTimerState.isRunning) return

    const pauseBtn = document.getElementById('rest-timer-pause')
    if (!pauseBtn) return

    if (state.restTimerState.pausedAt) {
        const pausedDuration = Date.now() - state.restTimerState.pausedAt
        state.restTimerState.startTime = (state.restTimerState.startTime || 0) + pausedDuration
        state.restTimerState.pausedAt = undefined
        pauseBtn.textContent = 'ПАУЗА'
    } else {
        state.restTimerState.pausedAt = Date.now()
        pauseBtn.textContent = 'ПРОДОЛЖИТЬ'
    }
}

export function stopTimer(): void {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }

    state.restTimerState = {
        isRunning: false,
        remainingSeconds: 0,
        totalSeconds: 90
    }

    const bar = document.getElementById('rest-timer-bar')
    if (bar) {
        bar.classList.remove('active')
        bar.classList.remove('alert')
    }
}

function adjustTimer(deltaSeconds: number): void {
    if (!state.restTimerState.isRunning) return

    const newRemaining = Math.max(0, state.restTimerState.remainingSeconds + deltaSeconds)
    const elapsed = state.restTimerState.totalSeconds - state.restTimerState.remainingSeconds
    
    state.restTimerState.totalSeconds = elapsed + newRemaining
    state.restTimerState.remainingSeconds = newRemaining
    state.restTimerState.startTime = Date.now() - (elapsed * 1000)
    
    updateTimerDisplay()
}

function onTimerComplete(): void {
    stopTimer()
    
    playSound()
    vibrate([200, 100, 200])
    
    if (!notificationShown && 'Notification' in window && Notification.permission === 'granted') {
        showNotification()
        notificationShown = true
    }
}

function playSound(): void {
    if (!audioContext) {
        audioContext = new AudioContext()
    }

    if (audioContext.state === 'suspended') return

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
}

function vibrate(pattern: number[]): void {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern)
    }
}

async function requestNotificationPermission(): Promise<void> {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return
    if (Notification.permission === 'denied') return
    
    await Notification.requestPermission()
}

function showNotification(): void {
    new Notification('Отдых завершён', {
        body: 'Время начать следующий подход',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'rest-timer',
        requireInteraction: false
    })
}
