// ═══════════════════════════════════════════════════════════════════════════════
// COMPARE PAGE - Analysis comparison
// ═══════════════════════════════════════════════════════════════════════════════

import { state } from '../state.js'
import { api } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { getStatusClass, escapeHtml } from '../utils.js'
import { toast } from '../components/toast.js'

/**
 * Сравнивает два выбранных анализа и рендерит таблицу различий.
 * Берёт ID из селектов compare-before и compare-after, делает GET /analyses/compare.
 * Показывает для каждого параметра: значение до, после, дельту в процентах и статус-индикаторы.
 * @returns {Promise<void>}
 */
export async function compareAnalyses() {
    const beforeId = document.getElementById('compare-before').value
    const afterId = document.getElementById('compare-after').value
    if (!beforeId || !afterId) return

    try {
        const data = await api(ENDPOINTS.analyses.compare(beforeId, afterId))

        // ── Таблица сравнения анализов ──────────────────────────
        // [Показатель] [Значение "до" + статус] [Значение "после" + статус] [Дельта %]
        // Для каждого параметра — цветовой индикатор и tooltip с описанием
        let html = `<div class="table-responsive"><table><thead><tr>
            <th>Показатель</th>
            <th>${escapeHtml(data.before.label)}</th>
            <th>${escapeHtml(data.after.label)}</th>
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

        html += '</tbody></table></div>'
        document.getElementById('compare-content').innerHTML = html
    } catch (e) {
        toast.error('Ошибка: ' + e.message)
    }
}

// Export to window
window.compareAnalyses = compareAnalyses
