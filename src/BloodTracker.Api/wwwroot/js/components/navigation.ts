function closeAllModals(): void {
    document.querySelectorAll('.modal-overlay.active, .modal.active').forEach(m => m.classList.remove('active'))
    document.body.classList.remove('modal-open')
}

const hashToSubTab: Record<string, string> = {
    'active-workout': 'training',
    'workout-diary': 'history',
    'workouts': 'training'
}

function switchWorkoutSubTab(tabName: string): void {
    document.querySelectorAll('.workout-hub-tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.workout-hub-panel').forEach(p => p.classList.remove('active'))

    const btn = document.querySelector(`[data-workout-tab="${tabName}"]`)
    if (btn) btn.classList.add('active')

    const panel = document.getElementById(`workout-tab-${tabName}`)
    if (panel) panel.classList.add('active')

    if (tabName === 'history') {
        import('../pages/workoutDiary.js').then(m => m.initWorkoutDiary())
    } else if (tabName === 'training') {
        import('../pages/activeWorkout.js').then(m => m.initActiveWorkout())
    } else if (tabName === 'analytics') {
        import('../pages/analytics.js').then(m => m.initAnalytics())
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

        if (actualPageId === 'workouts') {
            switchWorkoutSubTab(subTab || 'training')
        }
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
