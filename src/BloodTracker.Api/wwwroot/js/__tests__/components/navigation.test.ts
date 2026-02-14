import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initNavigation, navigateToPage, switchWorkoutSubTab } from '../../components/navigation'

vi.mock('../../pages/workoutDiary.js', () => ({ 
  initWorkoutDiary: vi.fn() 
}))

vi.mock('../../pages/activeWorkout.js', () => ({ 
  initActiveWorkout: vi.fn() 
}))

vi.mock('../../pages/analytics.js', () => ({ 
  initAnalytics: vi.fn() 
}))

describe('navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav>
        <button class="nav-btn" data-page="dashboard" aria-selected="false">Dashboard</button>
        <button class="nav-btn" data-page="workouts" aria-selected="false">Workouts</button>
      </nav>
      <div id="dashboard" class="page active"></div>
      <div id="workouts" class="page">
        <div class="workout-hub-tab" data-workout-tab="training">Training</div>
        <div class="workout-hub-tab" data-workout-tab="history">History</div>
        <div class="workout-hub-tab" data-workout-tab="analytics">Analytics</div>
        <div id="workout-tab-training" class="workout-hub-panel"></div>
        <div id="workout-tab-history" class="workout-hub-panel"></div>
        <div id="workout-tab-analytics" class="workout-hub-panel"></div>
      </div>
      <div class="modal-overlay active"><div class="modal active"></div></div>
    `
    window.location.hash = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('navigateToPage переключает активную страницу', () => {
    navigateToPage('dashboard')
    
    const dashboardPage = document.getElementById('dashboard')
    const workoutsPage = document.getElementById('workouts')
    
    expect(dashboardPage?.classList.contains('active')).toBe(true)
    expect(workoutsPage?.classList.contains('active')).toBe(false)
  })

  it('navigateToPage активирует страницу workouts', () => {
    navigateToPage('workouts')
    
    const workoutsPage = document.getElementById('workouts')
    expect(workoutsPage?.classList.contains('active')).toBe(true)
  })

  it('navigateToPage(active-workout) маппится на workouts + training', () => {
    navigateToPage('active-workout')
    
    const workoutsPage = document.getElementById('workouts')
    const trainingTab = document.querySelector('[data-workout-tab="training"]')
    
    expect(workoutsPage?.classList.contains('active')).toBe(true)
    expect(trainingTab?.classList.contains('active')).toBe(true)
  })

  it('navigateToPage(workout-diary) маппится на workouts + history', () => {
    navigateToPage('workout-diary')
    
    const workoutsPage = document.getElementById('workouts')
    const historyTab = document.querySelector('[data-workout-tab="history"]')
    
    expect(workoutsPage?.classList.contains('active')).toBe(true)
    expect(historyTab?.classList.contains('active')).toBe(true)
  })

  it('switchWorkoutSubTab(training) активирует таб и панель', () => {
    switchWorkoutSubTab('training')
    
    const trainingTab = document.querySelector('[data-workout-tab="training"]')
    const trainingPanel = document.getElementById('workout-tab-training')
    
    expect(trainingTab?.classList.contains('active')).toBe(true)
    expect(trainingPanel?.classList.contains('active')).toBe(true)
  })

  it('switchWorkoutSubTab(history) активирует таб и панель', () => {
    switchWorkoutSubTab('history')
    
    const historyTab = document.querySelector('[data-workout-tab="history"]')
    const historyPanel = document.getElementById('workout-tab-history')
    
    expect(historyTab?.classList.contains('active')).toBe(true)
    expect(historyPanel?.classList.contains('active')).toBe(true)
  })

  it('switchWorkoutSubTab(analytics) активирует таб и панель', () => {
    switchWorkoutSubTab('analytics')
    
    const analyticsTab = document.querySelector('[data-workout-tab="analytics"]')
    const analyticsPanel = document.getElementById('workout-tab-analytics')
    
    expect(analyticsTab?.classList.contains('active')).toBe(true)
    expect(analyticsPanel?.classList.contains('active')).toBe(true)
  })

  it('nav buttons обновляют aria-selected', () => {
    navigateToPage('workouts')
    
    const workoutsBtn = document.querySelector('[data-page="workouts"]')
    const dashboardBtn = document.querySelector('[data-page="dashboard"]')
    
    expect(workoutsBtn?.getAttribute('aria-selected')).toBe('true')
    expect(dashboardBtn?.getAttribute('aria-selected')).toBe('false')
  })

  it('initNavigation привязывает click handlers', () => {
    initNavigation()
    
    const dashboardBtn = document.querySelector('[data-page="dashboard"]') as HTMLButtonElement
    dashboardBtn.click()
    
    const dashboardPage = document.getElementById('dashboard')
    expect(dashboardPage?.classList.contains('active')).toBe(true)
  })

  it('Escape key закрывает модалки', () => {
    initNavigation()
    
    const modalOverlay = document.querySelector('.modal-overlay')
    const modal = document.querySelector('.modal')
    
    expect(modalOverlay?.classList.contains('active')).toBe(true)
    expect(modal?.classList.contains('active')).toBe(true)
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)
    
    expect(modalOverlay?.classList.contains('active')).toBe(false)
    expect(modal?.classList.contains('active')).toBe(false)
  })

  it('modal overlay click закрывает модалки', () => {
    initNavigation()
    
    const modalOverlay = document.querySelector('.modal-overlay') as HTMLElement
    modalOverlay.click()
    
    expect(modalOverlay.classList.contains('active')).toBe(false)
  })

  it('закрытие модалок удаляет modal-open класс с body', () => {
    document.body.classList.add('modal-open')
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)
    
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })

  it('switchWorkoutSubTab импортирует workoutDiary для history', async () => {
    const { initWorkoutDiary } = await import('../../pages/workoutDiary.js')
    
    switchWorkoutSubTab('history')
    
    await vi.waitFor(() => {
      expect(initWorkoutDiary).toHaveBeenCalled()
    })
  })

  it('switchWorkoutSubTab импортирует activeWorkout для training', async () => {
    const { initActiveWorkout } = await import('../../pages/activeWorkout.js')
    
    switchWorkoutSubTab('training')
    
    await vi.waitFor(() => {
      expect(initActiveWorkout).toHaveBeenCalled()
    })
  })

  it('switchWorkoutSubTab импортирует analytics для analytics', async () => {
    const { initAnalytics } = await import('../../pages/analytics.js')
    
    switchWorkoutSubTab('analytics')
    
    await vi.waitFor(() => {
      expect(initAnalytics).toHaveBeenCalled()
    })
  })

  it('деактивирует все табы перед активацией нового', () => {
    const trainingTab = document.querySelector('[data-workout-tab="training"]')
    const historyTab = document.querySelector('[data-workout-tab="history"]')
    
    trainingTab?.classList.add('active')
    
    switchWorkoutSubTab('history')
    
    expect(trainingTab?.classList.contains('active')).toBe(false)
    expect(historyTab?.classList.contains('active')).toBe(true)
  })

  it('деактивирует все панели перед активацией новой', () => {
    const trainingPanel = document.getElementById('workout-tab-training')
    const historyPanel = document.getElementById('workout-tab-history')
    
    trainingPanel?.classList.add('active')
    
    switchWorkoutSubTab('history')
    
    expect(trainingPanel?.classList.contains('active')).toBe(false)
    expect(historyPanel?.classList.contains('active')).toBe(true)
  })

  it('navigateToPage закрывает открытые модалки', () => {
    const modalOverlay = document.querySelector('.modal-overlay')
    const modal = document.querySelector('.modal')
    
    navigateToPage('dashboard')
    
    expect(modalOverlay?.classList.contains('active')).toBe(false)
    expect(modal?.classList.contains('active')).toBe(false)
  })
})
