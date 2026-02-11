// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSES PAGE - Display, CRUD, PDF Import
// ═══════════════════════════════════════════════════════════════════════════════

import { state } from '../state.js'
import { api, API_URL } from '../api.js'
import { formatDateForInput, formatDate, getStatus, getStatusClass, getStatusText } from '../utils.js'
import { renderAsciiSkull } from '../effects/ascii-art.js'
import { toast } from '../components/toast.js'

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRA ROWS (dynamic fields)
// ═══════════════════════════════════════════════════════════════════════════════

function renderExtraRows() {
    const container = document.getElementById('extra-rows')
    if (state.extraRows.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет дополнительных показателей</p></div>'
        return
    }
    const options = Object.values(state.referenceRanges)
        .map(r => `<option value="${r.key}">${r.name} (${r.unit})</option>`)
        .join('')
    container.innerHTML = state.extraRows.map(row => `
        <div class="form-row" data-row="${row.id}" style="align-items:center; gap:10px; margin-bottom:8px;">
            <div class="form-group" style="flex:2; min-width:220px;">
                <label>Показатель</label>
                <select onchange="changeExtraKey('${row.id}', this.value)">
                    <option value="">Выберите...</option>
                    ${options}
                </select>
            </div>
            <div class="form-group" style="flex:1;">
                <label>Значение</label>
                <input type="number" step="0.0001" value="${row.value ?? ''}" onchange="changeExtraValue('${row.id}', this.value)">
            </div>
            <button class="btn btn-danger btn-small" onclick="removeExtraRow('${row.id}')" style="margin-top:22px;">[ X ]</button>
        </div>
    `).join('')
    state.extraRows.forEach(row => {
        const rowEl = container.querySelector(`[data-row="${row.id}"] select`)
        if (rowEl) rowEl.value = row.key || ''
    })
}

export function addExtraRow() {
    const id = crypto.randomUUID()
    state.extraRows.push({ id, key: '', value: null })
    renderExtraRows()
}

export function removeExtraRow(id) {
    state.extraRows = state.extraRows.filter(r => r.id !== id)
    renderExtraRows()
}

export function changeExtraKey(id, key) {
    const row = state.extraRows.find(r => r.id === id)
    if (!row) return
    row.key = key
}

export function changeExtraValue(id, value) {
    const row = state.extraRows.find(r => r.id === id)
    if (!row) return
    row.value = value === '' ? null : parseFloat(value)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════════════════════

export function openAnalysisModal(analysisId = null) {
    state.editingAnalysisId = analysisId
    const titleEl = document.getElementById('analysis-modal-title')
    const dateEl = document.getElementById('analysis-date')
    const labelEl = document.getElementById('analysis-label')
    const labEl = document.getElementById('analysis-lab')
    const keys = ['testosterone', 'free-testosterone', 'lh', 'fsh', 'prolactin', 'estradiol', 'shbg', 'tsh',
        'cholesterol', 'hdl', 'ldl', 'triglycerides', 'atherogenic',
        'alt', 'ast', 'ggt', 'bilirubin', 'hemoglobin', 'hematocrit', 'glucose', 'vitd']

    if (analysisId) {
        titleEl.textContent = '[ РЕДАКТИРОВАТЬ АНАЛИЗ ]'
        const analysis = state.analyses.find(a => a.id === analysisId)
        if (analysis) {
            dateEl.value = formatDateForInput(analysis.date)
            labelEl.value = analysis.label || ''
            labEl.value = analysis.laboratory || ''
            keys.forEach(key => {
                const input = document.getElementById('val-' + key)
                if (!input) return
                const value = analysis.values && Object.prototype.hasOwnProperty.call(analysis.values, key)
                    ? analysis.values[key]
                    : null
                input.value = value != null ? value : ''
            })
            state.extraRows = Object.entries(analysis.values || {})
                .filter(([k]) => !state.staticAnalysisKeys.includes(k))
                .map(([k, v]) => ({ id: crypto.randomUUID(), key: k, value: v }))
        }
    } else {
        titleEl.textContent = '[ ДОБАВИТЬ АНАЛИЗ ]'
        dateEl.value = new Date().toISOString().split('T')[0]
        labelEl.value = ''
        labEl.value = ''
        keys.forEach(key => {
            const input = document.getElementById('val-' + key)
            if (input) input.value = ''
        })
        state.extraRows = []
    }

    document.getElementById('analysis-modal').classList.add('active')
    document.body.classList.add('modal-open')
    renderExtraRows()
    initTabs()
}

function initTabs() {
    const tabs = document.querySelectorAll('#analysis-modal .tab')
    const tabContents = document.querySelectorAll('#analysis-modal .tab-content')
    
    tabs.forEach(tab => {
        tab.removeEventListener('click', handleTabClick)
        tab.addEventListener('click', handleTabClick)
    })
}

function handleTabClick(event) {
    const tab = event.currentTarget
    const targetTab = tab.getAttribute('data-tab')
    const tabs = document.querySelectorAll('#analysis-modal .tab')
    const tabContents = document.querySelectorAll('#analysis-modal .tab-content')
    
    tabs.forEach(t => t.classList.remove('active'))
    tabContents.forEach(content => content.classList.remove('active'))
    
    tab.classList.add('active')
    const targetContent = document.getElementById(`tab-${targetTab}`)
    if (targetContent) {
        targetContent.classList.add('active')
    }
}

export function closeAnalysisModal() {
    document.getElementById('analysis-modal').classList.remove('active')
    document.body.classList.remove('modal-open')
    state.editingAnalysisId = null
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function openPdfImportModal() {
    document.getElementById('pdf-file').value = ''
    document.getElementById('pdf-label').value = ''
    document.getElementById('pdf-import-status').style.display = 'none'
    document.getElementById('pdf-import-btn').disabled = false
    document.getElementById('pdf-import-modal').classList.add('active')
    document.body.classList.add('modal-open')
}

export function closePdfImportModal() {
    document.getElementById('pdf-import-modal').classList.remove('active')
    document.body.classList.remove('modal-open')
}

export async function importPdf() {
    const fileInput = document.getElementById('pdf-file')
    const label = document.getElementById('pdf-label').value
    const statusDiv = document.getElementById('pdf-import-status')
    const importBtn = document.getElementById('pdf-import-btn')

    if (!fileInput.files || fileInput.files.length === 0) {
        toast.warning('Выберите PDF файл')
        return
    }

    const file = fileInput.files[0]
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast.warning('Требуется PDF файл')
        return
    }

    importBtn.disabled = true
    importBtn.textContent = '⏳ Обработка...'
    statusDiv.style.display = 'block'
    statusDiv.style.background = 'var(--bg-tertiary)'
    statusDiv.innerHTML = '<div style="color: var(--text-secondary)">Анализируем PDF файл...</div>'

    const formData = new FormData()
    formData.append('file', file)
    if (label) formData.append('label', label)

    try {
        const token = localStorage.getItem('bt_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/api/analyses/import-pdf`, {
            method: 'POST',
            headers,
            body: formData
        })

        const result = await response.json()

        if (result.success) {
            statusDiv.style.background = 'rgba(63, 185, 80, 0.1)'
            statusDiv.innerHTML = `
                <div style="color: var(--primary-color); font-weight: 600; margin-bottom: 10px;">[ ИМПОРТ УСПЕШЕН ]</div>
                <div style="color: var(--text-secondary); font-size: 13px;">
                    <p>[ ДАТА ]: ${formatDate(result.detectedDate)}</p>
                    <p>[ ЛАБОРАТОРИЯ ]: ${result.detectedLaboratory || 'Не определена'}</p>
                    <p>[ РАСПОЗНАНО ПОКАЗАТЕЛЕЙ ]: <strong>${result.parsedValuesCount}</strong></p>
                    ${result.unrecognizedItems?.length > 0 ? `<p style="margin-top: 10px; color: var(--yellow);">[ ! ] НЕ РАСПОЗНАНО СТРОК: ${result.unrecognizedItems.length}</p>` : ''}
                </div>
            `

            setTimeout(async () => {
                closePdfImportModal()
                await window.loadAnalyses()
                await window.loadDashboard()

                if (result.analysis) {
                    document.getElementById('analysis-select').value = result.analysis.id
                    displayAnalysis()
                }
            }, 2000)
        } else {
            statusDiv.style.background = 'rgba(248, 81, 73, 0.1)'
            statusDiv.innerHTML = `
                <div style="color: var(--red); font-weight: 600; margin-bottom: 10px;">[ ОШИБКА ИМПОРТА ]</div>
                <div style="color: var(--text-secondary); font-size: 13px;">
                    <p>${result.errorMessage || 'Неизвестная ошибка'}</p>
                    ${result.unrecognizedItems?.length > 0 ? `
                        <details style="margin-top: 10px;">
                            <summary style="cursor: pointer; color: var(--accent);">Нераспознанные строки (${result.unrecognizedItems.length})</summary>
                            <ul style="margin-top: 5px; padding-left: 20px; font-size: 12px;">
                                ${result.unrecognizedItems.slice(0, 10).map(i => `<li>${i}</li>`).join('')}
                                ${result.unrecognizedItems.length > 10 ? `<li>...и ещё ${result.unrecognizedItems.length - 10}</li>` : ''}
                            </ul>
                        </details>
                    ` : ''}
                </div>
            `
            importBtn.disabled = false
            importBtn.textContent = '[ ИМПОРТИРОВАТЬ ]'
        }
    } catch (e) {
        statusDiv.style.background = 'rgba(248, 81, 73, 0.1)'
        statusDiv.innerHTML = `<div style="color: var(--red);">[ ОШИБКА ]: ${e.message}</div>`
        importBtn.disabled = false
        importBtn.textContent = '📥 Импортировать'
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export function editCurrentAnalysis() {
    const id = document.getElementById('analysis-select').value
    if (!id) return
    openAnalysisModal(id)
}

export async function saveAnalysis() {
    const values = {}
    const keys = ['testosterone', 'free-testosterone', 'lh', 'fsh', 'prolactin', 'estradiol', 'shbg', 'tsh',
        'cholesterol', 'hdl', 'ldl', 'triglycerides', 'atherogenic',
        'alt', 'ast', 'ggt', 'bilirubin', 'hemoglobin', 'hematocrit', 'glucose', 'vitd']

    keys.forEach(key => {
        const input = document.getElementById('val-' + key)
        if (input && input.value) values[key] = parseFloat(input.value)
    })

    state.extraRows.forEach(r => {
        if (!r.key || r.value == null || Number.isNaN(r.value)) return
        values[r.key] = r.value
    })

    const data = {
        date: document.getElementById('analysis-date').value,
        label: document.getElementById('analysis-label').value,
        laboratory: document.getElementById('analysis-lab').value,
        values: values
    }

    if (!data.date || !data.label) { toast.warning('Заполните дату и метку'); return }

    try {
        if (state.editingAnalysisId) {
            const id = state.editingAnalysisId
            data.id = id
            await api(`/analyses/${id}`, { method: 'PUT', body: JSON.stringify(data) })
            state.editingAnalysisId = null
            closeAnalysisModal()
            await window.loadAnalyses()
            await window.loadDashboard()
            document.getElementById('analysis-select').value = id
            displayAnalysis()
            toast.success('Анализ обновлён')
        } else {
            await api('/analyses', { method: 'POST', body: JSON.stringify(data) })
            closeAnalysisModal()
            await window.loadAnalyses()
            await window.loadDashboard()
            toast.success('Анализ сохранён')
        }
    } catch (e) {
        toast.error('Ошибка: ' + e.message)
    }
}

export async function deleteCurrentAnalysis() {
    const id = document.getElementById('analysis-select').value
    if (!id) return
    if (!confirm('[ УДАЛИТЬ АНАЛИЗ? ]')) return

    try {
        await api(`/analyses/${id}`, { method: 'DELETE' })
        await window.loadAnalyses()
        await window.loadDashboard()
        document.getElementById('analysis-content').innerHTML = '<div class="empty-state"><h3>Выберите анализ</h3></div>'
    } catch (e) {
        toast.error('Ошибка: ' + e.message)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

export async function displayAnalysis() {
    const id = document.getElementById('analysis-select').value
    if (!id) return

    const analysis = state.analyses.find(a => a.id === id)
    if (!analysis) return

    const container = document.getElementById('analysis-content')
    const items = Object.entries(analysis.values)
        .map(([key, value]) => {
            const ref = state.referenceRanges[key]
            if (!ref) return null
            return { key, value, ref, status: getStatus(value, ref) }
        })
        .filter(Boolean)

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">' + renderAsciiSkull() + '<h3>Нет данных</h3></div>'
        return
    }

    const order = ['Гормоны', 'Липиды', 'Печень', 'Коагуляция', 'Общие']
    const groups = {}
    items.forEach(i => {
        const cat = i.ref.category || 'Прочие'
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(i)
    })

    const sortedCategories = Object.keys(groups).sort((a, b) => {
        const ia = order.indexOf(a)
        const ib = order.indexOf(b)
        const oa = ia === -1 ? 99 : ia
        const ob = ib === -1 ? 99 : ib
        if (oa !== ob) return oa - ob
        return a.localeCompare(b)
    })

    let html = `<div class="table-responsive"><table><thead><tr><th>Показатель</th><th>Результат</th><th>Референс</th><th>Статус</th></tr></thead><tbody>`

    sortedCategories.forEach(cat => {
        html += `<tr><td colspan="4" style="background:var(--bg-tertiary); font-weight:600;">${cat}</td></tr>`
        groups[cat]
            .sort((a, b) => a.ref.name.localeCompare(b.ref.name))
            .forEach(({ key, value, ref, status }) => {
                const description = ref.description || ''
                const refText = ref.max === 999 ? `>${ref.min}` : (ref.min === 0 && ref.max < 10 ? `<${ref.max}` : `${ref.min} - ${ref.max}`)
                const tooltipHtml = description ? `<div class="tooltip">
                                <div class="tooltip-title">${ref.name}</div>
                                <div class="tooltip-description">${description}</div>
                            </div>` : ''
                html += `<tr data-param-key="${key}">
                    <td>
                        <span class="parameter-name">
                            ${ref.name}
                            ${tooltipHtml}
                        </span>
                    </td>
                    <td><span class="indicator ind-${getStatusClass(status)}"></span><strong>${value}</strong> ${ref.unit}</td>
                    <td style="color:var(--text-secondary)">${refText} ${ref.unit}</td>
                    <td class="status-${getStatusClass(status)}">${getStatusText(status)}</td>
                </tr>`
            })
    })

    html += '</tbody></table></div>'
    container.innerHTML = html
    renderProteinGraph(analysis)

    // Add mini-graph tooltips
    setTimeout(() => {
        container.querySelectorAll('tr[data-param-key]').forEach(row => {
            const key = row.getAttribute('data-param-key')
            if (!key) return
            const ref = state.referenceRanges[key]
            if (!ref) return
            const value = analysis.values[key]
            if (value == null || Number.isNaN(value)) return
            const td = row.querySelector('td:nth-child(2)')
            if (!td) return

            const refMin = ref.min
            const refMax = ref.max === 999 ? value * 1.5 : ref.max

            td.style.position = 'relative'
            td.style.cursor = 'pointer'
            const miniGraph = document.createElement('div')
            miniGraph.className = 'mini-graph-tooltip'
            miniGraph.style.display = 'none'
            td.appendChild(miniGraph)

            td.addEventListener('mouseenter', () => {
                const graphWidth = 260
                const graphHeight = 140
                const paddingTop = 25
                const paddingBottom = 25
                const paddingLeft = 18
                const paddingRight = 18
                const innerW = graphWidth - paddingLeft - paddingRight
                const innerH = graphHeight - paddingTop - paddingBottom

                let minVal = refMin
                let maxVal = refMax === 999 ? value * 1.5 : refMax

                if (value < refMin) {
                    const margin = (refMax - refMin) * 0.2
                    minVal = Math.max(0, value - margin)
                }
                if (value > refMax) {
                    const margin = (refMax - refMin) * 0.2
                    maxVal = value + margin
                }

                const valRange = maxVal - minVal

                const x1 = paddingLeft
                const x2 = paddingLeft + innerW / 2
                const x3 = paddingLeft + innerW

                const baseY = graphHeight - paddingBottom
                const y1 = baseY - ((refMin - minVal) / valRange) * innerH
                const y2 = baseY - ((value - minVal) / valRange) * innerH
                const y3 = baseY - ((refMax - minVal) / valRange) * innerH

                const status = getStatus(value, ref)
                const statusColor = status === 0 ? 'var(--green)' : status === 1 ? 'var(--blue)' : status === 2 ? 'var(--yellow)' : 'var(--red)'
                const mainColor = status === 0 ? 'var(--primary-color)' : statusColor

                const graphPath = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`
                const pathLength = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1)) + Math.sqrt((x3-x2)*(x3-x2) + (y3-y2)*(y3-y2))
                const glowLength = pathLength * 0.25

                let valTextY
                const offsetUp = 20
                const offsetDown = 26
                if (y2 < paddingTop + innerH / 2) {
                    valTextY = y2 + offsetDown
                } else {
                    valTextY = y2 - offsetUp
                }
                if (valTextY < paddingTop + 10) {
                    valTextY = paddingTop + 10
                } else if (valTextY > graphHeight - paddingBottom - 8) {
                    valTextY = graphHeight - paddingBottom - 8
                }

                const gradientId = 'mini-grad-' + Date.now()
                miniGraph.innerHTML = `
                    <svg width="${graphWidth}" height="${graphHeight}" viewBox="0 0 ${graphWidth} ${graphHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="${mainColor}" stop-opacity="0" />
                                <stop offset="25%" stop-color="${mainColor}" stop-opacity="0.1" />
                                <stop offset="40%" stop-color="${mainColor}" stop-opacity="0.5" />
                                <stop offset="50%" stop-color="${mainColor}" stop-opacity="1" />
                                <stop offset="60%" stop-color="${mainColor}" stop-opacity="0.5" />
                                <stop offset="75%" stop-color="${mainColor}" stop-opacity="0.1" />
                                <stop offset="100%" stop-color="${mainColor}" stop-opacity="0" />
                            </linearGradient>
                            <filter id="mini-glow-${gradientId}">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                            ${status >= 2 ? `<filter id="glitch-${gradientId}" x="-50%" y="-50%" width="200%" height="200%">
                                <feOffset in="SourceGraphic" dx="0" dy="0" result="offset1">
                                    <animate attributeName="dx" values="0;-2;2;-2;0" dur="0.1s" repeatCount="indefinite"/>
                                </feOffset>
                                <feOffset in="SourceGraphic" dx="0" dy="0" result="offset2">
                                    <animate attributeName="dx" values="0;2;-2;2;0" dur="0.15s" repeatCount="indefinite"/>
                                </feOffset>
                                <feComponentTransfer in="offset1" result="red">
                                    <feFuncR type="discrete" tableValues="1 0 1 0"/>
                                </feComponentTransfer>
                                <feComponentTransfer in="offset2" result="cyan">
                                    <feFuncG type="discrete" tableValues="0 1 0 1"/>
                                    <feFuncB type="discrete" tableValues="1 0 1 0"/>
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode in="red"/>
                                    <feMergeNode in="cyan"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>` : ''}
                        </defs>
                        <rect x="0" y="0" width="${graphWidth}" height="${graphHeight}" fill="var(--bg-secondary)" stroke="var(--border)" stroke-width="1" rx="4"/>
                        <line x1="${paddingLeft}" y1="${baseY}" x2="${paddingLeft + innerW}" y2="${baseY}" stroke="var(--border)" stroke-width="1" opacity="0.5"/>
                        <path d="${graphPath}" fill="none" stroke="${mainColor}" stroke-width="2" opacity="0.25"/>
                        <path d="${graphPath}" fill="none" stroke="url(#${gradientId})" stroke-width="3" filter="${status >= 2 ? `url(#glitch-${gradientId})` : `url(#mini-glow-${gradientId})`}" stroke-dasharray="${glowLength} ${pathLength}" stroke-dashoffset="0">
                            <animate attributeName="stroke-dashoffset" values="0;${pathLength + glowLength}" dur="3s" repeatCount="indefinite"/>
                            ${status >= 2 ? `<animate attributeName="stroke-width" values="3;4;3;5;3" dur="0.2s" repeatCount="indefinite"/>` : ''}
                        </path>
                        <circle cx="${x1}" cy="${y1}" r="5" fill="var(--text-secondary)" opacity="0.8"/>
                        <circle cx="${x2}" cy="${y2}" r="7" fill="${statusColor}" filter="url(#mini-glow-${gradientId})">
                            <animate attributeName="r" values="7;9;7" dur="1.5s" repeatCount="indefinite"/>
                        </circle>
                        <circle cx="${x3}" cy="${y3}" r="5" fill="var(--text-secondary)" opacity="0.8"/>
                        <text x="${x1}" y="${Math.max(y1 - 12, paddingTop + 5)}" text-anchor="middle" font-size="10" fill="var(--text-secondary)" font-weight="500">${refMin.toFixed(1)}</text>
                        <text x="${x2}" y="${valTextY}" text-anchor="middle" font-size="11" fill="${statusColor}" font-weight="bold">${value.toFixed(ref.unit === '%' ? 1 : 2)}</text>
                        <text x="${x3}" y="${Math.max(y3 - 12, paddingTop + 5)}" text-anchor="middle" font-size="10" fill="var(--text-secondary)" font-weight="500">${refMax === 999 ? '>' + refMin.toFixed(1) : refMax.toFixed(1)}</text>
                        <text x="${paddingLeft}" y="${paddingTop - 5}" font-size="10" fill="var(--text-secondary)" font-weight="500">${ref.name}</text>
                    </svg>
                `
                miniGraph.style.display = 'block'
            })

            td.addEventListener('mouseleave', () => {
                miniGraph.style.display = 'none'
            })
        })
    }, 100)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTEIN GRAPH
// ═══════════════════════════════════════════════════════════════════════════════

function renderProteinGraph(analysis) {
    const container = document.getElementById('protein-graph-container')
    const graph = document.getElementById('protein-graph')
    if (!container || !graph) return

    const defs = [
        { key: 'albumin-percent', label: 'Albumin' },
        { key: 'alpha1-globulin-percent', label: 'Alpha 1' },
        { key: 'alpha2-globulin-percent', label: 'Alpha 2' },
        { key: 'beta1-globulin-percent', label: 'Beta 1' },
        { key: 'beta2-globulin-percent', label: 'Beta 2' },
        { key: 'gamma-globulin-percent', label: 'Gamma' }
    ]

    const points = []
    let maxVal = 0

    defs.forEach(d => {
        const v = analysis.values && Object.prototype.hasOwnProperty.call(analysis.values, d.key)
            ? analysis.values[d.key]
            : null
        if (v != null && !Number.isNaN(v) && v > 0) {
            points.push({ label: d.label, value: v })
            if (v > maxVal) maxVal = v
        }
    })

    if (points.length < 2 || maxVal <= 0) {
        container.style.display = 'none'
        graph.innerHTML = ''
        return
    }

    const containerWidth = container.clientWidth || 700
    const width = Math.min(containerWidth - 40, 700)
    const height = 350
    const paddingLeft = 60
    const paddingRight = 20
    const paddingTop = 70
    const paddingBottom = 50
    const innerWidth = width - paddingLeft - paddingRight
    const innerHeight = height - paddingTop - paddingBottom
    const stepX = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth

    const baseY = paddingTop + innerHeight
    let pathD = 'M ' + paddingLeft + ' ' + baseY
    const circleParts = []
    const labelParts = []
    const curvePoints = [{ x: paddingLeft, y: baseY }]

    points.forEach((p, i) => {
        const centerX = paddingLeft + stepX * i
        const heightFactor = p.label === 'Albumin' ? 1.6 : 1.0
        const normalized = Math.min((p.value / maxVal) * heightFactor, 1.0)
        const peakY = baseY - normalized * innerHeight
        const widthFactor = p.label === 'Albumin' ? 0.18 : 0.45
        const leftX = i === 0 ? centerX : centerX - stepX * widthFactor
        const rightX = i === points.length - 1 ? centerX : centerX + stepX * widthFactor

        if (leftX > curvePoints[curvePoints.length - 1].x) {
            pathD += ' L ' + leftX + ' ' + baseY
            curvePoints.push({ x: leftX, y: baseY })
        }

        pathD += ' L ' + centerX + ' ' + peakY + ' L ' + rightX + ' ' + baseY
        curvePoints.push({ x: centerX, y: peakY })
        curvePoints.push({ x: rightX, y: baseY })

        const circleId = 'protein-circle-' + i
        const peakHeight = baseY - peakY
        const textOffset = Math.max(60, peakHeight * 0.3 + 40)
        let tooltipY = peakY - textOffset
        if (tooltipY < paddingTop + 20) {
            tooltipY = paddingTop + 20
        }
        circleParts.push(
            '<g id="' + circleId + '">' +
            '<circle cx="' + centerX + '" cy="' + peakY + '" r="' + (p.label === 'Albumin' ? 5 : 4) + '" fill="var(--primary-color)" style="cursor:pointer;">' +
            '<animate attributeName="r" values="' + (p.label === 'Albumin' ? 5 : 4) + ';' + (p.label === 'Albumin' ? 7 : 6) + ';' + (p.label === 'Albumin' ? 5 : 4) + '" dur="2s" repeatCount="indefinite" />' +
            '</circle>' +
            '<text x="' + centerX + '" y="' + tooltipY + '" text-anchor="middle" font-size="11" fill="var(--primary-color)" opacity="0" pointer-events="none" id="tooltip-' + circleId + '">' + p.value.toFixed(1) + ' %</text>' +
            '</g>'
        )
        labelParts.push('<text x="' + centerX + '" y="' + (height - paddingBottom + 18) + '" text-anchor="middle" font-size="12" fill="var(--text-secondary)">' + p.label + '</text>')
    })

    let pathLength = 0
    for (let i = 0; i < curvePoints.length - 1; i++) {
        const x1 = curvePoints[i].x
        const y1 = curvePoints[i].y
        const x2 = curvePoints[i + 1].x
        const y2 = curvePoints[i + 1].y
        pathLength += Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
    }
    const glowLength = Math.max(pathLength * 0.2, 80)
    const gradientId = 'protein-glow-' + Date.now()

    const svg = '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
        '<linearGradient id="' + gradientId + '" x1="0%" y1="0%" x2="100%" y2="0%">' +
        '<stop offset="0%" stop-color="var(--primary-color)" stop-opacity="0" />' +
        '<stop offset="35%" stop-color="var(--primary-color)" stop-opacity="0.3" />' +
        '<stop offset="50%" stop-color="var(--primary-color)" stop-opacity="1" />' +
        '<stop offset="65%" stop-color="var(--primary-color)" stop-opacity="0.3" />' +
        '<stop offset="100%" stop-color="var(--primary-color)" stop-opacity="0" />' +
        '</linearGradient>' +
        '<filter id="glow-' + gradientId + '" x="-50%" y="-50%" width="200%" height="200%">' +
        '<feGaussianBlur stdDeviation="5" result="coloredBlur"/>' +
        '<feMerge>' +
        '<feMergeNode in="coloredBlur"/>' +
        '<feMergeNode in="SourceGraphic"/>' +
        '</feMerge>' +
        '</filter>' +
        '<filter id="glitch-protein-' + gradientId + '" x="-50%" y="-50%" width="200%" height="200%">' +
        '<feOffset in="SourceGraphic" dx="0" dy="0" result="offset1">' +
        '<animate attributeName="dx" values="0;-1;1;-1;0" dur="0.15s" repeatCount="indefinite"/>' +
        '</feOffset>' +
        '<feOffset in="SourceGraphic" dx="0" dy="0" result="offset2">' +
        '<animate attributeName="dx" values="0;1;-1;1;0" dur="0.2s" repeatCount="indefinite"/>' +
        '</feOffset>' +
        '<feComponentTransfer in="offset1" result="red">' +
        '<feFuncR type="discrete" tableValues="1 0 1 0"/>' +
        '</feComponentTransfer>' +
        '<feComponentTransfer in="offset2" result="cyan">' +
        '<feFuncG type="discrete" tableValues="0 1 0 1"/>' +
        '<feFuncB type="discrete" tableValues="1 0 1 0"/>' +
        '</feComponentTransfer>' +
        '<feMerge>' +
        '<feMergeNode in="red"/>' +
        '<feMergeNode in="cyan"/>' +
        '<feMergeNode in="SourceGraphic"/>' +
        '</feMerge>' +
        '</filter>' +
        '</defs>' +
        '<line x1="' + paddingLeft + '" y1="' + (height - paddingBottom) + '" x2="' + (width - paddingRight) + '" y2="' + (height - paddingBottom) + '" stroke="var(--border)" stroke-width="1" />' +
        '<line x1="' + paddingLeft + '" y1="' + paddingTop + '" x2="' + paddingLeft + '" y2="' + (height - paddingBottom) + '" stroke="var(--border)" stroke-width="1" />' +
        '<path d="' + pathD + '" fill="none" stroke="var(--primary-color)" stroke-width="2" opacity="0.3" />' +
        '<path d="' + pathD + '" fill="none" stroke="url(#' + gradientId + ')" stroke-width="5" filter="url(#glitch-protein-' + gradientId + ')" stroke-dasharray="' + glowLength + ' ' + pathLength + '" stroke-dashoffset="0" stroke-linecap="round">' +
        '<animate attributeName="stroke-dashoffset" from="0" to="' + (pathLength + glowLength) + '" dur="5s" repeatCount="indefinite" />' +
        '<animate attributeName="stroke-width" values="5;6;5;7;5" dur="0.3s" repeatCount="indefinite"/>' +
        '</path>' +
        circleParts.join('') +
        labelParts.join('') +
        '<text x="' + (paddingLeft - 10) + '" y="' + (paddingTop + 10) + '" text-anchor="end" font-size="12" fill="var(--text-secondary)">' + maxVal.toFixed(1) + ' %</text>' +
        '<text x="' + (paddingLeft - 10) + '" y="' + (height - paddingBottom) + '" text-anchor="end" font-size="12" fill="var(--text-secondary)">0 %</text>' +
        '</svg>'

    graph.innerHTML = svg
    container.style.display = 'block'

    setTimeout(() => {
        points.forEach((p, i) => {
            const circleId = 'protein-circle-' + i
            const circleEl = document.getElementById(circleId)
            const tooltipEl = document.getElementById('tooltip-' + circleId)
            if (!circleEl || !tooltipEl) return

            const circle = circleEl.querySelector('circle')
            if (!circle) return

            circle.addEventListener('mouseenter', () => {
                tooltipEl.style.opacity = '1'
                circle.setAttribute('r', p.label === 'Albumin' ? 7 : 6)
            })

            circle.addEventListener('mouseleave', () => {
                tooltipEl.style.opacity = '0'
                circle.setAttribute('r', p.label === 'Albumin' ? 5 : 4)
            })
        })
    }, 50)
}

// ═══════════════════════════════════════════════════════════════════════════════
// COPY AS MARKDOWN (stub)
// ═══════════════════════════════════════════════════════════════════════════════

export function copyAnalysisAsMarkdown() {
    const id = document.getElementById('analysis-select').value
    if (!id) { toast.warning('Выберите анализ'); return }

    const analysis = state.analyses.find(a => a.id === id)
    if (!analysis) return

    let md = `# Анализ: ${analysis.label}\n`
    md += `**Дата:** ${formatDate(analysis.date)}\n`
    if (analysis.laboratory) md += `**Лаборатория:** ${analysis.laboratory}\n`
    md += `\n| Показатель | Значение | Референс | Статус |\n|---|---|---|---|\n`

    Object.entries(analysis.values).forEach(([key, value]) => {
        const ref = state.referenceRanges[key]
        if (!ref) return
        const status = getStatus(value, ref)
        const refText = ref.max === 999 ? `>${ref.min}` : `${ref.min} - ${ref.max}`
        md += `| ${ref.name} | ${value} ${ref.unit} | ${refText} ${ref.unit} | ${getStatusText(status)} |\n`
    })

    navigator.clipboard.writeText(md).then(() => {
        toast.success('Скопировано в буфер')
    }).catch(e => {
        toast.error('Ошибка: ' + e.message)
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREND CHART INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

export function populateTrendSelect() {
    const select = document.getElementById('trend-param-select')
    const card = document.getElementById('trend-chart-card')
    if (!select || !card) return

    if (state.analyses.length < 2) {
        card.style.display = 'none'
        return
    }

    // Collect all parameter keys across all analyses
    const paramKeys = new Set()
    state.analyses.forEach(a => {
        if (a.values) {
            Object.keys(a.values).forEach(k => paramKeys.add(k))
        }
    })

    // Build grouped options
    const groups = {}
    paramKeys.forEach(key => {
        const ref = state.referenceRanges[key]
        if (!ref) return
        const cat = ref.category || 'Прочие'
        if (!groups[cat]) groups[cat] = []
        groups[cat].push({ key, name: ref.name })
    })

    let html = '<option value="">Выберите параметр...</option>'
    Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cat, params]) => {
        html += `<optgroup label="${cat}">`
        params.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
            html += `<option value="${p.key}">${p.name}</option>`
        })
        html += '</optgroup>'
    })

    select.innerHTML = html
    card.style.display = paramKeys.size > 0 ? '' : 'none'
}

export function onTrendParamChange() {
    const select = document.getElementById('trend-param-select')
    if (!select) return

    const paramKey = select.value
    if (!paramKey) {
        const container = document.getElementById('trend-chart-container')
        if (container) container.innerHTML = ''
        return
    }

    window.renderTrendChart('trend-chart-container', paramKey)
}

// ═══════════════════════════════════════════════════════════════════════════════
// WINDOW EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

window.displayAnalysis = displayAnalysis
window.openAnalysisModal = openAnalysisModal
window.closeAnalysisModal = closeAnalysisModal
window.saveAnalysis = saveAnalysis
window.deleteCurrentAnalysis = deleteCurrentAnalysis
window.editCurrentAnalysis = editCurrentAnalysis
window.openPdfImportModal = openPdfImportModal
window.closePdfImportModal = closePdfImportModal
window.importPdf = importPdf
window.copyAnalysisAsMarkdown = copyAnalysisAsMarkdown
window.addExtraRow = addExtraRow
window.removeExtraRow = removeExtraRow
window.changeExtraKey = changeExtraKey
window.changeExtraValue = changeExtraValue
window.onTrendParamChange = onTrendParamChange
window.populateTrendSelect = populateTrendSelect