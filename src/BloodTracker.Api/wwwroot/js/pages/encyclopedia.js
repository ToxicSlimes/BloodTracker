import { state } from '../state.js'
import { catalogApi } from '../api.js'
import { escapeHtml } from '../utils.js'
import { toast } from '../components/toast.js'

// ═══════════════════════════════════════════════════════════════════════════════
// ENCYCLOPEDIA PAGE — Drug catalog browser with categories, search, details
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_NAMES = {
    0: 'ААС', 1: 'Пептиды', 2: 'SARMs', 3: 'ПКТ', 4: 'Жиросжигатели',
    5: 'Гормон роста', 6: 'Антиэстрогены', 7: 'Инсулин', 8: 'Прогормоны',
    9: 'Агонисты дофамина', 10: 'Другое'
}

const CATEGORY_BADGE_CLASS = {
    0: 'cat-badge-aas', 1: 'cat-badge-peptide', 2: 'cat-badge-sarm', 3: 'cat-badge-pct',
    4: 'cat-badge-fatburner', 5: 'cat-badge-growthhormone', 6: 'cat-badge-antiestrogen',
    7: 'cat-badge-insulin', 8: 'cat-badge-prohormone', 9: 'cat-badge-dopamineagonist', 10: 'cat-badge-other'
}

const TYPE_NAMES = { 0: 'Oral', 1: 'Injectable', 2: 'Subcutaneous', 3: 'Transdermal', 4: 'Nasal' }
const TYPE_BADGE_CLASS = { 0: 'type-badge-oral', 1: 'type-badge-injectable', 2: 'type-badge-subcutaneous', 3: 'type-badge-transdermal', 4: 'type-badge-nasal' }

let activeCategory = 'all'
let activeMfrType = 'all'
let searchQuery = ''

async function ensureData() {
    if (state.catalogLoaded) return
    try {
        const [substances, mfrs] = await Promise.all([
            catalogApi.substances(),
            catalogApi.manufacturers()
        ])
        state.drugCatalog = substances
        state.manufacturers = mfrs
        state.catalogLoaded = true
    } catch (e) {
        console.error('Failed to load catalog:', e)
        toast.error('Ошибка загрузки каталога')
    }
}

export async function initEncyclopedia() {
    await ensureData()
    renderCategoryTabs()
    renderSubstanceGrid()
    renderMfrGrid()
    bindEvents()
}

function renderCategoryTabs() {
    const container = document.getElementById('encyclopedia-tabs')
    if (!container) return

    let html = `<button class="encyclopedia-tab active" data-cat="all">ВСЕ</button>`
    for (const [val, name] of Object.entries(CATEGORY_NAMES)) {
        const count = state.drugCatalog.filter(s => s.category === parseInt(val)).length
        if (count > 0) {
            html += `<button class="encyclopedia-tab" data-cat="${val}">${name} (${count})</button>`
        }
    }
    container.innerHTML = html
}

// ─── Rating bar helpers ───

function renderRatingBar(value, max, color) {
    const pct = Math.min((value / max) * 100, 100)
    return `<div class="rating-bar"><div class="rating-bar-fill" style="width:${pct}%;background:${color}"></div></div>`
}

function renderRatingsBlock(s) {
    if (!s.anabolicRating && !s.androgenicRating) return ''
    const anabolic = s.anabolicRating || 0
    const androgenic = s.androgenicRating || 0
    // Scale: max is the bigger of both values or 500 (whichever is larger), clamped to show bars meaningfully
    const scaleMax = Math.max(anabolic, androgenic, 500)

    return `<div class="encyclopedia-ratings">
        <div class="encyclopedia-detail-label">АНАБОЛИЧЕСКИЙ / АНДРОГЕННЫЙ РЕЙТИНГ</div>
        <div class="rating-row">
            <span class="rating-label">АНАБОЛИЧЕСКИЙ</span>
            ${renderRatingBar(anabolic, scaleMax, '#4caf50')}
            <span class="rating-value rating-value-anabolic">${anabolic}%</span>
        </div>
        <div class="rating-row">
            <span class="rating-label">АНДРОГЕННЫЙ</span>
            ${renderRatingBar(androgenic, scaleMax, '#f44336')}
            <span class="rating-value rating-value-androgenic">${androgenic}%</span>
        </div>
        <div class="rating-reference">Тестостерон = 100/100 (Hershberger assay, Vida 1969)</div>
    </div>`
}

// ─── PubMed link helper ───

function renderPubMedLink(s) {
    if (!s.pubMedSearchTerm) return ''
    const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(s.pubMedSearchTerm)}`
    const safetyUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(s.pubMedSearchTerm + '+AND+(adverse+effects[MeSH]+OR+toxicity[MeSH])')}`
    const pharmacologyUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(s.pubMedSearchTerm + '+AND+(pharmacology[MeSH]+OR+pharmacokinetics[MeSH])')}`

    return `<div class="encyclopedia-pubmed">
        <div class="encyclopedia-detail-label">ИССЛЕДОВАНИЯ (PUBMED)</div>
        <div class="pubmed-links">
            <a href="${url}" target="_blank" rel="noopener" class="pubmed-link" onclick="event.stopPropagation()">[ ВСЕ ИССЛЕДОВАНИЯ ]</a>
            <a href="${pharmacologyUrl}" target="_blank" rel="noopener" class="pubmed-link" onclick="event.stopPropagation()">[ ФАРМАКОЛОГИЯ ]</a>
            <a href="${safetyUrl}" target="_blank" rel="noopener" class="pubmed-link pubmed-link-safety" onclick="event.stopPropagation()">[ ПОБОЧНЫЕ ЭФФЕКТЫ ]</a>
        </div>
    </div>`
}

// ─── Similar substances ───

function renderSimilarSubstances(s) {
    const similar = state.drugCatalog.filter(other =>
        other.id !== s.id &&
        other.subcategory === s.subcategory &&
        other.category === s.category
    ).slice(0, 4)

    if (similar.length === 0) return ''

    return `<div class="encyclopedia-similar">
        <div class="encyclopedia-detail-label">ПОХОЖИЕ ПРЕПАРАТЫ</div>
        <div class="similar-list">${similar.map(sim =>
            `<span class="similar-item" data-nav-id="${escapeHtml(sim.id)}" onclick="event.stopPropagation(); document.querySelector('.encyclopedia-card[data-id=&quot;${escapeHtml(sim.id)}&quot;]')?.scrollIntoView({behavior:'smooth',block:'center'}); document.querySelector('.encyclopedia-card[data-id=&quot;${escapeHtml(sim.id)}&quot;]')?.classList.add('expanded')">${escapeHtml(sim.name)}</span>`
        ).join('')}</div>
    </div>`
}

function renderSubstanceGrid() {
    const container = document.getElementById('encyclopedia-grid')
    if (!container) return

    let items = state.drugCatalog
    if (activeCategory !== 'all') {
        items = items.filter(s => s.category === parseInt(activeCategory))
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase()
        items = items.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
            (s.activeSubstance && s.activeSubstance.toLowerCase().includes(q)) ||
            (s.description && s.description.toLowerCase().includes(q)) ||
            (s.effects && s.effects.toLowerCase().includes(q))
        )
    }

    // Sort: popular first
    items.sort((a, b) => {
        if (a.isPopular && !b.isPopular) return -1
        if (!a.isPopular && b.isPopular) return 1
        return a.sortOrder - b.sortOrder
    })

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Ничего не найдено</p></div>'
        return
    }

    container.innerHTML = items.map(s => {
        const catBadgeClass = CATEGORY_BADGE_CLASS[s.category] || ''
        const catName = CATEGORY_NAMES[s.category] || 'Другое'
        const typeName = TYPE_NAMES[s.drugType] || ''
        const typeBadgeClass = TYPE_BADGE_CLASS[s.drugType] || ''

        // Compact rating badge for card header (AAS only)
        const ratingBadge = (s.anabolicRating && s.androgenicRating)
            ? `<span class="encyclopedia-badge rating-badge">${s.anabolicRating}/${s.androgenicRating}</span>`
            : ''

        return `<div class="encyclopedia-card" data-id="${escapeHtml(s.id)}">
            <div class="encyclopedia-card-header">
                <div>
                    <div class="encyclopedia-card-name">${escapeHtml(s.name)}</div>
                    ${s.nameEn ? `<div class="encyclopedia-card-name-en">${escapeHtml(s.nameEn)}</div>` : ''}
                </div>
                <div class="encyclopedia-card-badges">
                    ${s.isPopular ? '<span class="encyclopedia-badge encyclopedia-badge-popular">★</span>' : ''}
                    ${ratingBadge}
                    <span class="encyclopedia-badge ${catBadgeClass}">${catName}</span>
                    <span class="encyclopedia-badge ${typeBadgeClass}">${typeName}</span>
                </div>
            </div>
            ${s.description ? `<div class="encyclopedia-card-desc">${escapeHtml(s.description)}</div>` : ''}
            <div class="encyclopedia-card-detail">
                ${renderRatingsBlock(s)}
                ${s.effects ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ЭФФЕКТЫ</div><div class="encyclopedia-detail-value">${escapeHtml(s.effects)}</div></div>` : ''}
                ${s.sideEffects ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ПОБОЧНЫЕ ЭФФЕКТЫ</div><div class="encyclopedia-detail-value">${escapeHtml(s.sideEffects)}</div></div>` : ''}
                ${s.halfLife ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ПЕРИОД ПОЛУРАСПАДА</div><div class="encyclopedia-detail-value">${escapeHtml(s.halfLife)}</div></div>` : ''}
                ${s.detectionTime ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ВРЕМЯ ОБНАРУЖЕНИЯ</div><div class="encyclopedia-detail-value">${escapeHtml(s.detectionTime)}</div></div>` : ''}
                ${s.commonDosages ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ТИПИЧНЫЕ ДОЗИРОВКИ</div><div class="encyclopedia-detail-value">${escapeHtml(s.commonDosages)}</div></div>` : ''}
                ${s.activeSubstance ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ДЕЙСТВУЮЩЕЕ ВЕЩЕСТВО</div><div class="encyclopedia-detail-value">${escapeHtml(s.activeSubstance)}</div></div>` : ''}
                ${s.notes ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ПРИМЕЧАНИЯ</div><div class="encyclopedia-detail-value" style="color:#ffb74d">${escapeHtml(s.notes)}</div></div>` : ''}
                ${renderPubMedLink(s)}
                ${renderSimilarSubstances(s)}
            </div>
        </div>`
    }).join('')
}

function renderMfrGrid() {
    const container = document.getElementById('mfr-grid')
    if (!container) return

    let mfrs = state.manufacturers
    if (activeMfrType !== 'all') {
        mfrs = mfrs.filter(m => m.type === parseInt(activeMfrType))
    }

    container.innerHTML = mfrs.map(m => {
        const typeClass = m.type === 0 ? 'mfr-type-pharma' : 'mfr-type-ugl'
        const typeLabel = m.type === 0 ? 'PHARMA' : 'UGL'
        return `<div class="mfr-card">
            <div class="mfr-card-header">
                <span class="mfr-card-name">${escapeHtml(m.name)}</span>
                <div style="display:flex;gap:6px;align-items:center;">
                    <span class="mfr-card-country">${escapeHtml(m.country)}</span>
                    <span class="encyclopedia-badge ${typeClass}">${typeLabel}</span>
                </div>
            </div>
            ${m.description ? `<div class="mfr-card-desc">${escapeHtml(m.description)}</div>` : ''}
        </div>`
    }).join('')
}

function bindEvents() {
    // Category tabs
    const tabsContainer = document.getElementById('encyclopedia-tabs')
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.encyclopedia-tab')
            if (!tab) return
            tabsContainer.querySelectorAll('.encyclopedia-tab').forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            activeCategory = tab.dataset.cat
            renderSubstanceGrid()
        })
    }

    // Search
    const searchEl = document.getElementById('encyclopedia-search')
    if (searchEl) {
        let timer
        searchEl.addEventListener('input', () => {
            clearTimeout(timer)
            timer = setTimeout(() => {
                searchQuery = searchEl.value
                renderSubstanceGrid()
            }, 200)
        })
    }

    // Card expand/collapse
    const grid = document.getElementById('encyclopedia-grid')
    if (grid) {
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.encyclopedia-card')
            if (!card) return
            card.classList.toggle('expanded')
        })
    }

    // Manufacturer type tabs
    const mfrTabs = document.getElementById('mfr-tabs')
    if (mfrTabs) {
        mfrTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.encyclopedia-tab')
            if (!tab) return
            mfrTabs.querySelectorAll('.encyclopedia-tab').forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            activeMfrType = tab.dataset.mfrType
            renderMfrGrid()
        })
    }
}

window.initEncyclopedia = initEncyclopedia
