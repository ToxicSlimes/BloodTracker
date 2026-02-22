import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initRestTimer, startRestTimer, stopTimer } from '../../components/restTimer'

vi.mock('../../state.js', () => ({
  state: {
    restTimerState: {
      isRunning: false,
      remainingSeconds: 0,
      totalSeconds: 90
    }
  }
}))

vi.mock('../../api.js', () => ({
  workoutSessionsApi: {
    getRestTimerSettings: vi.fn().mockResolvedValue({
      defaultRestSeconds: 90,
      autoStartTimer: true,
      playSound: true,
      vibrate: true,
    }),
  },
}))

describe('restTimer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rest-timer-container"></div>'
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('initRestTimer создаёт DOM структуру', () => {
    initRestTimer()
    const bar = document.getElementById('rest-timer-bar')
    expect(bar).toBeTruthy()
  })

  it('создаёт кнопку ПАУЗА', () => {
    initRestTimer()
    const pauseBtn = document.getElementById('rest-timer-pause')
    expect(pauseBtn).toBeTruthy()
    expect(pauseBtn?.textContent).toBe('ПАУЗА')
  })

  it('создаёт кнопку ПРОПУСТИТЬ', () => {
    initRestTimer()
    const skipBtn = document.getElementById('rest-timer-skip')
    expect(skipBtn).toBeTruthy()
    expect(skipBtn?.textContent).toBe('ПРОПУСТИТЬ')
  })

  it('создаёт кнопку -15s', () => {
    initRestTimer()
    const minusBtn = document.getElementById('rest-timer-minus')
    expect(minusBtn).toBeTruthy()
    expect(minusBtn?.textContent).toBe('-15s')
  })

  it('создаёт кнопку +30s', () => {
    initRestTimer()
    const plusBtn = document.getElementById('rest-timer-plus')
    expect(plusBtn).toBeTruthy()
    expect(plusBtn?.textContent).toBe('+30s')
  })

  it('создаёт отображение времени', () => {
    initRestTimer()
    const timeEl = document.getElementById('rest-timer-time')
    expect(timeEl).toBeTruthy()
  })

  it('создаёт отображение прогресса', () => {
    initRestTimer()
    const progressEl = document.getElementById('rest-timer-progress')
    expect(progressEl).toBeTruthy()
  })

  it('startRestTimer устанавливает active класс', () => {
    initRestTimer()
    startRestTimer(90)
    
    const bar = document.getElementById('rest-timer-bar')
    expect(bar?.classList.contains('active')).toBe(true)
  })

  it('startRestTimer с параметром 60 секунд', async () => {
    initRestTimer()
    const { state } = await import('../../state.js')
    
    startRestTimer(60)
    
    expect(state.restTimerState.totalSeconds).toBe(60)
    expect(state.restTimerState.isRunning).toBe(true)
  })

  it('startRestTimer без параметров даёт 90 секунд по умолчанию', async () => {
    initRestTimer()
    const { state } = await import('../../state.js')

    await startRestTimer()

    expect(state.restTimerState.totalSeconds).toBe(90)
  })

  it('stopTimer очищает интервал', () => {
    initRestTimer()
    startRestTimer(90)
    
    stopTimer()
    
    const bar = document.getElementById('rest-timer-bar')
    expect(bar?.classList.contains('active')).toBe(false)
  })

  it('stopTimer сбрасывает state', async () => {
    initRestTimer()
    const { state } = await import('../../state.js')
    
    startRestTimer(90)
    stopTimer()
    
    expect(state.restTimerState.isRunning).toBe(false)
    expect(state.restTimerState.remainingSeconds).toBe(0)
  })

  it('display обновляется с правильным форматом', () => {
    initRestTimer()
    startRestTimer(125)
    
    vi.advanceTimersByTime(100)
    
    const timeEl = document.getElementById('rest-timer-time')
    expect(timeEl?.textContent).toMatch(/\d{2}:\d{2}/)
  })

  it('alert класс при remainingSeconds <= 5', () => {
    initRestTimer()
    startRestTimer(5)
    
    vi.advanceTimersByTime(100)
    
    const bar = document.getElementById('rest-timer-bar')
    expect(bar?.classList.contains('alert')).toBe(true)
  })

  it('кнопка -15s вызывает adjustTimer', () => {
    initRestTimer()
    startRestTimer(90)
    
    const minusBtn = document.getElementById('rest-timer-minus') as HTMLButtonElement
    minusBtn.click()
    
    vi.advanceTimersByTime(100)
    
    const timeEl = document.getElementById('rest-timer-time')
    expect(timeEl?.textContent).toContain('01:15')
  })

  it('кнопка +30s вызывает adjustTimer', () => {
    initRestTimer()
    startRestTimer(60)
    
    const plusBtn = document.getElementById('rest-timer-plus') as HTMLButtonElement
    plusBtn.click()
    
    vi.advanceTimersByTime(100)
    
    const timeEl = document.getElementById('rest-timer-time')
    expect(timeEl?.textContent).toContain('01:30')
  })

  it('кнопка ПРОПУСТИТЬ останавливает таймер', () => {
    initRestTimer()
    startRestTimer(90)
    
    const skipBtn = document.getElementById('rest-timer-skip') as HTMLButtonElement
    skipBtn.click()
    
    const bar = document.getElementById('rest-timer-bar')
    expect(bar?.classList.contains('active')).toBe(false)
  })

  it('не создаёт дублирующую DOM структуру', () => {
    initRestTimer()
    initRestTimer()
    
    const bars = document.querySelectorAll('#rest-timer-bar')
    expect(bars.length).toBe(1)
  })
})
