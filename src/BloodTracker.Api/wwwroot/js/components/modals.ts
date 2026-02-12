import { state } from '../state.js'
import { api, catalogApi, purchaseApi } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { formatDateForInput, escapeHtml } from '../utils.js'
import { toast } from './toast.js'

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Маппинг числовых категорий препаратов к русским названиям */
const CATEGORY_NAMES: Record<number, string> = {
    0: 'ААС', 1: 'Пептиды', 2: 'SARMs', 3: 'ПКТ', 4: 'Жиросжигатели',
    5: 'Гормон роста', 6: 'Антиэстрогены', 7: 'Инсулин', 8: 'Прогормоны',
    9: 'Агонисты дофамина', 10: 'Другое'
}

/** Маппинг числовых типов приёма к названиям */
const TYPE_NAMES: Record<number, string> = { 0: 'Oral', 1: 'Inject', 2: 'SubQ', 3: 'Transdermal', 4: 'Nasal' }

/**
 * Загружает каталог субстанций и производителей если ещё не загружен.
 * Результат кешируется в state.catalogLoaded.
 * @returns {Promise<void>}
 */
export async function ensureCatalogLoaded(): Promise<void> {
    if ((state as any).catalogLoaded) return
    try {
        const [substances, mfrs] = await Promise.all([
            catalogApi.substances(),
            catalogApi.manufacturers()
        ])
        ;(state as any).drugCatalog = substances
        ;(state as any).manufacturers = mfrs
        ;(state as any).catalogLoaded = true
    } catch (e) {
        console.error('Failed to load catalog:', e)
    }
}

let highlightIndex: number = -1

/**
 * Рендерит dropdown каталога субстанций с группировкой по категориям.
 * Фильтрует по имени/англ. имени/активному веществу, сортирует популярные первыми.
 * @param {string} query — поисковый запрос для фильтрации
 */
function renderCatalogDropdown(query: string): void {
    const dropdown = document.getElementById('drug-catalog-dropdown')
    if (!dropdown) return

    const q = (query || '').toLowerCase()
    let items = (state as any).drugCatalog as any[]

    if (q.length > 0) {
        items = items.filter(item =>
            item.name.toLowerCase().includes(q) ||
            (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
            (item.activeSubstance && item.activeSubstance.toLowerCase().includes(q))
        )
    }

    // Sort: popular first, then alphabetical
    items = items.sort((a: any, b: any) => {
        if (a.meta?.isPopular && !b.meta?.isPopular) return -1
        if (!a.meta?.isPopular && b.meta?.isPopular) return 1
        return (a.meta?.sortOrder || 0) - (b.meta?.sortOrder || 0)
    })

    // Group by category
    const groups: Record<string, any[]> = {}
    items.forEach(item => {
        const cat = CATEGORY_NAMES[item.category] || 'Другое'
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(item)
    })

    let html = ''
    let idx = 0
    for (const [cat, catItems] of Object.entries(groups)) {
        html += `<div class="catalog-dropdown-group">═ ${cat} ═</div>`
        for (const item of catItems.slice(0, q.length > 0 ? 20 : 8)) {
            html += `<div class="catalog-dropdown-item${item.meta?.isPopular ? ' popular' : ''}" data-id="${item.id}" data-idx="${idx}">
                <span><span class="item-name">${escapeHtml(item.name)}</span>${item.nameEn ? `<span class="item-name-en">${escapeHtml(item.nameEn)}</span>` : ''}</span>
                <span class="item-type-badge">${TYPE_NAMES[item.drugType] || ''}</span>
            </div>`
            idx++
        }
    }
    html += `<div class="catalog-dropdown-manual" data-id="__manual__">[ Ввести вручную ]</div>`

    dropdown.innerHTML = html
    dropdown.classList.add('active')
    highlightIndex = -1

    // Click handlers
    dropdown.querySelectorAll('.catalog-dropdown-item, .catalog-dropdown-manual').forEach(el => {
        el.addEventListener('click', () => {
            const id = (el as HTMLElement).dataset.id
            if (id === '__manual__') {
                clearSubstanceSelection()
                dropdown.classList.remove('active')
                document.getElementById('drug-name')?.focus()
            } else {
                selectSubstance(id!)
                dropdown.classList.remove('active')
            }
        })
    })
}

/**
 * Выбирает субстанцию из каталога — заполняет поля формы и показывает инфо-панель.
 * @param {string} id — ID субстанции из каталога
 */
function selectSubstance(id: string): void {
    const item = ((state as any).drugCatalog as any[]).find(s => s.id === id)
    if (!item) return

    ;(document.getElementById('drug-catalog-id') as HTMLInputElement).value = id
    ;(document.getElementById('drug-catalog-search') as HTMLInputElement).value = item.name
    ;(document.getElementById('drug-name') as HTMLInputElement).value = item.name
    ;(document.getElementById('drug-type') as HTMLSelectElement).value = item.drugType

    showSubstanceInfo(item)
}

/**
 * Очищает выбор субстанции из каталога и скрывает инфо-панель.
 */
function clearSubstanceSelection(): void {
    ;(document.getElementById('drug-catalog-id') as HTMLInputElement).value = ''
    ;(document.getElementById('drug-catalog-search') as HTMLInputElement).value = ''
    hideSubstanceInfo()
}

/**
 * Показывает информационную панель с деталями выбранной субстанции.
 * Отображает описание, период полураспада, дозировки, эффекты, побочки.
 * @param {Object} item — объект субстанции из каталога
 */
function showSubstanceInfo(item: any): void {
    const panel = document.getElementById('substance-info-panel')
    const title = document.getElementById('substance-info-title')
    const body = document.getElementById('substance-info-body')
    if (!panel || !body) return

    title!.textContent = `${item.name}${item.nameEn ? ' / ' + item.nameEn : ''}`

    let html = ''
    if (item.description?.text) html += `<div class="info-row"><div class="info-label">ОПИСАНИЕ</div><div class="info-value">${escapeHtml(item.description.text)}</div></div>`

    html += '<div class="info-grid">'
    if (item.pharmacology?.halfLife) html += `<div class="info-row"><div class="info-label">ПЕРИОД ПОЛУРАСПАДА</div><div class="info-value">${escapeHtml(item.pharmacology.halfLife)}</div></div>`
    if (item.pharmacology?.detectionTime) html += `<div class="info-row"><div class="info-label">ВРЕМЯ ОБНАРУЖЕНИЯ</div><div class="info-value">${escapeHtml(item.pharmacology.detectionTime)}</div></div>`
    if (item.pharmacology?.commonDosages) html += `<div class="info-row"><div class="info-label">ДОЗИРОВКИ</div><div class="info-value">${escapeHtml(item.pharmacology.commonDosages)}</div></div>`
    html += '</div>'

    if (item.description?.effects) html += `<div class="info-row"><div class="info-label">ЭФФЕКТЫ</div><div class="info-value">${escapeHtml(item.description.effects)}</div></div>`
    if (item.description?.sideEffects) html += `<div class="info-row"><div class="info-label">ПОБОЧНЫЕ ЭФФЕКТЫ</div><div class="info-value">${escapeHtml(item.description.sideEffects)}</div></div>`
    if (item.notes) html += `<div class="info-row"><div class="info-label">ПРИМЕЧАНИЯ</div><div class="info-value" style="color:#ffb74d">${escapeHtml(item.notes)}</div></div>`

    body.innerHTML = html
    panel.classList.add('active')
}

/**
 * Скрывает информационную панель субстанции.
 */
function hideSubstanceInfo(): void {
    document.getElementById('substance-info-panel')?.classList.remove('active')
}

;(window as any).clearSubstanceInfo = (): void => {
    clearSubstanceSelection()
}

// ─── Manufacturer dropdown ───

/**
 * Рендерит dropdown производителей в модалке препарата.
 * Фильтрует по имени/стране, показывает тип (PHARMA/UGL).
 * @param {string} query — поисковый запрос для фильтрации
 */
function renderMfrDropdown(query: string): void {
    const dropdown = document.getElementById('drug-mfr-dropdown')
    if (!dropdown) return

    const q = (query || '').toLowerCase()
    let mfrs = (state as any).manufacturers as any[]

    if (q.length > 0) {
        mfrs = mfrs.filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.country && m.country.toLowerCase().includes(q))
        )
    }

    let html = mfrs.map((m: any) => {
        const typeClass = m.type === 0 ? 'mfr-type-pharma' : 'mfr-type-ugl'
        const typeLabel = m.type === 0 ? 'PHARMA' : 'UGL'
        return `<div class="mfr-dropdown-item" data-id="${m.id}">
            <span><span class="mfr-name">${escapeHtml(m.name)}</span> <span class="mfr-country">${escapeHtml(m.country)}</span></span>
            <span class="mfr-type-badge ${typeClass}">${typeLabel}</span>
        </div>`
    }).join('')

    html += `<div class="mfr-dropdown-item" data-id=""><span class="mfr-name" style="color:var(--text-secondary);font-style:italic">[ Без производителя ]</span></div>`

    dropdown.innerHTML = html
    dropdown.classList.add('active')

    dropdown.querySelectorAll('.mfr-dropdown-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = (el as HTMLElement).dataset.id
            if (id) {
                const mfr = ((state as any).manufacturers as any[]).find(m => m.id === id)
                ;(document.getElementById('drug-mfr-id') as HTMLInputElement).value = id
                ;(document.getElementById('drug-mfr-search') as HTMLInputElement).value = mfr?.name || ''
            } else {
                ;(document.getElementById('drug-mfr-id') as HTMLInputElement).value = ''
                ;(document.getElementById('drug-mfr-search') as HTMLInputElement).value = ''
            }
            dropdown.classList.remove('active')
        })
    })
}

// ─── Init autocomplete events ───

/**
 * Инициализирует автокомплит каталога субстанций и производителей.
 * Привязывает input/focus/keydown обработчики с debounce и навигацией стрелками.
 */
function initCatalogAutocomplete(): void {
    const searchEl = document.getElementById('drug-catalog-search') as HTMLInputElement | null
    const dropdown = document.getElementById('drug-catalog-dropdown')
    if (!searchEl || !dropdown) return

    let debounceTimer: ReturnType<typeof setTimeout>
    searchEl.addEventListener('input', () => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => renderCatalogDropdown(searchEl.value), 150)
    })

    searchEl.addEventListener('focus', async () => {
        await ensureCatalogLoaded()
        renderCatalogDropdown(searchEl.value)
    })

    searchEl.addEventListener('keydown', (e: KeyboardEvent) => {
        const items = dropdown.querySelectorAll('.catalog-dropdown-item')
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            highlightIndex = Math.min(highlightIndex + 1, items.length - 1)
            updateHighlight(items)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            highlightIndex = Math.max(highlightIndex - 1, 0)
            updateHighlight(items)
        } else if (e.key === 'Enter' && highlightIndex >= 0) {
            e.preventDefault()
            ;(items[highlightIndex] as HTMLElement)?.click()
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('active')
        }
    })

    // Mfr dropdown
    const mfrEl = document.getElementById('drug-mfr-search') as HTMLInputElement | null
    const mfrDropdown = document.getElementById('drug-mfr-dropdown')
    if (mfrEl && mfrDropdown) {
        mfrEl.addEventListener('input', () => renderMfrDropdown(mfrEl.value))
        mfrEl.addEventListener('focus', async () => {
            await ensureCatalogLoaded()
            renderMfrDropdown(mfrEl.value)
        })
        mfrEl.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') mfrDropdown.classList.remove('active')
        })
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest('.catalog-autocomplete')) dropdown.classList.remove('active')
        if (!(e.target as HTMLElement).closest('.mfr-dropdown')) mfrDropdown?.classList.remove('active')
    })
}

/**
 * Обновляет визуальное выделение элемента в dropdown по индексу.
 * @param {NodeListOf<Element>} items — список элементов dropdown
 */
function updateHighlight(items: NodeListOf<Element>): void {
    items.forEach((el, i) => {
        el.classList.toggle('highlighted', i === highlightIndex)
        if (i === highlightIndex) el.scrollIntoView({ block: 'nearest' })
    })
}

// Init once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalogAutocomplete)
} else {
    initCatalogAutocomplete()
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRUG MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Открывает модалку создания/редактирования препарата.
 * При drugId заполняет форму данными существующего препарата.
 * @param {string|null} [drugId=null] — ID препарата для редактирования, null для создания
 */
export function openDrugModal(drugId: string | null = null): void {
    (state as any).editingDrugId = drugId
    const titleEl = document.getElementById('drug-modal-title')
    const modal = document.getElementById('drug-modal')
    if (!titleEl || !modal) return

    // Pre-load catalog
    ensureCatalogLoaded()

    if (drugId) {
        titleEl.textContent = '[ РЕДАКТИРОВАТЬ ПРЕПАРАТ ]'
        const drug = (state as any).drugs.find((d: any) => d.id === drugId)
        if (drug) {
            const nameEl = document.getElementById('drug-name') as HTMLInputElement | null
            const typeEl = document.getElementById('drug-type') as HTMLSelectElement | null
            const dosageEl = document.getElementById('drug-dosage') as HTMLInputElement | null
            const amountEl = document.getElementById('drug-amount') as HTMLInputElement | null
            const scheduleEl = document.getElementById('drug-schedule') as HTMLInputElement | null
            const notesEl = document.getElementById('drug-notes') as HTMLTextAreaElement | null

            if (nameEl) nameEl.value = drug.name || ''
            if (typeEl) typeEl.value = drug.type ?? 0
            if (dosageEl) dosageEl.value = drug.dosage || ''
            if (amountEl) amountEl.value = drug.amount || ''
            if (scheduleEl) scheduleEl.value = drug.schedule || ''
            if (notesEl) notesEl.value = drug.notes || ''

            // Restore catalog references
            if (drug.catalogItemId) {
                ;(document.getElementById('drug-catalog-id') as HTMLInputElement).value = drug.catalogItemId
                const catItem = ((state as any).drugCatalog as any[]).find(s => s.id === drug.catalogItemId)
                if (catItem) {
                    ;(document.getElementById('drug-catalog-search') as HTMLInputElement).value = catItem.name
                    showSubstanceInfo(catItem)
                }
            }
            if (drug.manufacturerId) {
                ;(document.getElementById('drug-mfr-id') as HTMLInputElement).value = drug.manufacturerId
                const mfr = ((state as any).manufacturers as any[]).find(m => m.id === drug.manufacturerId)
                if (mfr) (document.getElementById('drug-mfr-search') as HTMLInputElement).value = mfr.name
            }
        }
    } else {
        titleEl.textContent = '[ ДОБАВИТЬ ПРЕПАРАТ ]'
    }
    modal.classList.add('active')
    document.body.classList.add('modal-open')
}

/**
 * Закрывает модалку препарата, сбрасывает все поля и инфо-панель.
 */
export function closeDrugModal(): void {
    const modal = document.getElementById('drug-modal')
    if (!modal) return
    modal.classList.remove('active')
    document.body.classList.remove('modal-open')
    ;(state as any).editingDrugId = null

    // Reset all fields
    const fields = ['drug-name', 'drug-dosage', 'drug-amount', 'drug-schedule', 'drug-notes', 'drug-catalog-search', 'drug-mfr-search']
    fields.forEach(id => { const el = document.getElementById(id) as HTMLInputElement | null; if (el) el.value = '' })

    const typeEl = document.getElementById('drug-type') as HTMLSelectElement | null
    if (typeEl) typeEl.value = '0'

    ;(document.getElementById('drug-catalog-id') as HTMLInputElement).value = ''
    ;(document.getElementById('drug-mfr-id') as HTMLInputElement).value = ''
    hideSubstanceInfo()
}

/** Флаг предотвращения двойного сохранения */
let _savingDrug: boolean = false
/**
 * Сохраняет препарат (создание или обновление).
 * Валидирует название, отправляет POST/PUT, перезагружает списки.
 * @returns {Promise<void>}
 */
export async function saveDrug(): Promise<void> {
    if (_savingDrug) return
    const nameEl = document.getElementById('drug-name') as HTMLInputElement | null
    const typeEl = document.getElementById('drug-type') as HTMLSelectElement | null
    const dosageEl = document.getElementById('drug-dosage') as HTMLInputElement | null
    const amountEl = document.getElementById('drug-amount') as HTMLInputElement | null
    const scheduleEl = document.getElementById('drug-schedule') as HTMLInputElement | null
    const notesEl = document.getElementById('drug-notes') as HTMLTextAreaElement | null
    const catalogIdEl = document.getElementById('drug-catalog-id') as HTMLInputElement | null
    const mfrIdEl = document.getElementById('drug-mfr-id') as HTMLInputElement | null

    if (!nameEl || !typeEl) return

    const data = {
        name: nameEl.value.trim(),
        type: parseInt(typeEl.value),
        dosage: dosageEl?.value || '',
        amount: amountEl?.value || '',
        schedule: scheduleEl?.value || '',
        notes: notesEl?.value || '',
        courseId: (state as any).currentCourse?.id || null,
        catalogItemId: catalogIdEl?.value || null,
        manufacturerId: mfrIdEl?.value || null
    }
    if (!data.name) { toast.warning('Введите название'); return }

    _savingDrug = true
    try {
        if ((state as any).editingDrugId) {
            await api(ENDPOINTS.drugs.update((state as any).editingDrugId), { method: 'PUT', body: JSON.stringify(data) })
            ;(state as any).editingDrugId = null
        } else {
            await api(ENDPOINTS.drugs.create, { method: 'POST', body: JSON.stringify(data) })
        }
        closeDrugModal()
        const { loadDrugs, loadDashboard } = await import('../main.js')
        await loadDrugs()
        await loadDashboard()
    } catch (e: any) {
        toast.error('Ошибка: ' + e.message)
    } finally {
        _savingDrug = false
    }
}

/**
 * Удаляет препарат после подтверждения. Перезагружает списки.
 * @param {string} id — ID препарата
 * @returns {Promise<void>}
 */
export async function deleteDrug(id: string): Promise<void> {
        if (!confirm('[ УДАЛИТЬ ПРЕПАРАТ? ]')) return
    try {
        await api(ENDPOINTS.drugs.delete(id), { method: 'DELETE' })
        const { loadDrugs, loadDashboard } = await import('../main.js')
        await loadDrugs()
        await loadDashboard()
    } catch (e: any) {
        toast.error('Ошибка: ' + e.message)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOG MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Открывает модалку создания/редактирования записи приёма.
 * Заполняет dropdown препаратов и покупок, при logId — данные записи.
 * @param {string|null} [logId=null] — ID записи для редактирования, null для создания
 * @returns {Promise<void>}
 */
export async function openLogModal(logId: string | null = null): Promise<void> {
    if ((state as any).drugs.length === 0) { toast.warning('Сначала добавьте препараты'); return }
    ;(state as any).editingLogId = logId
    const titleEl = document.getElementById('log-modal-title')
    const modal = document.getElementById('log-modal')
    if (!titleEl || !modal) return

    // Setup drug change listener for purchase dropdown
    const drugEl = document.getElementById('log-drug') as HTMLSelectElement | null
    const purchaseEl = document.getElementById('log-purchase') as HTMLSelectElement | null
    if (drugEl && purchaseEl) {
        drugEl.onchange = () => loadPurchaseOptions(drugEl.value)
    }

    if (logId) {
        titleEl.textContent = '[ РЕДАКТИРОВАТЬ ЗАПИСЬ ]'
        const log = (state as any).intakeLogs.find((l: any) => l.id === logId)
        if (log) {
            const dateEl = document.getElementById('log-date') as HTMLInputElement | null
            const doseEl = document.getElementById('log-dose') as HTMLInputElement | null
            const noteEl = document.getElementById('log-note') as HTMLTextAreaElement | null

            if (dateEl) dateEl.value = formatDateForInput(log.date)
            if (drugEl) drugEl.value = log.drugId
            if (doseEl) doseEl.value = log.dose || ''
            if (noteEl) noteEl.value = log.note || ''

            // Load purchase options and select current
            if (drugEl) await loadPurchaseOptions(log.drugId, log.purchaseId)
        }
    } else {
        titleEl.textContent = '[ ДОБАВИТЬ ЗАПИСЬ ]'
        const dateEl = document.getElementById('log-date') as HTMLInputElement | null
        const doseEl = document.getElementById('log-dose') as HTMLInputElement | null
        const noteEl = document.getElementById('log-note') as HTMLTextAreaElement | null

        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0]
        if (drugEl) drugEl.value = ''
        if (doseEl) doseEl.value = ''
        if (noteEl) noteEl.value = ''
        if (purchaseEl) purchaseEl.innerHTML = '<option value="">Авто</option>'

        // Load for first drug if available
        if (drugEl && drugEl.value) await loadPurchaseOptions(drugEl.value)
    }
    modal.classList.add('active')
    document.body.classList.add('modal-open')
}

/**
 * Загружает опции покупок для выбранного препарата в dropdown.
 * @param {string} drugId — ID препарата
 * @param {string|null} [selectedPurchaseId=null] — ID покупки для предвыбора
 * @returns {Promise<void>}
 */
async function loadPurchaseOptions(drugId: string, selectedPurchaseId: string | null = null): Promise<void> {
    const purchaseEl = document.getElementById('log-purchase') as HTMLSelectElement | null
    if (!purchaseEl || !drugId) {
        if (purchaseEl) purchaseEl.innerHTML = '<option value="">Авто</option>'
        return
    }
    try {
        const options = await purchaseApi.options(drugId)
        let html = '<option value="">Авто</option>'
        ;(options as any[]).forEach(opt => {
            const selected = selectedPurchaseId === opt.id ? ' selected' : ''
            html += `<option value="${opt.id}"${selected}>${escapeHtml(opt.label)}</option>`
        })
        purchaseEl.innerHTML = html
    } catch (e) {
        purchaseEl.innerHTML = '<option value="">Авто</option>'
    }
}

/**
 * Закрывает модалку записи приёма.
 */
export function closeLogModal(): void {
    const modal = document.getElementById('log-modal')
    if (!modal) return
    modal.classList.remove('active')
    document.body.classList.remove('modal-open')
    ;(state as any).editingLogId = null
}

/** Флаг предотвращения двойного сохранения */
let _savingLog: boolean = false
/**
 * Сохраняет запись приёма (создание или обновление).
 * Собирает данные из полей, отправляет POST/PUT, перезагружает список.
 * @returns {Promise<void>}
 */
export async function saveLog(): Promise<void> {
    if (_savingLog) return
    const dateEl = document.getElementById('log-date') as HTMLInputElement | null
    const drugEl = document.getElementById('log-drug') as HTMLSelectElement | null
    const doseEl = document.getElementById('log-dose') as HTMLInputElement | null
    const noteEl = document.getElementById('log-note') as HTMLTextAreaElement | null
    const purchaseEl = document.getElementById('log-purchase') as HTMLSelectElement | null

    if (!dateEl || !drugEl) return

    const data = {
        date: dateEl.value,
        drugId: drugEl.value,
        dose: doseEl?.value || '',
        note: noteEl?.value || '',
        purchaseId: purchaseEl?.value || null
    }

    _savingLog = true
    try {
        if ((state as any).editingLogId) {
            await api(ENDPOINTS.intakeLogs.update((state as any).editingLogId), { method: 'PUT', body: JSON.stringify(data) })
            ;(state as any).editingLogId = null
        } else {
            await api(ENDPOINTS.intakeLogs.create, { method: 'POST', body: JSON.stringify(data) })
        }
        closeLogModal()
        const { loadIntakeLogs } = await import('../main.js')
        await loadIntakeLogs()
    } catch (e: any) {
        toast.error('Ошибка: ' + e.message)
    } finally {
        _savingLog = false
    }
}

/**
 * Удаляет запись приёма и перезагружает список.
 * @param {string} id — ID записи приёма
 * @returns {Promise<void>}
 */
export async function deleteLog(id: string): Promise<void> {
    try {
        await api(ENDPOINTS.intakeLogs.delete(id), { method: 'DELETE' })
        const { loadIntakeLogs } = await import('../main.js')
        await loadIntakeLogs()
    } catch (e: any) {
        toast.error('Ошибка: ' + e.message)
    }
}

// Экспортируем в window для использования в HTML
;(window as any).openDrugModal = openDrugModal
;(window as any).closeDrugModal = closeDrugModal
;(window as any).saveDrug = saveDrug
;(window as any).deleteDrug = deleteDrug
;(window as any).editDrug = (id: string) => openDrugModal(id)
;(window as any).openLogModal = openLogModal
;(window as any).closeLogModal = closeLogModal
;(window as any).saveLog = saveLog
;(window as any).deleteLog = deleteLog
;(window as any).editLog = (id: string) => openLogModal(id)
