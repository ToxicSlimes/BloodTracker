import React, { useState, useEffect, useCallback, useRef } from 'react'
import { catalogApi, purchaseApi } from '../../../api.js'
import { state } from '../../../state.js'
import { toast } from '../../components/Toast.js'
import { formatDateForInput } from '../../../utils.js'
import type { DrugDto, PurchaseDto } from '../../../types/index.js'
import type { Manufacturer } from '../../../types/catalog.js'

interface Props {
  purchaseId?: string
  onSave: () => void
  closeModal: () => void
}

export default function PurchaseModal({ purchaseId, onSave, closeModal }: Props) {
  const drugs = state.drugs as DrugDto[]
  const existing = purchaseId
    ? (state.purchases as PurchaseDto[]).find(p => p.id === purchaseId)
    : null

  const [drugId, setDrugId] = useState(existing?.drugId || (drugs.length > 0 ? drugs[0].id : ''))
  const [purchaseDate, setPurchaseDate] = useState(() => {
    if (existing) return formatDateForInput(new Date(existing.purchaseDate))
    return formatDateForInput(new Date())
  })
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : '')
  const [price, setPrice] = useState(existing ? String(existing.price) : '')
  const [vendor, setVendor] = useState(existing?.vendor || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [manufacturerId, setManufacturerId] = useState(existing?.manufacturerId || '')

  // Manufacturer search
  const [mfrSearch, setMfrSearch] = useState('')
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [showMfrDropdown, setShowMfrDropdown] = useState(false)
  const [saving, setSaving] = useState(false)

  const mfrRef = useRef<HTMLDivElement>(null)

  // Load manufacturers on mount
  useEffect(() => {
    async function loadManufacturers() {
      if (state.catalogLoaded) {
        setManufacturers(state.manufacturers as Manufacturer[])
      } else {
        try {
          const [, mfrs] = await Promise.all([
            catalogApi.substances(),
            catalogApi.manufacturers(),
          ])
          state.manufacturers = mfrs as Manufacturer[]
          state.catalogLoaded = true
          setManufacturers(mfrs as Manufacturer[])
        } catch (e) {
          console.error('Failed to load manufacturers:', e)
        }
      }
    }
    loadManufacturers()
  }, [])

  // Pre-fill manufacturer name for edit mode
  useEffect(() => {
    if (existing?.manufacturerId && manufacturers.length > 0) {
      const mfr = manufacturers.find(m => m.id === existing.manufacturerId)
      if (mfr) setMfrSearch(mfr.name)
    }
  }, [existing, manufacturers])

  // Auto-fill manufacturer from selected drug
  useEffect(() => {
    if (!existing && drugId) {
      const drug = drugs.find(d => d.id === drugId)
      if (drug?.manufacturerId) {
        const mfr = manufacturers.find(m => m.id === drug.manufacturerId)
        if (mfr) {
          setManufacturerId(mfr.id)
          setMfrSearch(mfr.name)
          return
        }
      }
      // Clear if drug has no manufacturer (only for new purchases)
      if (!existing) {
        setManufacturerId('')
        setMfrSearch('')
      }
    }
  }, [drugId, drugs, manufacturers, existing])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mfrRef.current && !mfrRef.current.contains(e.target as Node)) {
        setShowMfrDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredMfrs = useCallback(() => {
    const q = mfrSearch.toLowerCase()
    if (q.length === 0) return manufacturers
    return manufacturers.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.country && m.country.toLowerCase().includes(q))
    )
  }, [mfrSearch, manufacturers])

  const selectManufacturer = useCallback((mfr: Manufacturer | null) => {
    if (mfr) {
      setManufacturerId(mfr.id)
      setMfrSearch(mfr.name)
    } else {
      setManufacturerId('')
      setMfrSearch('')
    }
    setShowMfrDropdown(false)
  }, [])

  const handleSave = useCallback(async () => {
    const qty = parseInt(quantity)
    const prc = parseFloat(price) || 0

    if (!drugId || !purchaseDate || !qty || qty <= 0) {
      toast.warning('Заполните обязательные поля: препарат, дата, количество (> 0)')
      return
    }
    if (prc < 0) {
      toast.warning('Цена не может быть отрицательной')
      return
    }

    const data = {
      drugId,
      purchaseDate: new Date(purchaseDate).toISOString(),
      quantity: qty,
      price: prc,
      vendor: vendor.trim() || null,
      notes: notes.trim() || null,
      manufacturerId: manufacturerId || null,
    }

    setSaving(true)
    try {
      if (purchaseId) {
        await purchaseApi.update(purchaseId, data)
      } else {
        await purchaseApi.create(data)
      }
      // Reload purchases into state
      state.purchases = await purchaseApi.list() as PurchaseDto[]
      onSave()
      closeModal()
    } catch (e: any) {
      toast.error('Ошибка сохранения покупки')
      console.error('Failed to save purchase:', e)
    } finally {
      setSaving(false)
    }
  }, [drugId, purchaseDate, quantity, price, vendor, notes, manufacturerId, purchaseId, onSave, closeModal])

  const mfrList = filteredMfrs()

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>{purchaseId ? '[ РЕДАКТИРОВАТЬ ПОКУПКУ ]' : '[ ДОБАВИТЬ ПОКУПКУ ]'}</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label>Препарат *</label>
          <select value={drugId} onChange={e => setDrugId(e.target.value)}>
            {drugs.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Дата покупки *</label>
          <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
        </div>

        {/* Manufacturer search */}
        <div className="form-group" ref={mfrRef}>
          <label>Производитель</label>
          <div className="mfr-dropdown" style={{ position: 'relative' }}>
            <input
              type="text"
              value={mfrSearch}
              onChange={e => { setMfrSearch(e.target.value); setShowMfrDropdown(true) }}
              onFocus={() => setShowMfrDropdown(true)}
              placeholder="Поиск производителя..."
            />
            {showMfrDropdown && (
              <div style={{ position: 'absolute', zIndex: 100, width: '100%', maxHeight: 250, overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4 }}>
                {mfrList.map(m => (
                  <div
                    key={m.id}
                    className="mfr-dropdown-item"
                    style={{ padding: '6px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => selectManufacturer(m)}
                  >
                    <span>
                      <span className="mfr-name">{m.name}</span>
                      {m.country && <span className="mfr-country" style={{ marginLeft: 8, opacity: 0.6 }}>{m.country}</span>}
                    </span>
                    <span className={`mfr-type-badge ${m.type === 0 ? 'mfr-type-pharma' : 'mfr-type-ugl'}`}>
                      {m.type === 0 ? 'PHARMA' : 'UGL'}
                    </span>
                  </div>
                ))}
                <div
                  className="mfr-dropdown-item"
                  style={{ padding: '6px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontStyle: 'italic' }}
                  onClick={() => selectManufacturer(null)}
                >
                  [ Без производителя ]
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Количество (доз) *</label>
            <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Цена</label>
            <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div className="form-group">
          <label>Продавец</label>
          <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Название магазина/аптеки" />
        </div>

        <div className="form-group">
          <label>Заметки</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Комментарий (необязательно)" />
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
