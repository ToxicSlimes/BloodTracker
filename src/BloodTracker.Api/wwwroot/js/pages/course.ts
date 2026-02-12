import { state } from '../state.js'
import { api } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { formatDateForInput, formatDate, escapeHtml } from '../utils.js'
import { toast } from '../components/toast.js'

/**
 * Сохраняет курс (создание или редактирование).
 * Если state.editingCourseId задан — PUT обновление, иначе POST создание.
 * После сохранения перезагружает дашборд.
 * @returns {Promise<void>}
 */
export async function saveCourse() {
    const titleEl = document.getElementById('course-title')
    const startEl = document.getElementById('course-start')
    const endEl = document.getElementById('course-end')
    const notesEl = document.getElementById('course-notes')
    
    if (!titleEl || !startEl || !endEl || !notesEl) return
    
    const data = {
        title: titleEl.value,
        startDate: startEl.value || null,
        endDate: endEl.value || null,
        notes: notesEl.value
    }
    if (!data.title) { toast.warning('Введите название'); return }
    
    try {
        if (state.editingCourseId) {
            await api(ENDPOINTS.courses.update(state.editingCourseId), { method: 'PUT', body: JSON.stringify(data) })
            state.editingCourseId = null
        } else {
            await api(ENDPOINTS.courses.create, { method: 'POST', body: JSON.stringify(data) })
        }
        const { loadDashboard } = await import('../main.js')
        await loadDashboard()
        toast.success('Курс сохранён')
    } catch (e) {
        toast.error('Ошибка: ' + e.message)
    }
}

/**
 * Переводит форму курса в режим редактирования.
 * Загружает активный курс (если не в state), заполняет поля формы.
 * @returns {Promise<void>}
 */
export async function editCourse() {
    if (!state.currentCourse) {
        const course = await api(ENDPOINTS.courses.active)
        if (!course) { toast.warning('Нет активного курса'); return }
        state.currentCourse = course
    }
    state.editingCourseId = state.currentCourse.id
    
    const titleEl = document.getElementById('course-title')
    const startEl = document.getElementById('course-start')
    const endEl = document.getElementById('course-end')
    const notesEl = document.getElementById('course-notes')
    
    if (titleEl) titleEl.value = state.currentCourse.title || ''
    if (startEl) startEl.value = state.currentCourse.startDate ? formatDateForInput(state.currentCourse.startDate) : ''
    if (endEl) endEl.value = state.currentCourse.endDate ? formatDateForInput(state.currentCourse.endDate) : ''
    if (notesEl) notesEl.value = state.currentCourse.notes || ''
}

/**
 * Возвращает HTML-badge типа препарата (оральный, инъекция и т.д.).
 * @param {number} type — числовой тип препарата (0-4)
 * @returns {string} HTML-строка с badge
 */
function drugTypeBadge(type) {
    const map = {
        0: { cls: 'badge-oral', label: '[ ОРАЛЬНЫЙ ]' },
        1: { cls: 'badge-inject', label: '[ ИНЪЕКЦИЯ ]' },
        2: { cls: 'badge-subcutaneous', label: '[ ПОДКОЖНЫЙ ]' },
        3: { cls: 'badge-transdermal', label: '[ ТРАНСДЕРМ ]' },
        4: { cls: 'badge-nasal', label: '[ НАЗАЛЬНЫЙ ]' }
    }
    const info = map[type] || map[0]
    return `<span class="drug-badge ${info.cls}">${info.label}</span>`
}

/**
 * Рендерит список препаратов текущего курса.
 * Для каждого препарата показывает карточку с дозировкой, расписанием, типом и кнопками действий.
 */
export function renderDrugs() {
    const container = document.getElementById('drugs-list')
    if (!container) return

    if (state.drugs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет препаратов</p></div>'
        return
    }
    // ── Карточка препарата ──────────────────────────
    // [Название]
    // [Дозировка] • [Количество] • [Расписание]
    // Badges: [Тип] [Производитель] [Каталог]
    // Кнопки: [Редактировать] [Удалить]
    container.innerHTML = state.drugs.map(d => {
        const mfrBadge = d.manufacturerName ? `<span class="badge-manufacturer">[ ${escapeHtml(d.manufacturerName)} ]</span>` : ''
        const catBadge = d.catalogItemId ? '<span class="badge-catalog">КАТАЛОГ</span>' : ''
        return `
        <div class="drug-card">
            <div class="drug-info">
                <h4>${escapeHtml(d.name)}</h4>
                <p>${escapeHtml(d.dosage)} • ${escapeHtml(d.amount)} • ${escapeHtml(d.schedule)}</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                ${drugTypeBadge(d.type)}
                ${mfrBadge}
                ${catBadge}
                <button class="btn btn-secondary btn-small" onclick="editDrug('${d.id}')">[ РЕД ]</button>
                <button class="btn btn-danger btn-small" onclick="deleteDrug('${d.id}')">[ X ]</button>
            </div>
        </div>`
    }).join('')
}

/**
 * Рендерит лог приёмов препаратов текущего курса.
 * Каждая запись содержит дату, название препарата, дозу, заметку и кнопки редактирования/удаления.
 */
export function renderIntakeLogs() {
    const container = document.getElementById('intake-log')
    if (!container) return

    if (state.intakeLogs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет записей</p></div>'
        return
    }
    // ── Запись лога приёма ──────────────────────────
    // [Дата] [Название препарата] [Партия покупки]
    // [Доза] • [Заметка]
    // Кнопки: [Редактировать] [Удалить]
    container.innerHTML = state.intakeLogs.map(l => {
        const purchaseBadge = l.purchaseLabel
            ? `<span class="badge-purchase">[${escapeHtml(l.purchaseLabel)}]</span>`
            : ''
        return `
        <div class="log-entry">
            <div class="log-date">${formatDate(l.date)}</div>
            <div class="log-content">
                <div class="log-drug">${escapeHtml(l.drugName)} ${purchaseBadge}</div>
                <div class="log-dose">${escapeHtml(l.dose)} ${l.note ? '• ' + escapeHtml(l.note) : ''}</div>
            </div>
            <button class="btn btn-secondary btn-small" onclick="editLog('${l.id}')">[ РЕД ]</button>
            <button class="btn btn-danger btn-small" onclick="deleteLog('${l.id}')">✕</button>
        </div>`
    }).join('')
}

/**
 * Обновляет select препаратов в форме логирования приёма.
 * Заполняет опции из state.drugs.
 */
export function updateLogDrugSelect() {
    const select = document.getElementById('log-drug')
    if (!select) return
    select.innerHTML = state.drugs.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')
}

// Экспортируем в window для использования в HTML
window.saveCourse = saveCourse
window.editCourse = editCourse
window.renderDrugs = renderDrugs
window.renderIntakeLogs = renderIntakeLogs
window.updateLogDrugSelect = updateLogDrugSelect
