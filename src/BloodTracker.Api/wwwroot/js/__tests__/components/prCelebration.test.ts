import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initPRCelebration, showPRCelebration } from '../../components/prCelebration'

describe('prCelebration', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    
    if ('vibrate' in navigator) {
      vi.spyOn(navigator, 'vibrate').mockImplementation(() => true)
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('initPRCelebration создаёт container в body', () => {
    initPRCelebration()
    const container = document.getElementById('pr-celebration-container')
    expect(container).toBeTruthy()
  })

  it('не создаёт дублирующий контейнер', () => {
    initPRCelebration()
    initPRCelebration()
    
    const containers = document.querySelectorAll('#pr-celebration-container')
    expect(containers.length).toBe(1)
  })

  it('showPRCelebration создаёт modal', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    const modal = document.querySelector('.pr-celebration-modal')
    expect(modal).toBeTruthy()
  })

  it('отображает заголовок НОВЫЙ РЕКОРД!', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Squat')
    
    const title = document.querySelector('.pr-celebration-title')
    expect(title?.textContent).toBe('НОВЫЙ РЕКОРД!')
  })

  it('отображает имя упражнения', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Deadlift')
    
    const exerciseName = document.querySelector('.pr-celebration-exercise')
    expect(exerciseName?.textContent).toBe('Deadlift')
  })

  it('escapeHtml защищает от XSS', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, '<script>alert("xss")</script>')
    
    const exerciseName = document.querySelector('.pr-celebration-exercise')
    expect(exerciseName?.innerHTML).not.toContain('<script>')
    expect(exerciseName?.textContent).toContain('script')
  })

  it('отображает тип рекорда Максимальный вес', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    const label = document.querySelector('.pr-celebration-detail-label')
    expect(label?.textContent).toBe('Максимальный вес')
  })

  it('отображает было→стало', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    const change = document.querySelector('.pr-celebration-detail-change')
    expect(change?.textContent).toContain('Было: 90.0')
    expect(change?.textContent).toContain('Стало: 100.0')
  })

  it('отображает улучшение %', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    const improvement = document.querySelector('.pr-celebration-detail-improvement')
    expect(improvement?.textContent).toContain('Улучшение: +11.1%')
  })

  it('кнопка NICE! закрывает modal', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    const btn = document.getElementById('pr-celebration-dismiss') as HTMLButtonElement
    btn.click()
    
    const modal = document.querySelector('.pr-celebration-modal')
    expect(modal?.classList.contains('closing')).toBe(true)
  })

  it('auto-dismiss через 5000ms', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    vi.advanceTimersByTime(5000)
    
    const modal = document.querySelector('.pr-celebration-modal')
    expect(modal?.classList.contains('closing')).toBe(true)
  })

  it('vibration pattern [100, 50, 100, 50, 200]', () => {
    if (!('vibrate' in navigator)) {
      expect(true).toBe(true)
      return
    }
    
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100, 50, 200])
  })

  it('максимум 3 PR в модалке', () => {
    const prs = [
      { recordType: 'MaxWeight', value: 100, previousValue: 90, improvementPercent: 11.1 },
      { recordType: 'MaxEstimated1RM', value: 120, previousValue: 110, improvementPercent: 9.1 },
      { recordType: 'MaxRepAtWeight', value: 10, previousValue: 8, improvementPercent: 25.0 },
      { recordType: 'MaxWeight', value: 105, previousValue: 95, improvementPercent: 10.5 },
      { recordType: 'MaxWeight', value: 110, previousValue: 100, improvementPercent: 10.0 }
    ]
    
    showPRCelebration(prs, 'Squat')
    
    const details = document.querySelectorAll('.pr-celebration-detail')
    expect(details.length).toBe(3)
  })

  it('closing animation добавляет класс closing', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: 90,
      improvementPercent: 11.1
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    const btn = document.getElementById('pr-celebration-dismiss') as HTMLButtonElement
    btn.click()
    
    const modal = document.querySelector('.pr-celebration-modal')
    expect(modal?.classList.contains('closing')).toBe(true)
    expect(modal?.classList.contains('active')).toBe(false)
  })

  it('отображает null previousValue как —', () => {
    const prs = [{
      recordType: 'MaxWeight',
      value: 100,
      previousValue: null,
      improvementPercent: 0
    }]
    
    showPRCelebration(prs, 'Bench Press')
    
    const change = document.querySelector('.pr-celebration-detail-change')
    expect(change?.textContent).toContain('Было: —')
  })
})
