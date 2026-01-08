// ═══════════════════════════════════════════════════════════════════════════════
// COMPARE PAGE - Analysis comparison
// ═══════════════════════════════════════════════════════════════════════════════

import { state } from '../state.js'
import { api } from '../api.js'
import { getStatusClass } from '../utils.js'

export async function compareAnalyses() {
    const beforeId = document.getElementById('compare-before').value
    const afterId = document.getElementById('compare-after').value
    if (!beforeId || !afterId) return

    try {
        const data = await api(`/analyses/compare?beforeId=${beforeId}&afterId=${afterId}`)

        let html = `<table><thead><tr>
            <th>Показатель</th>
            <th>${data.before.label}</th>
            <th>${data.after.label}</th>
            <th>Изменение</th>
        </tr></thead><tbody>`

        for (const c of data.comparisons) {
            let deltaHtml = '—'
            if (c.deltaPercent !== null) {
                const cls = c.deltaPercent > 0 ? 'delta-up' : c.deltaPercent < 0 ? 'delta-down' : 'delta-same'
                const sign = c.deltaPercent > 0 ? '↑ +' : c.deltaPercent < 0 ? '↓ ' : '= '
                deltaHtml = `<span class="delta ${cls}">${sign}${c.deltaPercent.toFixed(1)}%</span>`
            }

            const ref = state.referenceRanges[c.key]
            const description = ref?.description || ''

            html += `<tr>
                <td>
                    ${description ? `<span class="parameter-name">
                        ${c.name}
                        <div class="tooltip">
                            <div class="tooltip-title">${c.name}</div>
                            <div class="tooltip-description">${description}</div>
                        </div>
                    </span>` : c.name}
                </td>
                <td><span class="indicator ind-${getStatusClass(c.beforeStatus)}"></span>${c.beforeValue ?? '—'}</td>
                <td><span class="indicator ind-${getStatusClass(c.afterStatus)}"></span>${c.afterValue ?? '—'}</td>
                <td>${deltaHtml}</td>
            </tr>`
        }

        html += '</tbody></table>'
        document.getElementById('compare-content').innerHTML = html
    } catch (e) {
        alert('Ошибка: ' + e.message)
    }
}

// Export to window
window.compareAnalyses = compareAnalyses

