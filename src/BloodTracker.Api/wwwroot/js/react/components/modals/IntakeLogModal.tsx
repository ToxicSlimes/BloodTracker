import React, { useState, useEffect, useCallback } from 'react'
import { api, purchaseApi } from '../../../api.js'
import { ENDPOINTS } from '../../../endpoints.js'
import { state } from '../../../state.js'
import { toast } from '../../components/Toast.js'
import { formatDateForInput } from '../../../utils.js'
import type { DrugDto, IntakeLogDto, PurchaseOptionDto } from '../../../types/index.js'

interface Props {
  logId?: string
  onSave: () => void
  closeModal: () => void
}

export default function IntakeLogModal({ logId, onSave, closeModal }: Props) {
  const drugs = state.drugs as DrugDto[]
  const existing = logId
    ? (state.intakeLogs as IntakeLogDto[]).find(l => l.id === logId)
    : null

  const [date, setDate] = useState(() => {
    if (existing) return formatDateForInput(existing.date)
    return new Date().toISOString().split('T')[0]
  })
  const [drugId, setDrugId] = useState(existing?.drugId || (drugs.length > 0 ? drugs[0].id : ''))
  const [purchaseId, setPurchaseId] = useState(existing?.purchaseId || '')
  const [dose, setDose] = useState(existing?.dose || '')
  const [note, setNote] = useState(existing?.note || '')

  const [purchaseOptions, setPurchaseOptions] = useState<PurchaseOptionDto[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)

  // Check drugs availability
  useEffect(() => {
    if (drugs.length === 0) {
      toast.warning('Сначала добавьте препараты')
      closeModal()
    }
  }, [drugs.length, closeModal])

  // Load purchase options when drug changes
  const loadPurchaseOptions = useCallback(async (selectedDrugId: string) => {
    if (!selectedDrugId) {
      setPurchaseOptions([])
      return
    }
    setLoadingOptions(true)
    try {
      const options = await purchaseApi.options(selectedDrugId) as PurchaseOptionDto[]
      setPurchaseOptions(options)
    } catch {
      setPurchaseOptions([])
    } finally {
      setLoadingOptions(false)
    }
  }, [])

  useEffect(() => {
    if (drugId) loadPurchaseOptions(drugId)
  }, [drugId, loadPurchaseOptions])

  // Pre-select purchase for edit mode after options load
  useEffect(() => {
    if (existing?.purchaseId && purchaseOptions.length > 0) {
      setPurchaseId(existing.purchaseId)
    }
  }, [existing, purchaseOptions])

  const handleSave = useCallback(async () => {
    if (!drugId) {
      toast.warning('Выберите препарат')
      return
    }

    const data = {
      date,
      drugId,
      dose: dose.trim(),
      note: note.trim(),
      purchaseId: purchaseId || null,
    }

    setSaving(true)
    try {
      if (logId) {
        await api(ENDPOINTS.intakeLogs.update(logId), { method: 'PUT', body: JSON.stringify(data) })
      } else {
        await api(ENDPOINTS.intakeLogs.create, { method: 'POST', body: JSON.stringify(data) })
      }
      // Reload logs into state
      const logs = await api<IntakeLogDto[]>(ENDPOINTS.intakeLogs.list + '?count=20')
      state.intakeLogs = logs
      onSave()
      closeModal()
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message)
    } finally {
      setSaving(false)
    }
  }, [date, drugId, dose, note, purchaseId, logId, onSave, closeModal])

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>{logId ? '[ РЕДАКТИРОВАТЬ ЗАПИСЬ ]' : '[ ДОБАВИТЬ ЗАПИСЬ ]'}</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label>Дата</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Препарат</label>
          <select value={drugId} onChange={e => { setDrugId(e.target.value); setPurchaseId('') }}>
            {drugs.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Покупка</label>
          <select value={purchaseId} onChange={e => setPurchaseId(e.target.value)} disabled={loadingOptions}>
            <option value="">Авто</option>
            {purchaseOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Доза</label>
          <input type="text" value={dose} onChange={e => setDose(e.target.value)} placeholder="Например: 250mg" />
        </div>

        <div className="form-group">
          <label>Заметка</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Комментарий (необязательно)" />
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
