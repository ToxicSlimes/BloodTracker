function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active, .modal.active').forEach(m => m.classList.remove('active'))
    document.body.classList.remove('modal-open')
}

export function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals()
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active')
                b.setAttribute('aria-selected', 'false')
            })
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
            btn.classList.add('active')
            btn.setAttribute('aria-selected', 'true')
            const pageId = btn.dataset.page
            const page = document.getElementById(pageId)
            if (page) page.classList.add('active')
        })
    })

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))
            tab.classList.add('active')
            const tabContent = document.getElementById('tab-' + tab.dataset.tab)
            if (tabContent) tabContent.classList.add('active')
        })
    })

    // Global Escape key handler — close any open modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active, .modal.active')
            if (activeModal) {
                closeAllModals()
            }
        }
    })

    // Click on modal overlay backdrop (not the inner .modal content) closes the modal
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
            closeAllModals()
        }
    })
}
