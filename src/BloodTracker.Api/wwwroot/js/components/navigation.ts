import { state } from '../state.js'
import { mountReactPage, mountReactTab, isReactPage } from '../react/mountReactPages.js'

function closeAllModals(): void {
    document.querySelectorAll('.modal-overlay.active, .modal.active').forEach(m => m.classList.remove('active'))
    document.body.classList.remove('modal-open')
}

const hashToSubTab: Record<string, string> = {
    'active-workout': 'training',
    'workout-diary': 'history',
    'workouts': 'training'
}

let miniBarInterval: ReturnType<typeof setInterval> | null = null

function switchWorkoutSubTab(tabName: string): void {
    document.querySelectorAll('.workout-hub-tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.workout-hub-panel').forEach(p => p.classList.remove('active'))

    const btn = document.querySelector(`[data-workout-tab="${tabName}"]`)
    if (btn) btn.classList.add('active')

    const panel = document.getElementById(`workout-tab-${tabName}`)
    if (panel) panel.classList.add('active')

    if (tabName === 'history') {
        mountReactTab('workout-history-content')
    } else if (tabName === 'training') {
        mountReactTab('active-workout-content')
    } else if (tabName === 'programs') {
        mountReactTab('programs-content')
    } else if (tabName === 'analytics') {
        mountReactTab('analytics-content')
    }
}

function navigateToPage(pageId: string): void {
    closeAllModals()

    let actualPageId = pageId
    let subTab: string | null = null

    if (pageId === 'active-workout' || pageId === 'workout-diary') {
        actualPageId = 'workouts'
        subTab = hashToSubTab[pageId] || 'training'
    }

    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('active')
        b.setAttribute('aria-selected', 'false')
    })
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))

    const targetBtn = document.querySelector(`[data-page="${actualPageId}"]`)
    if (targetBtn) {
        targetBtn.classList.add('active')
        targetBtn.setAttribute('aria-selected', 'true')
    }

    const page = document.getElementById(actualPageId)
    if (page) {
        page.classList.add('active')

        // Mount React page if this page is owned by React
        if (isReactPage(actualPageId)) {
            mountReactPage(actualPageId)
        }

        if (actualPageId === 'workouts') {
            switchWorkoutSubTab(subTab || 'training')
        }
    }

    // Mini-bar: show when navigating away from workout training tab while session active
    const isOnWorkoutTraining = actualPageId === 'workouts' && (subTab === 'training' || pageId === 'active-workout')
    updateMiniBarVisibility(!isOnWorkoutTraining)
}

function updateMiniBarVisibility(showIfActive: boolean): void {
    const miniBar = document.getElementById('workout-mini-bar')
    if (!miniBar) return

    const session = state.activeWorkoutSession
    if (session && showIfActive) {
        miniBar.classList.add('active')
        updateMiniBar()
        if (!miniBarInterval) {
            miniBarInterval = setInterval(updateMiniBar, 1000)
        }
    } else {
        miniBar.classList.remove('active')
        if (miniBarInterval) {
            clearInterval(miniBarInterval)
            miniBarInterval = null
        }
    }
}

function updateMiniBar(): void {
    const session = state.activeWorkoutSession
    if (!session) return

    const titleEl = document.getElementById('mini-bar-title')
    const statsEl = document.getElementById('mini-bar-stats')
    if (!titleEl || !statsEl) return

    titleEl.textContent = session.title

    const start = new Date(session.startedAt).getTime()
    const elapsed = Math.floor((Date.now() - start) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    const totalSets = session.exercises.reduce((sum: number, ex: any) => sum + ex.sets.length, 0)
    const completedSets = session.exercises.reduce((sum: number, ex: any) =>
        sum + ex.sets.filter((s: any) => s.completedAt).length, 0)

    statsEl.textContent = `${timeStr} · ${completedSets}/${totalSets} подходов`
}

export function hideMiniBar(): void {
    const miniBar = document.getElementById('workout-mini-bar')
    if (miniBar) miniBar.classList.remove('active')
    if (miniBarInterval) {
        clearInterval(miniBarInterval)
        miniBarInterval = null
    }
}

export function initNavigation(): void {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = (btn as HTMLElement).dataset.page!
            navigateToPage(pageId)
            window.location.hash = ''
        })
    })

    document.getElementById('mini-bar-return')?.addEventListener('click', () => {
        navigateToPage('active-workout')
    })

    document.querySelectorAll('.workout-hub-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = (btn as HTMLElement).dataset.workoutTab!
            switchWorkoutSubTab(tabName)
        })
    })

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1)
        if (hash) {
            navigateToPage(hash)
        }
    })

    if (window.location.hash) {
        const hash = window.location.hash.slice(1)
        if (hash) {
            navigateToPage(hash)
        }
    }

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))
            tab.classList.add('active')
            const tabContent = document.getElementById('tab-' + (tab as HTMLElement).dataset.tab)
            if (tabContent) tabContent.classList.add('active')
        })
    })

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active, .modal.active')
            if (activeModal) {
                closeAllModals()
            }
        }
    })

    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('modal-overlay') && target.classList.contains('active')) {
            closeAllModals()
        }
    })
}

export { navigateToPage, switchWorkoutSubTab }
