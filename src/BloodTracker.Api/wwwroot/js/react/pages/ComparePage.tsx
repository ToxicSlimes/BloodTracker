import React, { useState, useCallback } from 'react'
import { api } from '../../api.js'
import { ENDPOINTS } from '../../endpoints.js'
import { getStatusClass, formatDate, escapeHtml } from '../../utils.js'
import { toast } from '../components/Toast.js'
import { useAppState } from '../hooks/useAppState.js'
import type { AnalysisDto, CompareAnalysesDto } from '../../types/index.js'

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARE PAGE — React port of pages/compare.ts
// ═══════════════════════════════════════════════════════════════════════════════

export default function ComparePage() {
  const analyses = useAppState('analyses') as AnalysisDto[]
  const referenceRanges = useAppState('referenceRanges') as Record<string, any>

  const [beforeId, setBeforeId] = useState('')
  const [afterId, setAfterId] = useState('')
  const [comparison, setComparison] = useState<CompareAnalysesDto | null>(null)
  const [loading, setLoading] = useState(false)

  const doCompare = useCallback(async (bId: string, aId: string) => {
    if (!bId || !aId) return
    try {
      setLoading(true)
      const data = await api<CompareAnalysesDto>(ENDPOINTS.analyses.compare(bId, aId))
      setComparison(data)
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleBeforeChange = (val: string) => {
    setBeforeId(val)
    if (val && afterId) doCompare(val, afterId)
  }

  const handleAfterChange = (val: string) => {
    setAfterId(val)
    if (beforeId && val) doCompare(beforeId, val)
  }

  const options = analyses.map(a => (
    <option key={a.id} value={a.id}>{formatDate(a.date)} — {a.label}</option>
  ))

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title" data-asciify="md">[ СРАВНЕНИЕ АНАЛИЗОВ ]</div>
      </div>

      <div className="form-row" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label>Анализ 1 (до)</label>
          <select value={beforeId} onChange={e => handleBeforeChange(e.target.value)}>
            <option value="">Выберите...</option>
            {options}
          </select>
        </div>
        <div className="form-group">
          <label>Анализ 2 (после)</label>
          <select value={afterId} onChange={e => handleAfterChange(e.target.value)}>
            <option value="">Выберите...</option>
            {options}
          </select>
        </div>
      </div>

      <div id="compare-content">
        {loading && <div className="loading">Загрузка...</div>}

        {!loading && !comparison && (
          <div className="empty-state"><h3>Выберите два анализа для сравнения</h3></div>
        )}

        {!loading && comparison && (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Показатель</th>
                  <th>{comparison.before.label}</th>
                  <th>{comparison.after.label}</th>
                  <th>Изменение</th>
                </tr>
              </thead>
              <tbody>
                {comparison.comparisons.map(c => {
                  const ref = referenceRanges[c.key]
                  const description = ref?.description || ''

                  let deltaEl: React.ReactNode = '—'
                  if (c.deltaPercent != null) {
                    const cls = c.deltaPercent > 0 ? 'delta-up' : c.deltaPercent < 0 ? 'delta-down' : 'delta-same'
                    const sign = c.deltaPercent > 0 ? '↑ +' : c.deltaPercent < 0 ? '↓ ' : '= '
                    deltaEl = <span className={`delta ${cls}`}>{sign}{c.deltaPercent.toFixed(1)}%</span>
                  }

                  return (
                    <tr key={c.key}>
                      <td>
                        {description ? (
                          <span className="parameter-name">
                            {c.name}
                            <div className="tooltip">
                              <div className="tooltip-title">{c.name}</div>
                              <div className="tooltip-description">{description}</div>
                            </div>
                          </span>
                        ) : c.name}
                      </td>
                      <td>
                        <span className={`indicator ind-${getStatusClass(c.beforeStatus)}`} />
                        {c.beforeValue ?? '—'}
                      </td>
                      <td>
                        <span className={`indicator ind-${getStatusClass(c.afterStatus)}`} />
                        {c.afterValue ?? '—'}
                      </td>
                      <td>{deltaEl}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
