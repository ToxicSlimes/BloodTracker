import { state } from '../state.js'
import { api } from '../api.js'
import { formatDateForInput } from '../utils.js'

export function openDrugModal(drugId = null) {
    state.editingDrugId = drugId
    const titleEl = document.getElementById('drug-modal-title')
    const modal = document.getElementById('drug-modal')
    if (!titleEl || !modal) return
    
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
            if (typeEl) typeEl.value = drug.type || 0
            if (dosageEl) dosageEl.value = drug.dosage || ''
            if (amountEl) amountEl.value = drug.amount || ''
            if (scheduleEl) scheduleEl.value = drug.schedule || ''
            if (notesEl) notesEl.value = drug.notes || ''
        }
    } else {
        titleEl.textContent = '[ ДОБАВИТЬ ПРЕПАРАТ ]'
    }
    modal.classList.add('active')
}

export function closeDrugModal() {
    const modal = document.getElementById('drug-modal')
    if (!modal) return
    modal.classList.remove('active')
    state.editingDrugId = null
    
    const nameEl = document.getElementById('drug-name')
    const typeEl = document.getElementById('drug-type')
    const dosageEl = document.getElementById('drug-dosage')
    const amountEl = document.getElementById('drug-amount')
    const scheduleEl = document.getElementById('drug-schedule')
    const notesEl = document.getElementById('drug-notes')
    
    if (nameEl) nameEl.value = ''
    if (typeEl) typeEl.value = '0'
    if (dosageEl) dosageEl.value = ''
    if (amountEl) amountEl.value = ''
    if (scheduleEl) scheduleEl.value = ''
    if (notesEl) notesEl.value = ''
}

export async function saveDrug() {
    const nameEl = document.getElementById('drug-name')
    const typeEl = document.getElementById('drug-type')
    const dosageEl = document.getElementById('drug-dosage')
    const amountEl = document.getElementById('drug-amount')
    const scheduleEl = document.getElementById('drug-schedule')
    const notesEl = document.getElementById('drug-notes')
    
    if (!nameEl || !typeEl) return
    
    const data = {
        name: nameEl.value,
        type: parseInt(typeEl.value),
        dosage: dosageEl?.value || '',
        amount: amountEl?.value || '',
        schedule: scheduleEl?.value || '',
        notes: notesEl?.value || '',
        courseId: state.currentCourse?.id || null
    }
    if (!data.name) { alert('Введите название'); return }
    
    try {
        if (state.editingDrugId) {
            await api(`/drugs/${state.editingDrugId}`, { method: 'PUT', body: JSON.stringify(data) })
            state.editingDrugId = null
        } else {
            await api('/drugs', { method: 'POST', body: JSON.stringify(data) })
        }
        closeDrugModal()
        const { loadDrugs, loadDashboard } = await import('../main.js')
        await loadDrugs()
        await loadDashboard()
    } catch (e) {
        alert('Ошибка: ' + e.message)
    }
}

export async function deleteDrug(id) {
        if (!confirm('[ УДАЛИТЬ ПРЕПАРАТ? ]')) return
    try {
        await api(`/drugs/${id}`, { method: 'DELETE' })
        const { loadDrugs, loadDashboard } = await import('../main.js')
        await loadDrugs()
        await loadDashboard()
    } catch (e) {
        alert('Ошибка: ' + e.message)
    }
}

export function openLogModal(logId = null) {
    if (state.drugs.length === 0) { alert('Сначала добавьте препараты'); return }
    state.editingLogId = logId
    const titleEl = document.getElementById('log-modal-title')
    const modal = document.getElementById('log-modal')
    if (!titleEl || !modal) return
    
    if (logId) {
        titleEl.textContent = '[ РЕДАКТИРОВАТЬ ЗАПИСЬ ]'
        const log = state.intakeLogs.find(l => l.id === logId)
        if (log) {
            const dateEl = document.getElementById('log-date')
            const drugEl = document.getElementById('log-drug')
            const doseEl = document.getElementById('log-dose')
            const noteEl = document.getElementById('log-note')
            
            if (dateEl) dateEl.value = formatDateForInput(log.date)
            if (drugEl) drugEl.value = log.drugId
            if (doseEl) doseEl.value = log.dose || ''
            if (noteEl) noteEl.value = log.note || ''
        }
    } else {
        titleEl.textContent = '[ ДОБАВИТЬ ЗАПИСЬ ]'
        const dateEl = document.getElementById('log-date')
        const drugEl = document.getElementById('log-drug')
        const doseEl = document.getElementById('log-dose')
        const noteEl = document.getElementById('log-note')
        
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0]
        if (drugEl) drugEl.value = ''
        if (doseEl) doseEl.value = ''
        if (noteEl) noteEl.value = ''
    }
    modal.classList.add('active')
}

export function closeLogModal() {
    const modal = document.getElementById('log-modal')
    if (!modal) return
    modal.classList.remove('active')
    state.editingLogId = null
}

export async function saveLog() {
    const dateEl = document.getElementById('log-date')
    const drugEl = document.getElementById('log-drug')
    const doseEl = document.getElementById('log-dose')
    const noteEl = document.getElementById('log-note')
    
    if (!dateEl || !drugEl) return
    
    const data = {
        date: dateEl.value,
        drugId: drugEl.value,
        dose: doseEl?.value || '',
        note: noteEl?.value || ''
    }
    
    try {
        if (state.editingLogId) {
            await api(`/intakelogs/${state.editingLogId}`, { method: 'PUT', body: JSON.stringify(data) })
            state.editingLogId = null
        } else {
            await api('/intakelogs', { method: 'POST', body: JSON.stringify(data) })
        }
        closeLogModal()
        const { loadIntakeLogs } = await import('../main.js')
        await loadIntakeLogs()
    } catch (e) {
        alert('Ошибка: ' + e.message)
    }
}

export async function deleteLog(id) {
    try {
        await api(`/intakelogs/${id}`, { method: 'DELETE' })
        const { loadIntakeLogs } = await import('../main.js')
        await loadIntakeLogs()
    } catch (e) {
        alert('Ошибка: ' + e.message)
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

