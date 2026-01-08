import { state } from '../state.js'
import { api } from '../api.js'
import { formatDateForInput, formatDate } from '../utils.js'

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
    if (!data.title) { alert('Введите название'); return }
    
    try {
        if (state.editingCourseId) {
            await api(`/courses/${state.editingCourseId}`, { method: 'PUT', body: JSON.stringify(data) })
            state.editingCourseId = null
        } else {
            await api('/courses', { method: 'POST', body: JSON.stringify(data) })
        }
        const { loadDashboard } = await import('../main.js')
        await loadDashboard()
        alert('[ КУРС СОХРАНЁН ]')
    } catch (e) {
        alert('Ошибка: ' + e.message)
    }
}

export async function editCourse() {
    if (!state.currentCourse) {
        const course = await api('/courses/active')
        if (!course) { alert('[ НЕТ АКТИВНОГО КУРСА ]'); return }
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

export function renderDrugs() {
    const container = document.getElementById('drugs-list')
    if (!container) return
    
    if (state.drugs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет препаратов</p></div>'
        return
    }
    container.innerHTML = state.drugs.map(d => `
        <div class="drug-card">
            <div class="drug-info">
                <h4>${d.name}</h4>
                <p>${d.dosage || ''} • ${d.amount || ''} • ${d.schedule || ''}</p>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
                <span class="drug-badge ${d.type === 0 ? 'badge-oral' : 'badge-inject'}">
                    ${d.type === 0 ? '[ ОРАЛЬНЫЙ ]' : '[ ИНЪЕКЦИЯ ]'}
                </span>
                <button class="btn btn-secondary btn-small" onclick="editDrug('${d.id}')">[ РЕД ]</button>
                <button class="btn btn-danger btn-small" onclick="deleteDrug('${d.id}')">[ X ]</button>
            </div>
        </div>
    `).join('')
}

export function renderIntakeLogs() {
    const container = document.getElementById('intake-log')
    if (!container) return
    
    if (state.intakeLogs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет записей</p></div>'
        return
    }
    container.innerHTML = state.intakeLogs.map(l => `
        <div class="log-entry">
            <div class="log-date">${formatDate(l.date)}</div>
            <div class="log-content">
                <div class="log-drug">${l.drugName}</div>
                <div class="log-dose">${l.dose || ''} ${l.note ? '• ' + l.note : ''}</div>
            </div>
            <button class="btn btn-danger btn-small" onclick="deleteLog('${l.id}')">✕</button>
        </div>
    `).join('')
}

export function updateLogDrugSelect() {
    const select = document.getElementById('log-drug')
    if (!select) return
    select.innerHTML = state.drugs.map(d => `<option value="${d.id}">${d.name}</option>`).join('')
}

// Экспортируем в window для использования в HTML
window.saveCourse = saveCourse
window.editCourse = editCourse
window.renderDrugs = renderDrugs
window.renderIntakeLogs = renderIntakeLogs
window.updateLogDrugSelect = updateLogDrugSelect

