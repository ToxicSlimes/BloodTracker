import React, { useEffect, useRef, useCallback } from 'react'
import { state } from '../../state.js'
import { useAppState } from '../hooks/useAppState.js'
import { workoutSessionsApi } from '../../api.js'

// ═══════════════════════════════════════════════════════════════════════════════
// REST TIMER — fixed bottom bar during workout rest periods
// ═══════════════════════════════════════════════════════════════════════════════

let audioContext: AudioContext | null = null

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function playBeep(): void {
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

function vibrateDevice(pattern: number[]): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

function showCompletionNotification(): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification('Отдых завершён', {
    body: 'Время начать следующий подход',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'rest-timer',
    requireInteraction: false,
  })
}

function requestNotificationPermission(): void {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'default') return
  Notification.requestPermission()
}

// ─── Exported API (used by ActiveWorkoutTab) ────────────────────────────────

export async function startRestTimer(durationSeconds?: number): Promise<void> {
  let seconds = durationSeconds
  let playSound = true
  let vibrate = true

  if (seconds === undefined) {
    try {
      const settings = (await workoutSessionsApi.getRestTimerSettings()) as {
        defaultRestSeconds: number
        autoStartTimer: boolean
        playSound: boolean
        vibrate: boolean
      }
      playSound = settings.playSound
      vibrate = settings.vibrate
      if (!settings.autoStartTimer) return
      seconds = settings.defaultRestSeconds
    } catch {
      seconds = 90
    }
  }

  if (seconds === undefined) seconds = 90

  state.restTimerState = {
    isRunning: true,
    remainingSeconds: seconds,
    totalSeconds: seconds,
    startTime: Date.now(),
    pausedAt: undefined,
    playSound,
    vibrate,
  }

  requestNotificationPermission()
}

export function stopTimer(): void {
  state.restTimerState = {
    isRunning: false,
    remainingSeconds: 0,
    totalSeconds: 90,
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RestTimer() {
  const timer = useAppState('restTimerState')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)

  const handleComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true

    if (timer.vibrate !== false) {
      vibrateDevice([200, 100, 200])
    }
    if (timer.playSound !== false) {
      playBeep()
    }
    showCompletionNotification()
    stopTimer()
  }, [timer.vibrate, timer.playSound])

  useEffect(() => {
    if (!timer.isRunning) {
      completedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return undefined
    }

    intervalRef.current = setInterval(() => {
      if (!state.restTimerState.isRunning || state.restTimerState.pausedAt) return

      const elapsed = Math.floor((Date.now() - (state.restTimerState.startTime || 0)) / 1000)
      const remaining = Math.max(0, state.restTimerState.totalSeconds - elapsed)

      state.restTimerState = {
        ...state.restTimerState,
        remainingSeconds: remaining,
      }

      if (remaining <= 0) {
        handleComplete()
      }
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timer.isRunning, handleComplete])

  const handleTogglePause = useCallback(() => {
    if (!state.restTimerState.isRunning) return

    if (state.restTimerState.pausedAt) {
      const pausedDuration = Date.now() - state.restTimerState.pausedAt
      state.restTimerState = {
        ...state.restTimerState,
        startTime: (state.restTimerState.startTime || 0) + pausedDuration,
        pausedAt: undefined,
      }
    } else {
      state.restTimerState = {
        ...state.restTimerState,
        pausedAt: Date.now(),
      }
    }
  }, [])

  const handleAdjust = useCallback((deltaSeconds: number) => {
    if (!state.restTimerState.isRunning) return

    const current = state.restTimerState
    const newRemaining = Math.max(0, current.remainingSeconds + deltaSeconds)
    const elapsed = current.totalSeconds - current.remainingSeconds

    state.restTimerState = {
      ...current,
      totalSeconds: elapsed + newRemaining,
      remainingSeconds: newRemaining,
      startTime: Date.now() - elapsed * 1000,
    }
  }, [])

  if (!timer.isRunning) return null

  const isAlert = timer.remainingSeconds <= 5
  const barClass = `rest-timer-bar active${isAlert ? ' alert' : ''}`
  const pauseLabel = timer.pausedAt ? 'ПРОДОЛЖИТЬ' : 'ПАУЗА'

  return (
    <div className={barClass}>
      <div className="rest-timer-display">
        <div>
          <div className="rest-timer-label">Отдых</div>
          <div
            className="rest-timer-time"
            role="timer"
            aria-live="polite"
            aria-label="Таймер отдыха"
          >
            {formatTime(timer.remainingSeconds)}
          </div>
        </div>
        <div className="rest-timer-label">
          {timer.remainingSeconds}s / {timer.totalSeconds}s
        </div>
      </div>
      <div className="rest-timer-controls">
        <button className="rest-timer-btn" aria-label="Пауза таймера" onClick={handleTogglePause}>
          {pauseLabel}
        </button>
        <button className="rest-timer-btn" aria-label="Пропустить отдых" onClick={stopTimer}>
          ПРОПУСТИТЬ
        </button>
        <button
          className="rest-timer-btn"
          aria-label="Уменьшить на 15 секунд"
          onClick={() => handleAdjust(-15)}
        >
          -15s
        </button>
        <button
          className="rest-timer-btn"
          aria-label="Увеличить на 30 секунд"
          onClick={() => handleAdjust(30)}
        >
          +30s
        </button>
      </div>
    </div>
  )
}
