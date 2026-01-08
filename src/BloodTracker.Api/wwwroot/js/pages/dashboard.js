import { state } from '../state.js'
import { api } from '../api.js'
import { formatDate, getStatusClass } from '../utils.js'

export async function loadAlerts() {
    const container = document.getElementById('dashboard-alerts')
    if (!container) return
    
    if (state.analyses.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Добавьте анализы</p></div>'
        return
    }
    
    try {
        const alerts = await api(`/analyses/${state.analyses[0].id}/alerts`)
        if (alerts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>[ ВСЕ ПОКАЗАТЕЛИ В НОРМЕ ]</p></div>'
        } else {
            container.innerHTML = alerts.map(a => `
                <div class="drug-card">
                    <div class="drug-info">
                        <h4><span class="indicator ind-${getStatusClass(a.status)}"></span>${a.name}</h4>
                        <p>${a.value} ${a.unit} (норма: ${a.refMin}-${a.refMax})</p>
                    </div>
                </div>
            `).join('')
        }
    } catch (e) {
        console.error('Failed to load alerts:', e)
    }
}

export function renderDashboardDrugs() {
    const container = document.getElementById('dashboard-drugs')
    if (!container) return
    
    if (state.drugs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет препаратов</p></div>'
        return
    }
    container.innerHTML = state.drugs.map(d => `
        <div class="drug-card">
            <div class="drug-info">
                <h4>${d.name}</h4>
                <p>${d.dosage || ''} • ${d.schedule || ''}</p>
            </div>
            <span class="drug-badge ${d.type === 0 ? 'badge-oral' : 'badge-inject'}">
                ${d.type === 0 ? '[ ОРАЛЬНЫЙ ]' : '[ ИНЪЕКЦИЯ ]'}
            </span>
        </div>
    `).join('')
}

// Экспортируем в window для использования в HTML
window.loadAlerts = loadAlerts
window.renderDashboardDrugs = renderDashboardDrugs

