import React, { useState, useEffect, useCallback, useRef } from 'react'
import { api, catalogApi } from '../../../api.js'
import { ENDPOINTS } from '../../../endpoints.js'
import { state } from '../../../state.js'
import { toast } from '../../components/Toast.js'
import type { DrugDto } from '../../../types/index.js'
import type { DrugCatalogItem, Manufacturer } from '../../../types/catalog.js'

interface Props {
  drugId?: string
  onSave: () => void
  closeModal: () => void
}

const CATEGORY_NAMES: Record<number, string> = {
  0: 'AAC', 1: 'Пептиды', 2: 'SARMs', 3: 'ПКТ', 4: 'Жиросжигатели',
  5: 'Гормон роста', 6: 'Антиэстрогены', 7: 'Инсулин', 8: 'Прогормоны',
  9: 'Агонисты дофамина', 10: 'Другое',
}

const TYPE_NAMES: Record<number, string> = {
  0: 'Oral', 1: 'Inject', 2: 'SubQ', 3: 'Transdermal', 4: 'Nasal',
}

export default function DrugModal({ drugId, onSave, closeModal }: Props) {
  const existing = drugId
    ? (state.drugs as DrugDto[]).find(d => d.id === drugId)
    : null

  // Form fields
  const [name, setName] = useState(existing?.name || '')
  const [type, setType] = useState<number>(existing?.type ?? 0)
  const [dosage, setDosage] = useState(existing?.dosage || '')
  const [amount, setAmount] = useState(existing?.amount || '')
  const [schedule, setSchedule] = useState(existing?.schedule || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [catalogItemId, setCatalogItemId] = useState(existing?.catalogItemId || '')
  const [manufacturerId, setManufacturerId] = useState(existing?.manufacturerId || '')

  // Catalog search
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogItems, setCatalogItems] = useState<DrugCatalogItem[]>([])
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const [selectedSubstance, setSelectedSubstance] = useState<DrugCatalogItem | null>(null)

  // Manufacturer search
  const [mfrSearch, setMfrSearch] = useState('')
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [showMfrDropdown, setShowMfrDropdown] = useState(false)

  const [saving, setSaving] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(false)

  const catalogRef = useRef<HTMLDivElement>(null)
  const mfrRef = useRef<HTMLDivElement>(null)

  // Load catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      if (state.catalogLoaded) {
        setCatalogItems(state.drugCatalog as DrugCatalogItem[])
        setManufacturers(state.manufacturers as Manufacturer[])
        return
      }
      setCatalogLoading(true)
      try {
        const [substances, mfrs] = await Promise.all([
          catalogApi.substances(),
          catalogApi.manufacturers(),
        ])
        state.drugCatalog = substances as DrugCatalogItem[]
        state.manufacturers = mfrs as Manufacturer[]
        state.catalogLoaded = true
        setCatalogItems(substances as DrugCatalogItem[])
        setManufacturers(mfrs as Manufacturer[])
      } catch (e) {
        console.error('Failed to load catalog:', e)
      } finally {
        setCatalogLoading(false)
      }
    }
    loadCatalog()
  }, [])

  // Pre-fill catalog/manufacturer names for edit mode
  useEffect(() => {
    if (existing?.catalogItemId && catalogItems.length > 0) {
      const item = catalogItems.find(s => s.id === existing.catalogItemId)
      if (item) {
        setCatalogSearch(item.name)
        setSelectedSubstance(item)
      }
    }
    if (existing?.manufacturerId && manufacturers.length > 0) {
      const mfr = manufacturers.find(m => m.id === existing.manufacturerId)
      if (mfr) setMfrSearch(mfr.name)
    }
  }, [existing, catalogItems, manufacturers])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        setShowCatalogDropdown(false)
      }
      if (mfrRef.current && !mfrRef.current.contains(e.target as Node)) {
        setShowMfrDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Filter catalog items
  const filteredCatalog = useCallback(() => {
    const q = catalogSearch.toLowerCase()
    let items = catalogItems
    if (q.length > 0) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
        (item.activeSubstance && item.activeSubstance.toLowerCase().includes(q))
      )
    }
    // Sort: popular first
    items = [...items].sort((a, b) => {
      if (a.meta?.isPopular && !b.meta?.isPopular) return -1
      if (!a.meta?.isPopular && b.meta?.isPopular) return 1
      return (a.meta?.sortOrder || 0) - (b.meta?.sortOrder || 0)
    })
    // Group by category
    const groups: Record<string, DrugCatalogItem[]> = {}
    items.forEach(item => {
      const cat = CATEGORY_NAMES[item.category] || 'Другое'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    return groups
  }, [catalogSearch, catalogItems])

  // Filter manufacturers
  const filteredMfrs = useCallback(() => {
    const q = mfrSearch.toLowerCase()
    if (q.length === 0) return manufacturers
    return manufacturers.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.country && m.country.toLowerCase().includes(q))
    )
  }, [mfrSearch, manufacturers])

  const selectSubstance = useCallback((item: DrugCatalogItem) => {
    setCatalogItemId(item.id)
    setCatalogSearch(item.name)
    setName(item.name)
    setType(item.drugType)
    setSelectedSubstance(item)
    setShowCatalogDropdown(false)
  }, [])

  const clearSubstance = useCallback(() => {
    setCatalogItemId('')
    setCatalogSearch('')
    setSelectedSubstance(null)
  }, [])

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
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.warning('Введите название')
      return
    }

    const data = {
      name: trimmedName,
      type,
      dosage: dosage.trim(),
      amount: amount.trim(),
      schedule: schedule.trim(),
      notes: notes.trim(),
      courseId: state.currentCourse?.id || null,
      catalogItemId: catalogItemId || null,
      manufacturerId: manufacturerId || null,
    }

    setSaving(true)
    try {
      if (drugId) {
        await api(ENDPOINTS.drugs.update(drugId), { method: 'PUT', body: JSON.stringify(data) })
      } else {
        await api(ENDPOINTS.drugs.create, { method: 'POST', body: JSON.stringify(data) })
      }
      // Reload drugs into state
      const drugs = await api<DrugDto[]>(ENDPOINTS.drugs.list)
      state.drugs = drugs
      onSave()
      closeModal()
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message)
    } finally {
      setSaving(false)
    }
  }, [name, type, dosage, amount, schedule, notes, catalogItemId, manufacturerId, drugId, onSave, closeModal])

  const groups = filteredCatalog()
  const mfrList = filteredMfrs()

  return (
    <div className="modal modal-lg" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>{drugId ? '[ РЕДАКТИРОВАТЬ ПРЕПАРАТ ]' : '[ ДОБАВИТЬ ПРЕПАРАТ ]'}</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>
      <div className="modal-body">
        {/* Catalog search */}
        <div className="form-group" ref={catalogRef}>
          <label>Поиск в каталоге</label>
          <div className="catalog-autocomplete">
            <input
              type="text"
              value={catalogSearch}
              onChange={e => { setCatalogSearch(e.target.value); setShowCatalogDropdown(true) }}
              onFocus={() => setShowCatalogDropdown(true)}
              placeholder={catalogLoading ? 'Загрузка каталога...' : 'Поиск субстанции...'}
              disabled={catalogLoading}
            />
            {catalogItemId && (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                onClick={clearSubstance}
              >
                X
              </button>
            )}
            {showCatalogDropdown && (
              <div className="catalog-dropdown active" style={{ position: 'absolute', zIndex: 100, width: '100%', maxHeight: 300, overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4 }}>
                {Object.entries(groups).map(([cat, items]) => (
                  <React.Fragment key={cat}>
                    <div className="catalog-dropdown-group" style={{ padding: '4px 8px', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '0.85em' }}>
                      {'═ ' + cat + ' ═'}
                    </div>
                    {items.slice(0, catalogSearch.length > 0 ? 20 : 8).map(item => (
                      <div
                        key={item.id}
                        className={`catalog-dropdown-item${item.meta?.isPopular ? ' popular' : ''}`}
                        style={{ padding: '6px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => selectSubstance(item)}
                      >
                        <span>
                          <span className="item-name">{item.name}</span>
                          {item.nameEn && <span className="item-name-en" style={{ marginLeft: 8, opacity: 0.6 }}>{item.nameEn}</span>}
                        </span>
                        <span className="item-type-badge" style={{ fontSize: '0.8em', opacity: 0.7 }}>
                          {TYPE_NAMES[item.drugType] || ''}
                        </span>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
                <div
                  className="catalog-dropdown-manual"
                  style={{ padding: '6px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontStyle: 'italic' }}
                  onClick={() => { clearSubstance(); setShowCatalogDropdown(false) }}
                >
                  [ Ввести вручную ]
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Substance info panel */}
        {selectedSubstance && (
          <div className="substance-info-panel active" style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-card)' }}>
            <h4 style={{ color: 'var(--primary-color)', marginBottom: 8 }}>
              {selectedSubstance.name}
              {selectedSubstance.nameEn ? ' / ' + selectedSubstance.nameEn : ''}
            </h4>
            {selectedSubstance.description?.text && (
              <div className="info-row" style={{ marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em' }}>ОПИСАНИЕ: </span>
                {selectedSubstance.description.text}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.9em' }}>
              {selectedSubstance.pharmacology?.halfLife && (
                <div><span style={{ color: 'var(--text-secondary)' }}>T1/2: </span>{selectedSubstance.pharmacology.halfLife}</div>
              )}
              {selectedSubstance.pharmacology?.detectionTime && (
                <div><span style={{ color: 'var(--text-secondary)' }}>Обнаружение: </span>{selectedSubstance.pharmacology.detectionTime}</div>
              )}
              {selectedSubstance.pharmacology?.commonDosages && (
                <div><span style={{ color: 'var(--text-secondary)' }}>Дозировки: </span>{selectedSubstance.pharmacology.commonDosages}</div>
              )}
            </div>
            {selectedSubstance.description?.effects && (
              <div style={{ marginTop: 4, fontSize: '0.9em' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Эффекты: </span>{selectedSubstance.description.effects}
              </div>
            )}
            {selectedSubstance.description?.sideEffects && (
              <div style={{ marginTop: 4, fontSize: '0.9em' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Побочные: </span>{selectedSubstance.description.sideEffects}
              </div>
            )}
          </div>
        )}

        {/* Main form fields */}
        <div className="form-group">
          <label>Название *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Название препарата"
            autoFocus={!drugId}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Тип</label>
            <select value={type} onChange={e => setType(Number(e.target.value))}>
              {Object.entries(TYPE_NAMES).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Дозировка</label>
            <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Например: 250mg/ml" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Количество</label>
            <input type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Например: 10ml" />
          </div>
          <div className="form-group">
            <label>Схема приёма</label>
            <input type="text" value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="Например: E3D" />
          </div>
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

        <div className="form-group">
          <label>Заметки</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительная информация..." />
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
