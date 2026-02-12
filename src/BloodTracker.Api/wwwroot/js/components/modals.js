import { state } from '../state.js'
import { api, catalogApi, purchaseApi } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { formatDateForInput, escapeHtml } from '../utils.js'
import { toast } from './toast.js'

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Маппинг числовых категорий препаратов к русским названиям */
const CATEGORY_NAMES = {
    0: 'ААС', 1: 'Пептиды', 2: 'SARMs', 3: 'ПКТ', 4: 'Жиросжигатели',
    5: 'Гормон роста', 6: 'Антиэстрогены', 7: 'Инсулин', 8: 'Прогормоны',
    9: 'Агонисты дофамина', 10: 'Другое'
}

/** Маппинг числовых типов приёма к названиям */
const TYPE_NAMES = { 0: 'Oral', 1: 'Inject', 2: 'SubQ', 3: 'Transdermal', 4: 'Nasal' }

/**
 * Загружает каталог субстанций и производителей если ещё не загружен.
 * Результат кешируется в state.catalogLoaded.
 * @returns {Promise<void>}
 */
export async function ensureCatalogLoaded() {
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
    }
}

let highlightIndex = -1

/**
 * Рендерит dropdown каталога субстанций с группировкой по категориям.
 * Фильтрует по имени/англ. имени/активному веществу, сортирует популярные первыми.
 * @param {string} query — поисковый запрос для фильтрации
 */
function renderCatalogDropdown(query) {
    const dropdown = document.getElementById('drug-catalog-dropdown')
    if (!dropdown) return

    const q = (query || '').toLowerCase()
    let items = state.drugCatalog

    if (q.length > 0) {
        items = items.filter(item =>
            item.name.toLowerCase().includes(q) ||
            (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
            (item.activeSubstance && item.activeSubstance.toLowerCase().includes(q))
        )
    }

    // Sort: popular first, then alphabetical
    items = items.sort((a, b) => {
        if (a.isPopular && !b.isPopular) return -1
        if (!a.isPopular && b.isPopular) return 1
        return a.sortOrder - b.sortOrder
    })

    // Group by category
    const groups = {}
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
            html += `<div class="catalog-dropdown-item${item.isPopular ? ' popular' : ''}" data-id="${item.id}" data-idx="${idx}">
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
            const id = el.dataset.id
            if (id === '__manual__') {
                clearSubstanceSelection()
                dropdown.classList.remove('active')
                document.getElementById('drug-name')?.focus()
            } else {
                selectSubstance(id)
                dropdown.classList.remove('active')
            }
        })
    })
}

/**
 * Выбирает субстанцию из каталога — заполняет поля формы и показывает инфо-панель.
 * @param {string} id — ID субстанции из каталога
 */
function selectSubstance(id) {
    const item = state.drugCatalog.find(s => s.id === id)
    if (!item) return

    document.getElementById('drug-catalog-id').value = id
    document.getElementById('drug-catalog-search').value = item.name
    document.getElementById('drug-name').value = item.name
    document.getElementById('drug-type').value = item.drugType

    showSubstanceInfo(item)
}

/**
 * Очищает выбор субстанции из каталога и скрывает инфо-панель.
 */
function clearSubstanceSelection() {
    document.getElementById('drug-catalog-id').value = ''
    document.getElementById('drug-catalog-search').value = ''
    hideSubstanceInfo()
}

/**
 * Показывает информационную панель с деталями выбранной субстанции.
 * Отображает описание, период полураспада, дозировки, эффекты, побочки.
 * @param {Object} item — объект субстанции из каталога
 */
function showSubstanceInfo(item) {
    const panel = document.getElementById('substance-info-panel')
    const title = document.getElementById('substance-info-title')
    const body = document.getElementById('substance-info-body')
    if (!panel || !body) return

    title.textContent = `${item.name}${item.nameEn ? ' / ' + item.nameEn : ''}`

    let html = ''
    if (item.description) html += `<div class="info-row"><div class="info-label">ОПИСАНИЕ</div><div class="info-value">${escapeHtml(item.description)}</div></div>`

    html += '<div class="info-grid">'
    if (item.halfLife) html += `<div class="info-row"><div class="info-label">ПЕРИОД ПОЛУРАСПАДА</div><div class="info-value">${escapeHtml(item.halfLife)}</div></div>`
    if (item.detectionTime) html += `<div class="info-row"><div class="info-label">ВРЕМЯ ОБНАРУЖЕНИЯ</div><div class="info-value">${escapeHtml(item.detectionTime)}</div></div>`
    if (item.commonDosages) html += `<div class="info-row"><div class="info-label">ДОЗИРОВКИ</div><div class="info-value">${escapeHtml(item.commonDosages)}</div></div>`
    html += '</div>'

    if (item.effects) html += `<div class="info-row"><div class="info-label">ЭФФЕКТЫ</div><div class="info-value">${escapeHtml(item.effects)}</div></div>`
    if (item.sideEffects) html += `<div class="info-row"><div class="info-label">ПОБОЧНЫЕ ЭФФЕКТЫ</div><div class="info-value">${escapeHtml(item.sideEffects)}</div></div>`
    if (item.notes) html += `<div class="info-row"><div class="info-label">ПРИМЕЧАНИЯ</div><div class="info-value" style="color:#ffb74d">${escapeHtml(item.notes)}</div></div>`

    body.innerHTML = html
    panel.classList.add('active')
}

/**
 * Скрывает информационную панель субстанции.
 */
function hideSubstanceInfo() {
    document.getElementById('substance-info-panel')?.classList.remove('active')
}

window.clearSubstanceInfo = () => {
    clearSubstanceSelection()
}

// ─── Manufacturer dropdown ───

/**
 * Рендерит dropdown производителей в модалке препарата.
 * Фильтрует по имени/стране, показывает тип (PHARMA/UGL).
 * @param {string} query — поисковый запрос для фильтрации
 */
function renderMfrDropdown(query) {
    const dropdown = document.getElementById('drug-mfr-dropdown')
    if (!dropdown) return

    const q = (query || '').toLowerCase()
    let mfrs = state.manufacturers

    if (q.length > 0) {
        mfrs = mfrs.filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.country && m.country.toLowerCase().includes(q))
        )
    }

    let html = mfrs.map(m => {
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
            const id = el.dataset.id
            if (id) {
                const mfr = state.manufacturers.find(m => m.id === id)
                document.getElementById('drug-mfr-id').value = id
                document.getElementById('drug-mfr-search').value = mfr?.name || ''
            } else {
                document.getElementById('drug-mfr-id').value = ''
                document.getElementById('drug-mfr-search').value = ''
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
function initCatalogAutocomplete() {
    const searchEl = document.getElementById('drug-catalog-search')
    const dropdown = document.getElementById('drug-catalog-dropdown')
    if (!searchEl || !dropdown) return

    let debounceTimer
    searchEl.addEventListener('input', () => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => renderCatalogDropdown(searchEl.value), 150)
    })

    searchEl.addEventListener('focus', async () => {
        await ensureCatalogLoaded()
        renderCatalogDropdown(searchEl.value)
    })

    searchEl.addEventListener('keydown', (e) => {
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
            items[highlightIndex]?.click()
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('active')
        }
    })

    // Mfr dropdown
    const mfrEl = document.getElementById('drug-mfr-search')
    const mfrDropdown = document.getElementById('drug-mfr-dropdown')
    if (mfrEl && mfrDropdown) {
        mfrEl.addEventListener('input', () => renderMfrDropdown(mfrEl.value))
        mfrEl.addEventListener('focus', async () => {
            await ensureCatalogLoaded()
            renderMfrDropdown(mfrEl.value)
        })
        mfrEl.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') mfrDropdown.classList.remove('active')
        })
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.catalog-autocomplete')) dropdown.classList.remove('active')
        if (!e.target.closest('.mfr-dropdown')) mfrDropdown?.classList.remove('active')
    })
}

/**
 * Обновляет визуальное выделение элемента в dropdown по индексу.
 * @param {NodeListOf<Element>} items — список элементов dropdown
 */
function updateHighlight(items) {
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
export function openDrugModal(drugId = null) {
    state.editingDrugId = drugId
    const titleEl = document.getElementById('drug-modal-title')
    const modal = document.getElementById('drug-modal')
    if (!titleEl || !modal) return

    // Pre-load catalog
    ensureCatalogLoaded()

    if (drugId) {
        titleEl.textContent = '[ РЕДАКТИРОВАТЬ ПРЕПАРАТ ]'
        const drug = state.drugs.find(d => d.id === drugId)
        if (drug) {
            const nameEl = document.getElementById('drug-name')
            const typeEl = document.getElementById('drug-type')
            const dosageEl = document.getElementById('drug-dosage')
            const amountEl = document.getElementById('drug-amount')
            const scheduleEl = document.getElementById('drug-schedule')
            const notesEl = document.getElementById('drug-notes')

            if (nameEl) nameEl.value = drug.name || ''
            if (typeEl) typeEl.value = drug.type ?? 0
            if (dosageEl) dosageEl.value = drug.dosage || ''
            if (amountEl) amountEl.value = drug.amount || ''
            if (scheduleEl) scheduleEl.value = drug.schedule || ''
            if (notesEl) notesEl.value = drug.notes || ''

            // Restore catalog references
            if (drug.catalogItemId) {
                document.getElementById('drug-catalog-id').value = drug.catalogItemId
                const catItem = state.drugCatalog.find(s => s.id === drug.catalogItemId)
                if (catItem) {
                    document.getElementById('drug-catalog-search').value = catItem.name
                    showSubstanceInfo(catItem)
                }
            }
            if (drug.manufacturerId) {
                document.getElementById('drug-mfr-id').value = drug.manufacturerId
                const mfr = state.manufacturers.find(m => m.id === drug.manufacturerId)
                if (mfr) document.getElementById('drug-mfr-search').value = mfr.name
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
export function closeDrugModal() {
    const modal = document.getElementById('drug-modal')
    if (!modal) return
    modal.classList.remove('active')
    document.body.classList.remove('modal-open')
    state.editingDrugId = null

    // Reset all fields
    const fields = ['drug-name', 'drug-dosage', 'drug-amount', 'drug-schedule', 'drug-notes', 'drug-catalog-search', 'drug-mfr-search']
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })

    const typeEl = document.getElementById('drug-type')
    if (typeEl) typeEl.value = '0'

    document.getElementById('drug-catalog-id').value = ''
    document.getElementById('drug-mfr-id').value = ''
    hideSubstanceInfo()
}

/** Флаг предотвращения двойного сохранения */
let _savingDrug = false
/**
 * Сохраняет препарат (создание или обновление).
 * Валидирует название, отправляет POST/PUT, перезагружает списки.
 * @returns {Promise<void>}
 */
export async function saveDrug() {
    if (_savingDrug) return
    const nameEl = document.getElementById('drug-name')
    const typeEl = document.getElementById('drug-type')
    const dosageEl = document.getElementById('drug-dosage')
    const amountEl = document.getElementById('drug-amount')
    const scheduleEl = document.getElementById('drug-schedule')
    const notesEl = document.getElementById('drug-notes')
    const catalogIdEl = document.getElementById('drug-catalog-id')
    const mfrIdEl = document.getElementById('drug-mfr-id')

    if (!nameEl || !typeEl) return

    const data = {
        name: nameEl.value.trim(),
        type: parseInt(typeEl.value),
        dosage: dosageEl?.value || '',
        amount: amountEl?.value || '',
        schedule: scheduleEl?.value || '',
        notes: notesEl?.value || '',
        courseId: state.currentCourse?.id || null,
        catalogItemId: catalogIdEl?.value || null,
        manufacturerId: mfrIdEl?.value || null
    }
    if (!data.name) { toast.warning('Введите название'); return }

    _savingDrug = true
    try {
        if (state.editingDrugId) {
            await api(ENDPOINTS.drugs.update(state.editingDrugId), { method: 'PUT', body: JSON.stringify(data) })
            state.editingDrugId = null
        } else {
            await api(ENDPOINTS.drugs.create, { method: 'POST', body: JSON.stringify(data) })
        }
        closeDrugModal()
        const { loadDrugs, loadDashboard } = await import('../main.js')
        await loadDrugs()
        await loadDashboard()
    } catch (e) {
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
export async function deleteDrug(id) {
        if (!confirm('[ УДАЛИТЬ ПРЕПАРАТ? ]')) return
    try {
        await api(ENDPOINTS.drugs.delete(id), { method: 'DELETE' })
        const { loadDrugs, loadDashboard } = await import('../main.js')
        await loadDrugs()
        await loadDashboard()
    } catch (e) {
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
export async function openLogModal(logId = null) {
    if (state.drugs.length === 0) { toast.warning('Сначала добавьте препараты'); return }
    state.editingLogId = logId
    const titleEl = document.getElementById('log-modal-title')
    const modal = document.getElementById('log-modal')
    if (!titleEl || !modal) return

    // Setup drug change listener for purchase dropdown
    const drugEl = document.getElementById('log-drug')
    const purchaseEl = document.getElementById('log-purchase')
    if (drugEl && purchaseEl) {
        drugEl.onchange = () => loadPurchaseOptions(drugEl.value)
    }

    if (logId) {
        titleEl.textContent = '[ РЕДАКТИРОВАТЬ ЗАПИСЬ ]'
        const log = state.intakeLogs.find(l => l.id === logId)
        if (log) {
            const dateEl = document.getElementById('log-date')
            const doseEl = document.getElementById('log-dose')
            const noteEl = document.getElementById('log-note')

            if (dateEl) dateEl.value = formatDateForInput(log.date)
            if (drugEl) drugEl.value = log.drugId
            if (doseEl) doseEl.value = log.dose || ''
            if (noteEl) noteEl.value = log.note || ''

            // Load purchase options and select current
            if (drugEl) await loadPurchaseOptions(log.drugId, log.purchaseId)
        }
    } else {
        titleEl.textContent = '[ ДОБАВИТЬ ЗАПИСЬ ]'
        const dateEl = document.getElementById('log-date')
        const doseEl = document.getElementById('log-dose')
        const noteEl = document.getElementById('log-note')

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
async function loadPurchaseOptions(drugId, selectedPurchaseId = null) {
    const purchaseEl = document.getElementById('log-purchase')
    if (!purchaseEl || !drugId) {
        if (purchaseEl) purchaseEl.innerHTML = '<option value="">Авто</option>'
        return
    }
    try {
        const options = await purchaseApi.options(drugId)
        let html = '<option value="">Авто</option>'
        options.forEach(opt => {
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
export function closeLogModal() {
    const modal = document.getElementById('log-modal')
    if (!modal) return
    modal.classList.remove('active')
    document.body.classList.remove('modal-open')
    state.editingLogId = null
}

/** Флаг предотвращения двойного сохранения */
let _savingLog = false
/**
 * Сохраняет запись приёма (создание или обновление).
 * Собирает данные из полей, отправляет POST/PUT, перезагружает список.
 * @returns {Promise<void>}
 */
export async function saveLog() {
    if (_savingLog) return
    const dateEl = document.getElementById('log-date')
    const drugEl = document.getElementById('log-drug')
    const doseEl = document.getElementById('log-dose')
    const noteEl = document.getElementById('log-note')
    const purchaseEl = document.getElementById('log-purchase')

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
        if (state.editingLogId) {
            await api(ENDPOINTS.intakeLogs.update(state.editingLogId), { method: 'PUT', body: JSON.stringify(data) })
            state.editingLogId = null
        } else {
            await api(ENDPOINTS.intakeLogs.create, { method: 'POST', body: JSON.stringify(data) })
        }
        closeLogModal()
        const { loadIntakeLogs } = await import('../main.js')
        await loadIntakeLogs()
    } catch (e) {
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
export async function deleteLog(id) {
    try {
        await api(ENDPOINTS.intakeLogs.delete(id), { method: 'DELETE' })
        const { loadIntakeLogs } = await import('../main.js')
        await loadIntakeLogs()
    } catch (e) {
        toast.error('Ошибка: ' + e.message)
    }
}

// Экспортируем в window для использования в HTML
window.openDrugModal = openDrugModal
window.closeDrugModal = closeDrugModal
window.saveDrug = saveDrug
window.deleteDrug = deleteDrug
window.editDrug = (id) => openDrugModal(id)
window.openLogModal = openLogModal
window.closeLogModal = closeLogModal
window.saveLog = saveLog
window.deleteLog = deleteLog
window.editLog = (id) => openLogModal(id)
