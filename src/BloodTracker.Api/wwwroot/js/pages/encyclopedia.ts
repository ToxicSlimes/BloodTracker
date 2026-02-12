import { state } from '../state.js'
import { catalogApi } from '../api.js'
import { escapeHtml } from '../utils.js'
import { toast } from '../components/toast.js'
import { openResearchModal, initResearchModal } from '../components/researchModal.js'
import type { DrugCatalogItem, Manufacturer } from '../types/index.js'

// ═══════════════════════════════════════════════════════════════════════════════
// ENCYCLOPEDIA PAGE — Drug catalog browser with categories, search, details
// ═══════════════════════════════════════════════════════════════════════════════

/** Маппинг числовых категорий на русские названия для UI */
const CATEGORY_NAMES: Record<number, string> = {
    0: 'ААС', 1: 'Пептиды', 2: 'SARMs', 3: 'ПКТ', 4: 'Жиросжигатели',
    5: 'Гормон роста', 6: 'Антиэстрогены', 7: 'Инсулин', 8: 'Прогормоны',
    9: 'Агонисты дофамина', 10: 'Другое'
}

/** Маппинг категорий на CSS-классы badge */
const CATEGORY_BADGE_CLASS: Record<number, string> = {
    0: 'cat-badge-aas', 1: 'cat-badge-peptide', 2: 'cat-badge-sarm', 3: 'cat-badge-pct',
    4: 'cat-badge-fatburner', 5: 'cat-badge-growthhormone', 6: 'cat-badge-antiestrogen',
    7: 'cat-badge-insulin', 8: 'cat-badge-prohormone', 9: 'cat-badge-dopamineagonist', 10: 'cat-badge-other'
}

/** Маппинг числовых типов препаратов на названия */
const TYPE_NAMES: Record<number, string> = { 0: 'Oral', 1: 'Injectable', 2: 'Subcutaneous', 3: 'Transdermal', 4: 'Nasal' }

/** Маппинг типов препаратов на CSS-классы badge */
const TYPE_BADGE_CLASS: Record<number, string> = { 0: 'type-badge-oral', 1: 'type-badge-injectable', 2: 'type-badge-subcutaneous', 3: 'type-badge-transdermal', 4: 'type-badge-nasal' }

/** Текущая активная категория фильтра ('all' или числовой ID) */
let activeCategory: string = 'all'

/** Текущий фильтр типа производителя ('all', '0' pharma, '1' UGL) */
let activeMfrType: string = 'all'

/** Текущий поисковый запрос */
let searchQuery: string = ''

/**
 * Загружает данные каталога (субстанции + производители) при первом вызове.
 * Кэширует в state.catalogLoaded.
 * @returns {Promise<void>}
 */
async function ensureData(): Promise<void> {
    if (state.catalogLoaded) return
    try {
        const [substances, mfrs] = await Promise.all([
            catalogApi.substances(),
            catalogApi.manufacturers()
        ]) as [DrugCatalogItem[], Manufacturer[]]
        state.drugCatalog = substances
        state.manufacturers = mfrs
        state.catalogLoaded = true
    } catch (e) {
        console.error('Failed to load catalog:', e)
        toast.error('Ошибка загрузки каталога')
    }
}

/**
 * Инициализирует страницу энциклопедии: загружает данные, рендерит табы, грид и привязывает события.
 * @returns {Promise<void>}
 */
export async function initEncyclopedia(): Promise<void> {
    await ensureData()
    renderCategoryTabs()
    renderSubstanceGrid()
    renderMfrGrid()
    bindEvents()
    initResearchModal()
}

/**
 * Рендерит табы категорий субстанций (ААС, Пептиды и т.д.) с количеством в каждой.
 */
function renderCategoryTabs(): void {
    const container = document.getElementById('encyclopedia-tabs') as HTMLElement | null
    if (!container) return

    let html = `<button class="encyclopedia-tab active" data-cat="all">ВСЕ</button>`
    for (const [val, name] of Object.entries(CATEGORY_NAMES)) {
        const count = state.drugCatalog.filter((s: any) => s.category === parseInt(val)).length
        if (count > 0) {
            html += `<button class="encyclopedia-tab" data-cat="${val}">${name} (${count})</button>`
        }
    }
    container.innerHTML = html
}

// ─── Rating bar helpers ───

/**
 * Генерирует HTML рейтинг-бара (прогресс-бар).
 * @param {number} value — текущее значение
 * @param {number} max — максимальное значение шкалы
 * @param {string} color — CSS-цвет заполнения
 * @returns {string} HTML рейтинг-бара
 */
function renderRatingBar(value: number, max: number, color: string): string {
    const pct = Math.min((value / max) * 100, 100)
    return `<div class="rating-bar"><div class="rating-bar-fill" style="width:${pct}%;background:${color}"></div></div>`
}

/**
 * Рендерит блок анаболического/андрогенного рейтинга субстанции.
 * Показывает два горизонтальных бара с процентами и референс на тестостерон.
 * @param {Object} s — объект субстанции из каталога
 * @returns {string} HTML-блок рейтингов или пустая строка
 */
function renderRatingsBlock(s: any): string {
    if (!s.pharmacology?.anabolicRating && !s.pharmacology?.androgenicRating) return ''
    const anabolic = s.pharmacology?.anabolicRating || 0
    const androgenic = s.pharmacology?.androgenicRating || 0
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

/**
 * Генерирует блок ссылок на PubMed исследования по субстанции.
 * Включает ссылки: все исследования, фармакология, побочные эффекты.
 * @param {Object} s — объект субстанции
 * @returns {string} HTML-блок ссылок или пустая строка
 */
function renderPubMedLink(s: any): string {
    if (!s.meta?.pubMedSearchTerm) return ''
    const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(s.meta.pubMedSearchTerm)}`
    const safetyUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(s.meta.pubMedSearchTerm + '+AND+(adverse+effects[MeSH]+OR+toxicity[MeSH])')}`
    const pharmacologyUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(s.meta.pubMedSearchTerm + '+AND+(pharmacology[MeSH]+OR+pharmacokinetics[MeSH])')}`

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

/**
 * Рендерит блок похожих субстанций (та же подкатегория и категория).
 * Максимум 4 похожих, кликабельные для навигации к карточке.
 * @param {Object} s — объект субстанции
 * @returns {string} HTML-блок похожих или пустая строка
 */
function renderSimilarSubstances(s: any): string {
    const similar = state.drugCatalog.filter((other: any) =>
        other.id !== s.id &&
        other.subcategory === s.subcategory &&
        other.category === s.category
    ).slice(0, 4)

    if (similar.length === 0) return ''

    return `<div class="encyclopedia-similar">
        <div class="encyclopedia-detail-label">ПОХОЖИЕ ПРЕПАРАТЫ</div>
        <div class="similar-list">${similar.map((sim: any) =>
            `<span class="similar-item" data-nav-id="${escapeHtml(sim.id)}" onclick="event.stopPropagation(); document.querySelector('.encyclopedia-card[data-id=&quot;${escapeHtml(sim.id)}&quot;]')?.scrollIntoView({behavior:'smooth',block:'center'}); document.querySelector('.encyclopedia-card[data-id=&quot;${escapeHtml(sim.id)}&quot;]')?.classList.add('expanded')">${escapeHtml(sim.name)}</span>`
        ).join('')}</div>
    </div>`
}

/**
 * Рендерит грид карточек субстанций с фильтрацией по категории и поиску.
 * Сортирует: популярные первыми, затем по sortOrder.
 */
export function renderSubstanceGrid(): void {
    const container = document.getElementById('encyclopedia-grid') as HTMLElement | null
    if (!container) return

    let items = state.drugCatalog as any[]
    if (activeCategory !== 'all') {
        items = items.filter((s: any) => s.category === parseInt(activeCategory))
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase()
        items = items.filter((s: any) =>
            s.name.toLowerCase().includes(q) ||
            (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
            (s.activeSubstance && s.activeSubstance.toLowerCase().includes(q)) ||
            (s.description?.text && s.description.text.toLowerCase().includes(q)) ||
            (s.description?.effects && s.description.effects.toLowerCase().includes(q))
        )
    }

    // Sort: popular first
    items.sort((a: any, b: any) => {
        if (a.meta?.isPopular && !b.meta?.isPopular) return -1
        if (!a.meta?.isPopular && b.meta?.isPopular) return 1
        return (a.meta?.sortOrder || 0) - (b.meta?.sortOrder || 0)
    })

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Ничего не найдено</p></div>'
        return
    }

    // ── Карточка субстанции (раскрываемая) ──────────────────────────
    // Header: [Название RU] [Название EN] | Badges: [★ популярный] [Рейтинг A/A] [Категория] [Тип]
    // Body (collapsed): [Описание]
    // Detail (expanded): [Рейтинги] [Эффекты] [Побочки] [Период полураспада]
    //   [Время обнаружения] [Дозировки] [Действующее вещество] [Примечания]
    //   [PubMed ссылки] [Похожие препараты]
    container.innerHTML = items.map((s: any) => {
        const catBadgeClass = CATEGORY_BADGE_CLASS[s.category] || ''
        const catName = CATEGORY_NAMES[s.category] || 'Другое'
        const typeName = TYPE_NAMES[s.drugType] || ''
        const typeBadgeClass = TYPE_BADGE_CLASS[s.drugType] || ''

        // Compact rating badge for card header (AAS only)
        const ratingBadge = (s.pharmacology?.anabolicRating && s.pharmacology?.androgenicRating)
            ? `<span class="encyclopedia-badge rating-badge">${s.pharmacology.anabolicRating}/${s.pharmacology.androgenicRating}</span>`
            : ''

        return `<div class="encyclopedia-card" data-id="${escapeHtml(s.id)}">
            <div class="encyclopedia-card-header">
                <div>
                    <div class="encyclopedia-card-name">${escapeHtml(s.name)}</div>
                    ${s.nameEn ? `<div class="encyclopedia-card-name-en">${escapeHtml(s.nameEn)}</div>` : ''}
                </div>
                <div class="encyclopedia-card-badges">
                    ${s.meta?.isPopular ? '<span class="encyclopedia-badge encyclopedia-badge-popular">★</span>' : ''}
                    ${ratingBadge}
                    <span class="encyclopedia-badge ${catBadgeClass}">${catName}</span>
                    <span class="encyclopedia-badge ${typeBadgeClass}">${typeName}</span>
                </div>
            </div>
            ${s.description?.text ? `<div class="encyclopedia-card-desc">${escapeHtml(s.description.text)}</div>` : ''}
            <div class="encyclopedia-card-detail">
                ${renderRatingsBlock(s)}
                ${s.description?.effects ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ЭФФЕКТЫ</div><div class="encyclopedia-detail-value">${escapeHtml(s.description.effects)}</div></div>` : ''}
                ${s.description?.sideEffects ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ПОБОЧНЫЕ ЭФФЕКТЫ</div><div class="encyclopedia-detail-value">${escapeHtml(s.description.sideEffects)}</div></div>` : ''}
                ${s.pharmacology?.halfLife ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ПЕРИОД ПОЛУРАСПАДА</div><div class="encyclopedia-detail-value">${escapeHtml(s.pharmacology.halfLife)}</div></div>` : ''}
                ${s.pharmacology?.detectionTime ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ВРЕМЯ ОБНАРУЖЕНИЯ</div><div class="encyclopedia-detail-value">${escapeHtml(s.pharmacology.detectionTime)}</div></div>` : ''}
                ${s.pharmacology?.commonDosages ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ТИПИЧНЫЕ ДОЗИРОВКИ</div><div class="encyclopedia-detail-value">${escapeHtml(s.pharmacology.commonDosages)}</div></div>` : ''}
                ${s.activeSubstance ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ДЕЙСТВУЮЩЕЕ ВЕЩЕСТВО</div><div class="encyclopedia-detail-value">${escapeHtml(s.activeSubstance)}</div></div>` : ''}
                ${s.notes ? `<div class="encyclopedia-detail-row"><div class="encyclopedia-detail-label">ПРИМЕЧАНИЯ</div><div class="encyclopedia-detail-value" style="color:#ffb74d">${escapeHtml(s.notes)}</div></div>` : ''}
                ${renderPubMedLink(s)}
                ${renderSimilarSubstances(s)}
                ${s.research ? `<button class="encyclopedia-research-btn" data-research-id="${escapeHtml(s.id)}">📚 ИССЛЕДОВАНИЯ</button>` : ''}
            </div>
        </div>`
    }).join('')
}

/**
 * Рендерит грид карточек производителей с фильтрацией по типу (pharma/UGL).
 */
export function renderMfrGrid(): void {
    const container = document.getElementById('mfr-grid') as HTMLElement | null
    if (!container) return

    let mfrs = state.manufacturers as any[]
    if (activeMfrType !== 'all') {
        mfrs = mfrs.filter((m: any) => m.type === parseInt(activeMfrType))
    }

    // ── Карточка производителя ──────────────────────────
    // [Название] | [Страна] [PHARMA/UGL badge]
    // [Описание]
    container.innerHTML = mfrs.map((m: any) => {
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

/**
 * Привязывает обработчики событий: клик по табам категорий, поиск, раскрытие карточек, табы производителей.
 */
function bindEvents(): void {
    // Category tabs
    const tabsContainer = document.getElementById('encyclopedia-tabs') as HTMLElement | null
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e: MouseEvent) => {
            const tab = (e.target as HTMLElement).closest('.encyclopedia-tab') as HTMLElement | null
            if (!tab) return
            tabsContainer.querySelectorAll('.encyclopedia-tab').forEach((t: Element) => t.classList.remove('active'))
            tab.classList.add('active')
            activeCategory = tab.dataset.cat!
            renderSubstanceGrid()
        })
    }

    // Search
    const searchEl = document.getElementById('encyclopedia-search') as HTMLInputElement | null
    if (searchEl) {
        let timer: ReturnType<typeof setTimeout>
        searchEl.addEventListener('input', () => {
            clearTimeout(timer)
            timer = setTimeout(() => {
                searchQuery = searchEl.value
                renderSubstanceGrid()
            }, 200)
        })
    }

    // Card expand/collapse + research button
    const grid = document.getElementById('encyclopedia-grid') as HTMLElement | null
    if (grid) {
        grid.addEventListener('click', (e: MouseEvent) => {
            const researchBtn = (e.target as HTMLElement).closest('.encyclopedia-research-btn') as HTMLElement | null
            if (researchBtn) {
                const id = researchBtn.dataset.researchId
                const substance = (state.drugCatalog as DrugCatalogItem[]).find(s => s.id === id)
                if (substance) openResearchModal(substance)
                return
            }
            const card = (e.target as HTMLElement).closest('.encyclopedia-card') as HTMLElement | null
            if (!card) return
            card.classList.toggle('expanded')
        })
    }

    // Manufacturer type tabs
    const mfrTabs = document.getElementById('mfr-tabs') as HTMLElement | null
    if (mfrTabs) {
        mfrTabs.addEventListener('click', (e: MouseEvent) => {
            const tab = (e.target as HTMLElement).closest('.encyclopedia-tab') as HTMLElement | null
            if (!tab) return
            mfrTabs.querySelectorAll('.encyclopedia-tab').forEach((t: Element) => t.classList.remove('active'))
            tab.classList.add('active')
            activeMfrType = tab.dataset.mfrType!
            renderMfrGrid()
        })
    }
}

(window as any).initEncyclopedia = initEncyclopedia;
