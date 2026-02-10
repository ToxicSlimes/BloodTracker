export function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
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
}
