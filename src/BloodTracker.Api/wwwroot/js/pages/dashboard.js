import { state } from '../state.js'
import { api, statsApi } from '../api.js'
import { formatDate, getStatusClass } from '../utils.js'
import { generateAsciiDonut } from '../components/asciiDonut.js'

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

// Load and render dashboard donut chart (all drugs combined)
export async function loadDashboardDonut() {
    const chartEl = document.getElementById('dashboard-donut-chart');
    if (!chartEl) return;

    try {
        const inventory = await statsApi.getInventory();

        if (!inventory || inventory.items.length === 0) {
            chartEl.innerHTML = `<div class="ascii-donut-container">
                <pre class="ascii-donut">
      ╭─────────────╮
     ╱ ░░░░░░░░░░░░░ ╲
    │ ░░░       ░░░ │
   │ ░░    <span class="donut-percent">--</span>    ░░ │
    │ ░░░       ░░░ │
     ╲ ░░░░░░░░░░░░░ ╱
      ╰─────────────╯
   <span class="donut-empty">НЕТ ДАННЫХ</span>
                </pre>
            </div>`;
            return;
        }

        // Sum up all drugs
        let totalConsumed = 0;
        let totalRemaining = 0;

        inventory.items.forEach(item => {
            totalConsumed += item.totalConsumed;
            totalRemaining += item.currentStock > 0 ? item.currentStock : 0;
        });

        renderDashboardDonut(totalConsumed, totalRemaining);
    } catch (error) {
        console.error('Failed to load dashboard donut:', error);
        chartEl.innerHTML = '<div class="empty-state"><p>Ошибка загрузки</p></div>';
    }
}

// Render dashboard ASCII donut chart
function renderDashboardDonut(consumed, remaining) {
    const chartEl = document.getElementById('dashboard-donut-chart');
    if (!chartEl) return;

    // Use large ASCII donut for dashboard
    const donutHtml = generateAsciiDonut(consumed, remaining, { size: 'large', showLegend: true });

    chartEl.innerHTML = `<div class="dashboard-ascii-donut ascii-donut-container-large">${donutHtml}</div>`;
}

// Экспортируем в window для использования в HTML
window.loadAlerts = loadAlerts
window.renderDashboardDrugs = renderDashboardDrugs
window.loadDashboardDonut = loadDashboardDonut

