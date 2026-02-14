/**
 * Закрывает все активные модальные окна на странице.
 * Убирает класс 'active' у overlay и модалок, снимает блокировку скролла.
 */
function closeAllModals(): void {
    document.querySelectorAll('.modal-overlay.active, .modal.active').forEach(m => m.classList.remove('active'))
    document.body.classList.remove('modal-open')
}

function navigateToPage(pageId: string): void {
    closeAllModals()
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('active')
        b.setAttribute('aria-selected', 'false')
    })
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    
    const targetBtn = document.querySelector(`[data-page="${pageId}"]`)
    if (targetBtn) {
        targetBtn.classList.add('active')
        targetBtn.setAttribute('aria-selected', 'true')
    }
    
    const page = document.getElementById(pageId)
    if (page) {
        page.classList.add('active')
        
        if (pageId === 'workout-diary') {
            import('../pages/workoutDiary.js').then(m => m.initWorkoutDiary())
        } else if (pageId === 'active-workout') {
            import('../pages/activeWorkout.js').then(m => m.initActiveWorkout())
        }
    }
}

/**
 * Инициализирует навигацию приложения: переключение страниц, табов,
 * обработку Escape для закрытия модалок и клик по backdrop.
 * Вызывается один раз при загрузке приложения.
 */
export function initNavigation(): void {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = (btn as HTMLElement).dataset.page!
            navigateToPage(pageId)
            window.location.hash = ''
        })
    })

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1)
        if (hash && document.getElementById(hash)) {
            navigateToPage(hash)
        }
    })

    if (window.location.hash) {
        const hash = window.location.hash.slice(1)
        if (document.getElementById(hash)) {
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

    // Global Escape key handler — close any open modal
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active, .modal.active')
            if (activeModal) {
                closeAllModals()
            }
        }
    })

    // Click on modal overlay backdrop (not the inner .modal content) closes the modal
    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('modal-overlay') && target.classList.contains('active')) {
            closeAllModals()
        }
    })
}
