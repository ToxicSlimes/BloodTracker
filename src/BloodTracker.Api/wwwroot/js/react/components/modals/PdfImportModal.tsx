import React, { useState, useCallback, useRef } from 'react'
import { api, API_URL } from '../../../api.js'
import { ENDPOINTS } from '../../../endpoints.js'
import { state } from '../../../state.js'
import { formatDate } from '../../../utils.js'
import { toast } from '../../components/Toast.js'

// ═══════════════════════════════════════════════════════════════════════════════
// PDF Import Modal — upload PDF lab results for AI parsing
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  onSave: () => void
  closeModal: () => void
}

interface ImportResult {
  success: boolean
  analysis?: { id: string }
  detectedDate?: string
  detectedLaboratory?: string
  parsedValuesCount?: number
  unrecognizedItems?: string[]
  errorMessage?: string
}

export default function PdfImportModal({ onSave, closeModal }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [label, setLabel] = useState('')
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState<{
    type: 'loading' | 'success' | 'error'
    result?: ImportResult
    errorMessage?: string
  } | null>(null)

  const handleImport = useCallback(async () => {
    const fileInput = fileRef.current
    if (!fileInput?.files?.length) {
      toast.warning('Выберите PDF файл')
      return
    }

    const file = fileInput.files[0]
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.warning('Требуется PDF файл')
      return
    }

    setImporting(true)
    setStatus({ type: 'loading' })

    const formData = new FormData()
    formData.append('file', file)
    if (label.trim()) formData.append('label', label.trim())

    try {
      const token = localStorage.getItem('bt_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_URL}/api/v1${ENDPOINTS.analyses.importPdf}`, {
        method: 'POST',
        headers,
        body: formData,
      })
      const result: ImportResult = await response.json()

      if (result.success) {
        setStatus({ type: 'success', result })
        // Auto-close after 2s, reload data
        setTimeout(async () => {
          closeModal()
          const analyses = await api(ENDPOINTS.analyses.list) as any[]
          state.analyses = analyses
          if (result.analysis) {
            state.selectedAnalysisId = result.analysis.id
          }
          onSave()
        }, 2000)
      } else {
        setStatus({ type: 'error', result })
        setImporting(false)
      }
    } catch (e: any) {
      setStatus({ type: 'error', errorMessage: e.message })
      setImporting(false)
    }
  }, [label, onSave, closeModal])

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>[ ИМПОРТ АНАЛИЗА ИЗ PDF ]</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>

      <div className="modal-body">
        <div className="form-group">
          <label>PDF файл с анализами (KDL, Инвитро, Гемотест и др.)</label>
          <input
            type="file"
            ref={fileRef}
            accept=".pdf"
            style={{
              padding: '15px',
              border: '2px dashed var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          />
        </div>
        <div className="form-group">
          <label>Метка анализа (опционально)</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="До курса / После курса / ПКТ"
          />
        </div>

        {/* Status area */}
        {status && (
          <div
            style={{
              marginTop: '15px',
              padding: '15px',
              borderRadius: '8px',
              background:
                status.type === 'loading'
                  ? 'var(--bg-tertiary)'
                  : status.type === 'success'
                    ? 'rgba(63, 185, 80, 0.1)'
                    : 'rgba(248, 81, 73, 0.1)',
            }}
          >
            {status.type === 'loading' && (
              <div style={{ color: 'var(--text-secondary)' }}>Анализируем PDF файл...</div>
            )}

            {status.type === 'success' && status.result && (
              <>
                <div style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '10px' }}>
                  [ ИМПОРТ УСПЕШЕН ]
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <p>[ ДАТА ]: {formatDate(status.result.detectedDate || '')}</p>
                  <p>[ ЛАБОРАТОРИЯ ]: {status.result.detectedLaboratory || 'Не определена'}</p>
                  <p>[ РАСПОЗНАНО ПОКАЗАТЕЛЕЙ ]: {status.result.parsedValuesCount}</p>
                  {status.result.unrecognizedItems && status.result.unrecognizedItems.length > 0 && (
                    <p style={{ marginTop: '10px', color: 'var(--yellow)' }}>
                      [ ! ] НЕ РАСПОЗНАНО СТРОК: {status.result.unrecognizedItems.length}
                    </p>
                  )}
                </div>
              </>
            )}

            {status.type === 'error' && (
              <>
                <div style={{ color: 'var(--red)', fontWeight: 600, marginBottom: '10px' }}>
                  [ ОШИБКА ИМПОРТА ]
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <p>{status.result?.errorMessage || status.errorMessage || 'Неизвестная ошибка'}</p>
                  {status.result?.unrecognizedItems && status.result.unrecognizedItems.length > 0 && (
                    <details style={{ marginTop: '10px' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--accent)' }}>
                        Нераспознанные строки ({status.result.unrecognizedItems.length})
                      </summary>
                      <ul style={{ marginTop: '5px', paddingLeft: '20px', fontSize: '12px' }}>
                        {status.result.unrecognizedItems.slice(0, 10).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                        {status.result.unrecognizedItems.length > 10 && (
                          <li>...и ещё {status.result.unrecognizedItems.length - 10}</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={closeModal}>Отмена</button>
        <button
          className="btn"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? '[ ... ] Обработка...' : '[ ИМПОРТИРОВАТЬ ]'}
        </button>
      </div>
    </div>
  )
}
