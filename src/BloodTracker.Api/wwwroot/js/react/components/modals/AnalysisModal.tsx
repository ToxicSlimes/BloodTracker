import React, { useState, useCallback, useMemo } from 'react'
import { api } from '../../../api.js'
import { ENDPOINTS } from '../../../endpoints.js'
import { state } from '../../../state.js'
import { formatDateForInput } from '../../../utils.js'
import { toast } from '../../components/Toast.js'

// ═══════════════════════════════════════════════════════════════════════════════
// Tab definitions — mirrors the vanilla HTML structure
// ═══════════════════════════════════════════════════════════════════════════════

interface FieldDef {
  key: string
  label: string
  step: string
  placeholder: string
}

const TAB_DEFS: { id: string; label: string; fields: FieldDef[][] }[] = [
  {
    id: 'hormones',
    label: 'Гормоны',
    fields: [
      [
        { key: 'testosterone', label: 'Тестостерон общий', step: '0.01', placeholder: '8.33-30.19' },
        { key: 'free-testosterone', label: 'Тестостерон свободный', step: '0.0001', placeholder: '0.22-0.77' },
      ],
      [
        { key: 'lh', label: 'ЛГ', step: '0.01', placeholder: '0.57-12.07' },
        { key: 'fsh', label: 'ФСГ', step: '0.01', placeholder: '0.95-11.95' },
      ],
      [
        { key: 'prolactin', label: 'Пролактин', step: '0.01', placeholder: '72.66-407.40' },
        { key: 'estradiol', label: 'Эстрадиол', step: '0.01', placeholder: '40-161' },
      ],
      [
        { key: 'shbg', label: 'ГСПГ', step: '0.01', placeholder: '16.2-68.5' },
        { key: 'tsh', label: 'ТТГ', step: '0.0001', placeholder: '0.35-4.94' },
      ],
    ],
  },
  {
    id: 'lipids',
    label: 'Липиды',
    fields: [
      [
        { key: 'cholesterol', label: 'Холестерин общий', step: '0.01', placeholder: '3.4-6.3' },
        { key: 'hdl', label: 'ЛПВП / HDL', step: '0.01', placeholder: '>1.03' },
      ],
      [
        { key: 'ldl', label: 'ЛПНП / LDL', step: '0.01', placeholder: '<2.6' },
        { key: 'triglycerides', label: 'Триглицериды', step: '0.01', placeholder: '<1.7' },
      ],
      [
        { key: 'atherogenic', label: 'Коэфф. атерогенности', step: '0.1', placeholder: '1.0-2.5' },
      ],
    ],
  },
  {
    id: 'liver',
    label: 'Печень',
    fields: [
      [
        { key: 'alt', label: 'АЛТ', step: '0.1', placeholder: '<50' },
        { key: 'ast', label: 'АСТ', step: '0.1', placeholder: '<50' },
      ],
      [
        { key: 'ggt', label: 'ГГТ', step: '0.1', placeholder: '<55' },
        { key: 'bilirubin', label: 'Билирубин общий', step: '0.1', placeholder: '5-21' },
      ],
    ],
  },
  {
    id: 'general',
    label: 'Общие',
    fields: [
      [
        { key: 'hemoglobin', label: 'Гемоглобин', step: '0.1', placeholder: '130-170' },
        { key: 'hematocrit', label: 'Гематокрит', step: '0.1', placeholder: '39-49' },
      ],
      [
        { key: 'glucose', label: 'Глюкоза', step: '0.01', placeholder: '3.9-6.1' },
        { key: 'vitd', label: 'Витамин D', step: '0.1', placeholder: '30-100' },
      ],
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// Extra row type
// ═══════════════════════════════════════════════════════════════════════════════

interface ExtraRow {
  id: string
  key: string
  value: number | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  analysisId?: string
  onSave: () => void
  closeModal: () => void
}

export default function AnalysisModal({ analysisId, onSave, closeModal }: Props) {
  const staticKeys = state.staticAnalysisKeys as string[]
  const existing = analysisId
    ? state.analyses.find(a => a.id === analysisId)
    : null

  // ── Initialize form state from existing analysis or defaults ──

  const initialTabValues = useMemo(() => {
    const vals: Record<string, string> = {}
    staticKeys.forEach(key => {
      if (existing?.values && Object.prototype.hasOwnProperty.call(existing.values, key)) {
        const v = existing.values[key]
        vals[key] = v != null ? String(v) : ''
      } else {
        vals[key] = ''
      }
    })
    return vals
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initialExtraRows = useMemo((): ExtraRow[] => {
    if (!existing?.values) return []
    return Object.entries(existing.values)
      .filter(([k]) => !staticKeys.includes(k))
      .map(([k, v]) => ({ id: crypto.randomUUID(), key: k, value: v as number }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [date, setDate] = useState(
    existing ? formatDateForInput(existing.date) : new Date().toISOString().split('T')[0]
  )
  const [label, setLabel] = useState(existing?.label || '')
  const [lab, setLab] = useState(existing?.laboratory || '')
  const [tabValues, setTabValues] = useState<Record<string, string>>(initialTabValues)
  const [extraRows, setExtraRows] = useState<ExtraRow[]>(initialExtraRows)
  const [activeTab, setActiveTab] = useState('hormones')
  const [saving, setSaving] = useState(false)

  // ── Tab value handlers ──

  const handleTabValueChange = useCallback((key: string, value: string) => {
    setTabValues(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── Extra rows handlers ──

  const addExtraRow = useCallback(() => {
    setExtraRows(prev => [...prev, { id: crypto.randomUUID(), key: '', value: null }])
  }, [])

  const removeExtraRow = useCallback((id: string) => {
    setExtraRows(prev => prev.filter(r => r.id !== id))
  }, [])

  const changeExtraKey = useCallback((id: string, key: string) => {
    setExtraRows(prev => prev.map(r => r.id === id ? { ...r, key } : r))
  }, [])

  const changeExtraValue = useCallback((id: string, rawValue: string) => {
    setExtraRows(prev => prev.map(r =>
      r.id === id ? { ...r, value: rawValue === '' ? null : parseFloat(rawValue) } : r
    ))
  }, [])

  // ── Reference ranges for extra row select ──

  const refRangeOptions = useMemo(() => {
    return Object.values(state.referenceRanges) as { key: string; name: string; unit: string }[]
  }, [])

  // ── Save ──

  const handleSave = useCallback(async () => {
    if (!date || !label.trim()) {
      toast.warning('Заполните дату и метку')
      return
    }

    const values: Record<string, number> = {}
    staticKeys.forEach(key => {
      const v = tabValues[key]
      if (v !== '' && v !== null && v !== undefined) {
        const parsed = parseFloat(v)
        if (!isNaN(parsed)) values[key] = parsed
      }
    })
    extraRows.forEach(row => {
      if (!row.key || row.value == null || isNaN(row.value)) return
      values[row.key] = row.value
    })

    const data: Record<string, unknown> = {
      date,
      label: label.trim(),
      laboratory: lab.trim(),
      values,
    }

    setSaving(true)
    try {
      if (analysisId) {
        data.id = analysisId
        await api(ENDPOINTS.analyses.update(analysisId), {
          method: 'PUT',
          body: JSON.stringify(data),
        })
        const result = await api(ENDPOINTS.analyses.list) as any[]
        state.analyses = result
        state.selectedAnalysisId = analysisId
        toast.success('Анализ обновлён')
      } else {
        await api(ENDPOINTS.analyses.create, {
          method: 'POST',
          body: JSON.stringify(data),
        })
        const result = await api(ENDPOINTS.analyses.list) as any[]
        state.analyses = result
        toast.success('Анализ сохранён')
      }
      onSave()
      closeModal()
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message)
    } finally {
      setSaving(false)
    }
  }, [date, label, lab, tabValues, extraRows, analysisId, staticKeys, onSave, closeModal])

  // ── Render ──

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>{analysisId ? '[ РЕДАКТИРОВАТЬ АНАЛИЗ ]' : '[ ДОБАВИТЬ АНАЛИЗ ]'}</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>

      <div className="modal-body">
        {/* Top fields */}
        <div className="form-row">
          <div className="form-group">
            <label>Дата анализа</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Метка</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="До курса / После курса"
            />
          </div>
          <div className="form-group">
            <label>Лаборатория</label>
            <input
              type="text"
              value={lab}
              onChange={e => setLab(e.target.value)}
              placeholder="KDL, Инвитро..."
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TAB_DEFS.map(tab => (
            <button
              key={tab.id}
              className={`tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {TAB_DEFS.map(tab => (
          <div
            key={tab.id}
            className={`tab-content${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.fields.map((row, ri) => (
              <div className="form-row" key={ri}>
                {row.map(field => (
                  <div className="form-group" key={field.key}>
                    <label>{field.label}</label>
                    <input
                      type="number"
                      step={field.step}
                      value={tabValues[field.key] ?? ''}
                      onChange={e => handleTabValueChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Extra rows */}
        <div className="card" style={{ marginTop: '15px' }}>
          <div className="card-header">
            <div className="card-title" data-asciify="md">[ ДОПОЛНИТЕЛЬНЫЕ ПОКАЗАТЕЛИ ]</div>
            <button
              className="btn btn-secondary btn-small"
              onClick={addExtraRow}
              type="button"
            >
              [ + ДОБАВИТЬ ]
            </button>
          </div>

          <div>
            {extraRows.length === 0 ? (
              <div className="empty-state">
                <p>Нет дополнительных показателей</p>
              </div>
            ) : (
              extraRows.map(row => (
                <div
                  key={row.id}
                  className="form-row"
                  style={{ alignItems: 'center', gap: '10px', marginBottom: '8px' }}
                >
                  <div className="form-group" style={{ flex: 2, minWidth: '220px' }}>
                    <label>Показатель</label>
                    <select
                      value={row.key}
                      onChange={e => changeExtraKey(row.id, e.target.value)}
                    >
                      <option value="">Выберите...</option>
                      {refRangeOptions.map(r => (
                        <option key={r.key} value={r.key}>
                          {r.name} ({r.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Значение</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={row.value ?? ''}
                      onChange={e => changeExtraValue(row.id, e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-danger btn-small"
                    style={{ marginTop: '22px' }}
                    onClick={() => removeExtraRow(row.id)}
                    type="button"
                  >
                    [ X ]
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={closeModal}>Отмена</button>
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? '[ ... ]' : '[ СОХРАНИТЬ ]'}
        </button>
      </div>
    </div>
  )
}
