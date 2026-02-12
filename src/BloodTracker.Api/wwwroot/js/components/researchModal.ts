import { escapeHtml } from '../utils.js'
import type { DrugCatalogItem, ResearchData, StudyReference, BloodworkMarker, DrugInteraction } from '../types/index.js'

// ═══════════════════════════════════════════════════════════════════════════════
// RESEARCH MODAL — Модалка научных данных по субстанции
// ═══════════════════════════════════════════════════════════════════════════════

let currentTab = 'mechanism'
let currentResearch: ResearchData | null = null

/**
 * Открывает модалку исследований для указанной субстанции.
 */
export function openResearchModal(substance: DrugCatalogItem): void {
    const overlay = document.getElementById('research-modal-overlay')
    const titleEl = document.getElementById('research-modal-title')
    if (!overlay || !titleEl) return

    currentResearch = substance.research || null
    currentTab = 'mechanism'

    titleEl.textContent = `📚 ${substance.name}`

    if (!currentResearch) {
        renderNoData()
    } else {
        renderTabs()
        renderTab('mechanism')
    }

    overlay.classList.add('active')
    document.body.classList.add('modal-open')
}

/**
 * Закрывает модалку исследований.
 */
export function closeResearchModal(): void {
    const overlay = document.getElementById('research-modal-overlay')
    if (!overlay) return
    overlay.classList.remove('active')
    document.body.classList.remove('modal-open')
    currentResearch = null
}

/**
 * Инициализирует обработчики событий модалки.
 */
export function initResearchModal(): void {
    const closeBtn = document.getElementById('research-modal-close')
    const overlay = document.getElementById('research-modal-overlay')
    const tabs = document.getElementById('research-tabs')

    if (closeBtn) closeBtn.addEventListener('click', closeResearchModal)
    if (overlay) overlay.addEventListener('click', (e: MouseEvent) => {
        if (e.target === overlay) closeResearchModal()
    })

    if (tabs) tabs.addEventListener('click', (e: MouseEvent) => {
        const tab = (e.target as HTMLElement).closest('.research-tab') as HTMLElement | null
        if (!tab || !tab.dataset.tab) return
        tabs.querySelectorAll('.research-tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        currentTab = tab.dataset.tab
        renderTab(currentTab)
    })

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeResearchModal()
    })
}

function renderTabs(): void {
    const tabs = document.getElementById('research-tabs')
    if (!tabs) return
    tabs.querySelectorAll('.research-tab').forEach(t => {
        t.classList.remove('active')
        if ((t as HTMLElement).dataset.tab === 'mechanism') t.classList.add('active')
    })
}

function renderNoData(): void {
    const content = document.getElementById('research-content')
    if (!content) return
    content.innerHTML = '<div class="research-no-data">Научные данные для этого вещества ещё не добавлены.<br>Используйте PubMed ссылки в карточке для самостоятельного изучения.</div>'
}

function renderTab(tab: string): void {
    const content = document.getElementById('research-content')
    if (!content || !currentResearch) return

    switch (tab) {
        case 'mechanism': content.innerHTML = renderMechanism(currentResearch); break
        case 'studies': content.innerHTML = renderStudies(currentResearch); break
        case 'bloodwork': content.innerHTML = renderBloodwork(currentResearch); break
        case 'interactions': content.innerHTML = renderInteractions(currentResearch); break
        case 'contra': content.innerHTML = renderContraindications(currentResearch); break
        case 'practical': content.innerHTML = renderPractical(currentResearch); break
    }
}

function renderMechanism(r: ResearchData): string {
    if (!r.mechanism) return '<div class="research-no-data">Механизм действия не задокументирован</div>'
    return `<div class="research-mechanism">${escapeHtml(r.mechanism)}</div>`
}

function renderStudies(r: ResearchData): string {
    if (!r.studies?.length) return '<div class="research-no-data">Исследования не добавлены</div>'
    return r.studies.map((s: StudyReference) => {
        const pmidLink = s.pmid
            ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/" target="_blank" rel="noopener">PMID: ${s.pmid}</a>`
            : ''
        return `<div class="research-study">
            <div class="research-study-citation">${escapeHtml(s.citation)} ${pmidLink}</div>
            ${s.design ? `<div class="research-study-design">${escapeHtml(s.design)}</div>` : ''}
            <div class="research-study-finding">${escapeHtml(s.finding)}</div>
        </div>`
    }).join('')
}

function renderBloodwork(r: ResearchData): string {
    if (!r.bloodwork?.length) return '<div class="research-no-data">Маркеры крови не добавлены</div>'
    return r.bloodwork.map((m: BloodworkMarker) =>
        `<div class="research-marker">
            <span class="research-marker-name">${escapeHtml(m.name)}</span>
            <span class="research-marker-freq">${m.frequency ? escapeHtml(m.frequency) : '—'}</span>
            <span class="research-marker-why">${m.why ? escapeHtml(m.why) : ''}</span>
        </div>`
    ).join('')
}

function renderInteractions(r: ResearchData): string {
    if (!r.interactions?.length) return '<div class="research-no-data">Взаимодействия не задокументированы</div>'
    return r.interactions.map((i: DrugInteraction) =>
        `<div class="research-interaction">
            <span class="research-interaction-severity ${i.severity || 'info'}">${severityLabel(i.severity)}</span>
            <span class="research-interaction-drug">${escapeHtml(i.drug)}</span>
            <span class="research-interaction-effect">${escapeHtml(i.effect)}</span>
        </div>`
    ).join('')
}

function severityLabel(s: string): string {
    switch (s) {
        case 'danger': return '⛔ ОПАСНО'
        case 'warning': return '⚠ ВНИМАНИЕ'
        default: return 'ℹ ИНФО'
    }
}

function renderContraindications(r: ResearchData): string {
    if (!r.contraindications) return '<div class="research-no-data">Противопоказания не задокументированы</div>'
    const c = r.contraindications
    let html = ''
    if (c.absolute?.length) {
        html += `<div class="research-contra-section">
            <div class="research-contra-label">АБСОЛЮТНЫЕ ПРОТИВОПОКАЗАНИЯ</div>
            <ul class="research-contra-list">${c.absolute.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
        </div>`
    }
    if (c.relative?.length) {
        html += `<div class="research-contra-section">
            <div class="research-contra-label relative">ОТНОСИТЕЛЬНЫЕ (С ОСТОРОЖНОСТЬЮ)</div>
            <ul class="research-contra-list relative">${c.relative.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
        </div>`
    }
    return html || '<div class="research-no-data">Противопоказания не задокументированы</div>'
}

function renderPractical(r: ResearchData): string {
    if (!r.practicalNotes) return '<div class="research-no-data">Практические заметки не добавлены</div>'
    return `<div class="research-practical">${escapeHtml(r.practicalNotes)}</div>`
}
