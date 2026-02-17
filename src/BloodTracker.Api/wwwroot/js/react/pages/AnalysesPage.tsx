import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAppState } from '../hooks/useAppState.js'
import { useModal } from '../contexts/ModalContext.js'
import { state } from '../../state.js'
import { api } from '../../api.js'
import { ENDPOINTS } from '../../endpoints.js'
import { formatDate, getStatus, getStatusClass, getStatusText } from '../../utils.js'
import { renderTrendChart, destroyTrendChart } from '../../components/trendChart.js'
import { toast } from '../components/Toast.js'
import AnalysisModal from '../components/modals/AnalysisModal.js'
import PdfImportModal from '../components/modals/PdfImportModal.js'
import type { AnalysisDto } from '../../types/index.js'

// ═══════════════════════════════════════════════════════════════════════════════
// SVG Mini-Graph — hover tooltip showing value vs reference range
// ═══════════════════════════════════════════════════════════════════════════════

function buildMiniGraphSvg(value: number, ref: any, status: number, key: string): string {
  const W = 260, H = 140
  const pt = 25, pb = 25, pl = 18, pr = 18
  const iW = W - pl - pr, iH = H - pt - pb
  const refMin = ref.min
  const refMax = ref.max === 999 ? value * 1.5 : ref.max
  let minV = refMin, maxV = refMax

  if (value < refMin) minV = Math.max(0, value - (refMax - refMin) * 0.2)
  if (value > refMax) maxV = value + (refMax - refMin) * 0.2
  const range = maxV - minV

  const x1 = pl, x2 = pl + iW / 2, x3 = pl + iW
  const baseY = H - pb
  const y1 = baseY - ((refMin - minV) / range) * iH
  const y2 = baseY - ((value - minV) / range) * iH
  const y3 = baseY - ((refMax - minV) / range) * iH

  const sColor = status === 0 ? 'var(--green)' : status === 1 ? 'var(--blue)' : status === 2 ? 'var(--yellow)' : 'var(--red)'
  const mColor = status === 0 ? 'var(--primary-color)' : sColor
  const path = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`
  const pLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) + Math.sqrt((x3 - x2) ** 2 + (y3 - y2) ** 2)
  const gLen = pLen * 0.25

  let valY = y2 < pt + iH / 2 ? y2 + 26 : y2 - 20
  valY = Math.max(pt + 10, Math.min(valY, H - pb - 8))
  const gid = `mg-${key}`
  const dMax = ref.max === 999 ? `>${refMin.toFixed(1)}` : refMax.toFixed(1)

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%"><stop offset="0%" stop-color="${mColor}" stop-opacity="0"/><stop offset="40%" stop-color="${mColor}" stop-opacity="0.5"/><stop offset="50%" stop-color="${mColor}" stop-opacity="1"/><stop offset="60%" stop-color="${mColor}" stop-opacity="0.5"/><stop offset="100%" stop-color="${mColor}" stop-opacity="0"/></linearGradient>
  <filter id="gw-${gid}"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  ${status >= 2 ? `<filter id="gl-${gid}" x="-50%" y="-50%" width="200%" height="200%"><feOffset in="SourceGraphic" dx="0" result="o1"><animate attributeName="dx" values="0;-2;2;-2;0" dur="0.1s" repeatCount="indefinite"/></feOffset><feOffset in="SourceGraphic" dx="0" result="o2"><animate attributeName="dx" values="0;2;-2;2;0" dur="0.15s" repeatCount="indefinite"/></feOffset><feComponentTransfer in="o1" result="r"><feFuncR type="discrete" tableValues="1 0 1 0"/></feComponentTransfer><feComponentTransfer in="o2" result="c"><feFuncG type="discrete" tableValues="0 1 0 1"/><feFuncB type="discrete" tableValues="1 0 1 0"/></feComponentTransfer><feMerge><feMergeNode in="r"/><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
</defs>
<rect x="0" y="0" width="${W}" height="${H}" fill="var(--bg-secondary)" stroke="var(--border)" stroke-width="1" rx="4"/>
<line x1="${pl}" y1="${baseY}" x2="${pl + iW}" y2="${baseY}" stroke="var(--border)" stroke-width="1" opacity="0.5"/>
<path d="${path}" fill="none" stroke="${mColor}" stroke-width="2" opacity="0.25"/>
<path d="${path}" fill="none" stroke="url(#${gid})" stroke-width="3" filter="${status >= 2 ? `url(#gl-${gid})` : `url(#gw-${gid})`}" stroke-dasharray="${gLen} ${pLen}" stroke-dashoffset="0">
  <animate attributeName="stroke-dashoffset" values="0;${pLen + gLen}" dur="3s" repeatCount="indefinite"/>
  ${status >= 2 ? `<animate attributeName="stroke-width" values="3;4;3;5;3" dur="0.2s" repeatCount="indefinite"/>` : ''}
</path>
<circle cx="${x1}" cy="${y1}" r="5" fill="var(--text-secondary)" opacity="0.8"/>
<circle cx="${x2}" cy="${y2}" r="7" fill="${sColor}" filter="url(#gw-${gid})"><animate attributeName="r" values="7;9;7" dur="1.5s" repeatCount="indefinite"/></circle>
<circle cx="${x3}" cy="${y3}" r="5" fill="var(--text-secondary)" opacity="0.8"/>
<text x="${x1}" y="${Math.max(y1 - 12, pt + 5)}" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${refMin.toFixed(1)}</text>
<text x="${x2}" y="${valY}" text-anchor="middle" font-size="11" fill="${sColor}" font-weight="bold">${value.toFixed(ref.unit === '%' ? 1 : 2)}</text>
<text x="${x3}" y="${Math.max(y3 - 12, pt + 5)}" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${dMax}</text>
<text x="${pl}" y="${pt - 5}" font-size="10" fill="var(--text-secondary)">${ref.name}</text>
</svg>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG Protein Electrophoresis Graph
// ═══════════════════════════════════════════════════════════════════════════════

const PROTEIN_FRACTIONS = [
  { key: 'albumin-percent', label: 'Albumin' },
  { key: 'alpha1-globulin-percent', label: 'Alpha 1' },
  { key: 'alpha2-globulin-percent', label: 'Alpha 2' },
  { key: 'beta1-globulin-percent', label: 'Beta 1' },
  { key: 'beta2-globulin-percent', label: 'Beta 2' },
  { key: 'gamma-globulin-percent', label: 'Gamma' },
]

function buildProteinGraphSvg(analysis: AnalysisDto): string {
  const points: { label: string; value: number }[] = []
  let maxVal = 0
  for (const d of PROTEIN_FRACTIONS) {
    const v = analysis.values?.[d.key]
    if (v != null && !isNaN(v) && v > 0) {
      points.push({ label: d.label, value: v })
      if (v > maxVal) maxVal = v
    }
  }
  if (points.length < 2 || maxVal <= 0) return ''

  const w = 660, h = 350, pl = 60, pr = 20, pt = 70, pb = 50
  const iW = w - pl - pr, iH = h - pt - pb
  const step = points.length > 1 ? iW / (points.length - 1) : iW
  const baseY = pt + iH
  let pathD = `M ${pl} ${baseY}`
  const circles: string[] = []
  const labels: string[] = []
  const curve = [{ x: pl, y: baseY }]

  points.forEach((p, i) => {
    const cx = pl + step * i
    const hf = p.label === 'Albumin' ? 1.6 : 1.0
    const norm = Math.min((p.value / maxVal) * hf, 1.0)
    const peakY = baseY - norm * iH
    const wf = p.label === 'Albumin' ? 0.18 : 0.45
    const lx = i === 0 ? cx : cx - step * wf
    const rx = i === points.length - 1 ? cx : cx + step * wf

    if (lx > curve[curve.length - 1].x) {
      pathD += ` L ${lx} ${baseY}`
      curve.push({ x: lx, y: baseY })
    }
    pathD += ` L ${cx} ${peakY} L ${rx} ${baseY}`
    curve.push({ x: cx, y: peakY }, { x: rx, y: baseY })

    const r = p.label === 'Albumin' ? 5 : 4
    let tipY = peakY - Math.max(60, (baseY - peakY) * 0.3 + 40)
    if (tipY < pt + 20) tipY = pt + 20

    circles.push(
      `<g class="pp"><circle cx="${cx}" cy="${peakY}" r="${r}" fill="var(--primary-color)" style="cursor:pointer"><animate attributeName="r" values="${r};${r + 2};${r}" dur="2s" repeatCount="indefinite"/></circle><text x="${cx}" y="${tipY}" text-anchor="middle" font-size="11" fill="var(--primary-color)" opacity="0" pointer-events="none">${p.value.toFixed(1)} %</text></g>`
    )
    labels.push(`<text x="${cx}" y="${h - pb + 18}" text-anchor="middle" font-size="12" fill="var(--text-secondary)">${p.label}</text>`)
  })

  let pLen = 0
  for (let i = 0; i < curve.length - 1; i++) {
    pLen += Math.sqrt((curve[i + 1].x - curve[i].x) ** 2 + (curve[i + 1].y - curve[i].y) ** 2)
  }
  const gLen = Math.max(pLen * 0.2, 80)
  const gid = `pg-${analysis.id.slice(0, 8)}`

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
<style>.pp:hover text{opacity:1!important;transition:opacity .15s}</style>
<defs>
  <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%"><stop offset="0%" stop-color="var(--primary-color)" stop-opacity="0"/><stop offset="35%" stop-color="var(--primary-color)" stop-opacity="0.3"/><stop offset="50%" stop-color="var(--primary-color)" stop-opacity="1"/><stop offset="65%" stop-color="var(--primary-color)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--primary-color)" stop-opacity="0"/></linearGradient>
  <filter id="gw-${gid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="gl-${gid}" x="-50%" y="-50%" width="200%" height="200%"><feOffset in="SourceGraphic" dx="0" result="o1"><animate attributeName="dx" values="0;-1;1;-1;0" dur="0.15s" repeatCount="indefinite"/></feOffset><feOffset in="SourceGraphic" dx="0" result="o2"><animate attributeName="dx" values="0;1;-1;1;0" dur="0.2s" repeatCount="indefinite"/></feOffset><feComponentTransfer in="o1" result="r"><feFuncR type="discrete" tableValues="1 0 1 0"/></feComponentTransfer><feComponentTransfer in="o2" result="c"><feFuncG type="discrete" tableValues="0 1 0 1"/><feFuncB type="discrete" tableValues="1 0 1 0"/></feComponentTransfer><feMerge><feMergeNode in="r"/><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<line x1="${pl}" y1="${h - pb}" x2="${w - pr}" y2="${h - pb}" stroke="var(--border)" stroke-width="1"/>
<line x1="${pl}" y1="${pt}" x2="${pl}" y2="${h - pb}" stroke="var(--border)" stroke-width="1"/>
<path d="${pathD}" fill="none" stroke="var(--primary-color)" stroke-width="2" opacity="0.3"/>
<path d="${pathD}" fill="none" stroke="url(#${gid})" stroke-width="5" filter="url(#gl-${gid})" stroke-dasharray="${gLen} ${pLen}" stroke-dashoffset="0" stroke-linecap="round">
  <animate attributeName="stroke-dashoffset" from="0" to="${pLen + gLen}" dur="5s" repeatCount="indefinite"/>
  <animate attributeName="stroke-width" values="5;6;5;7;5" dur="0.3s" repeatCount="indefinite"/>
</path>
${circles.join('')}
${labels.join('')}
<text x="${pl - 10}" y="${pt + 10}" text-anchor="end" font-size="12" fill="var(--text-secondary)">${maxVal.toFixed(1)} %</text>
<text x="${pl - 10}" y="${h - pb}" text-anchor="end" font-size="12" fill="var(--text-secondary)">0 %</text>
</svg>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// AnalysesPage Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function AnalysesPage() {
  const analyses = useAppState('analyses')
  const referenceRanges = useAppState('referenceRanges')
  const selectedAnalysisId = useAppState('selectedAnalysisId')
  const { openModal, closeModal } = useModal()

  const [hoveredParam, setHoveredParam] = useState<string | null>(null)
  const [trendParam, setTrendParam] = useState('')
  const trendRef = useRef<HTMLDivElement>(null)
  const [skullHtml, setSkullHtml] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // Selected analysis object
  const analysis = useMemo(
    () => analyses.find(a => a.id === selectedAnalysisId) ?? null,
    [analyses, selectedAnalysisId],
  )

  // Group items by category for the display table
  // undefined = no analysis selected, null = analysis has no recognized data
  const groupedItems = useMemo(() => {
    if (!analysis) return undefined
    const items = Object.entries(analysis.values)
      .map(([key, value]) => {
        const ref = referenceRanges[key] as any
        if (!ref) return null
        return { key, value: value as number, ref, status: getStatus(value as number, ref) }
      })
      .filter(Boolean) as { key: string; value: number; ref: any; status: number }[]

    if (items.length === 0) return null

    const order = ['Гормоны', 'Липиды', 'Печень', 'Коагуляция', 'Общие']
    const groups: Record<string, typeof items> = {}
    for (const i of items) {
      const cat = i.ref.category || 'Прочие'
      ;(groups[cat] ??= []).push(i)
    }
    const sorted = Object.keys(groups).sort((a, b) => {
      const oa = order.indexOf(a), ob = order.indexOf(b)
      return ((oa === -1 ? 99 : oa) - (ob === -1 ? 99 : ob)) || a.localeCompare(b)
    })
    return { groups, sorted }
  }, [analysis, referenceRanges])

  // Mini-graph SVG — only for hovered parameter (avoids building 20+ SVGs)
  const hoveredMiniSvg = useMemo(() => {
    if (!hoveredParam || !analysis) return ''
    const ref = referenceRanges[hoveredParam] as any
    if (!ref) return ''
    const v = analysis.values[hoveredParam]
    if (v == null || isNaN(v)) return ''
    return buildMiniGraphSvg(v, ref, getStatus(v, ref), hoveredParam)
  }, [hoveredParam, analysis, referenceRanges])

  // Protein electrophoresis SVG
  const proteinSvg = useMemo(
    () => (analysis ? buildProteinGraphSvg(analysis) : ''),
    [analysis],
  )

  // Trend select options grouped by category
  const trendOptions = useMemo(() => {
    if (analyses.length < 2) return null
    const keys = new Set<string>()
    for (const a of analyses) {
      if (a.values) for (const k of Object.keys(a.values)) keys.add(k)
    }
    const groups: Record<string, { key: string; name: string }[]> = {}
    for (const key of keys) {
      const ref = referenceRanges[key] as any
      if (!ref) continue
      ;(groups[ref.category || 'Прочие'] ??= []).push({ key, name: ref.name })
    }
    return groups
  }, [analyses, referenceRanges])

  // Load ASCII skull for empty-data state
  useEffect(() => {
    if (analysis && groupedItems === null) {
      import('../../effects/ascii-art.js').then((m: any) => setSkullHtml(m.renderAsciiSkull()))
    }
  }, [analysis, groupedItems])

  // Trend chart lifecycle
  useEffect(() => {
    if (!trendParam) return
    const cid = 'react-trend-chart-container'
    requestAnimationFrame(() => renderTrendChart(cid, trendParam))
    return () => { destroyTrendChart(cid) }
  }, [trendParam, analyses])

  // ── Handlers ──

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    state.selectedAnalysisId = e.target.value || null
  }, [])

  const handleCopyMd = useCallback(() => {
    if (!analysis) { toast.warning('Выберите анализ'); return }
    let md = `# Анализ: ${analysis.label}\n**Дата:** ${formatDate(analysis.date)}\n`
    if (analysis.laboratory) md += `**Лаборатория:** ${analysis.laboratory}\n`
    md += `\n| Показатель | Значение | Референс | Статус |\n|---|---|---|---|\n`
    for (const [key, value] of Object.entries(analysis.values)) {
      const ref = referenceRanges[key]
      if (!ref) continue
      const s = getStatus(value, ref)
      const rt = ref.max === 999 ? `>${ref.min}` : `${ref.min} - ${ref.max}`
      md += `| ${ref.name} | ${value} ${ref.unit} | ${rt} ${ref.unit} | ${getStatusText(s)} |\n`
    }
    navigator.clipboard.writeText(md)
      .then(() => toast.success('Скопировано в буфер'))
      .catch(e => toast.error('Ошибка: ' + e.message))
  }, [analysis, referenceRanges])

  // ── Render ──

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title" data-asciify="md">[ МОИ АНАЛИЗЫ ]</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => openModal(
              <AnalysisModal onSave={refresh} closeModal={closeModal} />
            )}>
              + Добавить вручную
            </button>
            <button className="btn btn-secondary" onClick={() => openModal(
              <PdfImportModal onSave={refresh} closeModal={closeModal} />
            )}>
              [ ИМПОРТ PDF ]
            </button>
          </div>
        </div>

        <div className="analysis-selector">
          <label>Просмотр:</label>
          <select value={selectedAnalysisId || ''} onChange={handleSelect}>
            <option value="">Выберите анализ...</option>
            {analyses.map(a => (
              <option key={a.id} value={a.id}>{formatDate(a.date)} — {a.label}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-small" onClick={() => {
            const id = state.selectedAnalysisId
            if (!id) return
            openModal(<AnalysisModal analysisId={id} onSave={refresh} closeModal={closeModal} />)
          }}>
            [ РЕДАКТИРОВАТЬ ]
          </button>
          <button className="btn btn-secondary btn-small" onClick={async () => {
            const id = state.selectedAnalysisId
            if (!id) return
            if (!confirm('[ УДАЛИТЬ АНАЛИЗ? ]')) return
            try {
              await api(ENDPOINTS.analyses.delete(id), { method: 'DELETE' })
              state.selectedAnalysisId = null
              const result = await api(ENDPOINTS.analyses.list) as any[]
              state.analyses = result
              refresh()
            } catch (e: any) {
              toast.error('Ошибка: ' + e.message)
            }
          }}>
            [ УДАЛИТЬ ]
          </button>
          <button className="btn btn-secondary btn-small" onClick={handleCopyMd}>
            [ КОПИРОВАТЬ КАК MD ]
          </button>
        </div>

        <div className="legend">
          <div className="legend-item"><span className="indicator ind-normal" /> В норме</div>
          <div className="legend-item"><span className="indicator ind-low" /> Снижен</div>
          <div className="legend-item"><span className="indicator ind-slightly-high" /> Чуть выше</div>
          <div className="legend-item"><span className="indicator ind-high" /> Повышен</div>
        </div>

        {/* ── Analysis content ── */}
        {groupedItems === undefined && (
          <div className="empty-state"><h3>Выберите или добавьте анализ</h3></div>
        )}
        {groupedItems === null && (
          <div className="empty-state">
            {skullHtml && <div dangerouslySetInnerHTML={{ __html: skullHtml }} />}
            <h3>Нет данных</h3>
          </div>
        )}
        {groupedItems && (
          <div className="table-responsive">
            <table>
              <thead>
                <tr><th>Показатель</th><th>Результат</th><th>Референс</th><th>Статус</th></tr>
              </thead>
              <tbody>
                {groupedItems.sorted.map(cat => (
                  <React.Fragment key={cat}>
                    <tr>
                      <td colSpan={4} style={{ background: 'var(--bg-tertiary)', fontWeight: 600 }}>{cat}</td>
                    </tr>
                    {groupedItems.groups[cat]
                      .sort((a, b) => a.ref.name.localeCompare(b.ref.name))
                      .map(({ key, value, ref, status }) => {
                        const refText = ref.max === 999
                          ? `>${ref.min}`
                          : (ref.min === 0 && ref.max < 10 ? `<${ref.max}` : `${ref.min} - ${ref.max}`)
                        return (
                          <tr key={key} data-param-key={key}>
                            <td>
                              <span className="parameter-name">
                                {ref.name}
                                {ref.description && (
                                  <div className="tooltip">
                                    <div className="tooltip-title">{ref.name}</div>
                                    <div className="tooltip-description">{ref.description}</div>
                                  </div>
                                )}
                              </span>
                            </td>
                            <td
                              style={{ position: 'relative', cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredParam(key)}
                              onMouseLeave={() => setHoveredParam(null)}
                            >
                              <span className={`indicator ind-${getStatusClass(status)}`} />
                              <strong>{value}</strong> {ref.unit}
                              {hoveredParam === key && hoveredMiniSvg && (
                                <div
                                  className="mini-graph-tooltip"
                                  style={{ display: 'block' }}
                                  dangerouslySetInnerHTML={{ __html: hoveredMiniSvg }}
                                />
                              )}
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{refText} {ref.unit}</td>
                            <td className={`status-${getStatusClass(status)}`}>{getStatusText(status)}</td>
                          </tr>
                        )
                      })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Protein electrophoresis ── */}
        {proteinSvg && (
          <div style={{ marginTop: '20px', overflowX: 'auto' }}>
            <div className="card-title" style={{ marginBottom: '10px' }}>[ ЭЛЕКТРОФОРЕЗ БЕЛКОВЫХ ФРАКЦИЙ ]</div>
            <div style={{ maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: proteinSvg }} />
          </div>
        )}
      </div>

      {/* ── Trend chart ── */}
      {trendOptions && (
        <div className="card">
          <div className="card-header">
            <div className="card-title" data-asciify="md">[ ТРЕНД ПАРАМЕТРА ]</div>
          </div>
          <div style={{ padding: '20px' }}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Параметр для графика</label>
              <select value={trendParam} onChange={e => setTrendParam(e.target.value)}>
                <option value="">Выберите параметр...</option>
                {Object.entries(trendOptions)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([cat, params]) => (
                    <optgroup key={cat} label={cat}>
                      {params.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                        <option key={p.key} value={p.key}>{p.name}</option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </div>
            <div id="react-trend-chart-container" ref={trendRef} style={{ minHeight: '300px' }} />
          </div>
        </div>
      )}
    </>
  )
}
