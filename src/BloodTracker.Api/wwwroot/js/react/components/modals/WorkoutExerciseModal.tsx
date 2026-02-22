import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { workoutsApi, api } from '../../../api.js'
import { ENDPOINTS } from '../../../endpoints.js'
import { state } from '../../../state.js'
import { toast } from '../../components/Toast.js'
import type { WorkoutExerciseDto, ExerciseCatalogEntry } from '../../../types/index.js'

interface Props {
  dayId: string
  exerciseId?: string
  onSave: () => void
  closeModal: () => void
}

const MUSCLE_GROUP_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Все тело' },
  { value: 1, label: 'Грудь' },
  { value: 2, label: 'Спина' },
  { value: 3, label: 'Плечи' },
  { value: 4, label: 'Бицепс' },
  { value: 5, label: 'Трицепс' },
  { value: 6, label: 'Предплечья' },
  { value: 7, label: 'Пресс' },
  { value: 8, label: 'Ягодицы' },
  { value: 9, label: 'Квадрицепс' },
  { value: 10, label: 'Бицепс бедра' },
  { value: 11, label: 'Икры' },
]

// Module-level cache for exercise catalog
let catalogCache: ExerciseCatalogEntry[] | null = null

export default function WorkoutExerciseModal({ dayId, exerciseId, onSave, closeModal }: Props) {
  const existing = exerciseId
    ? ((state.workoutExercises as Record<string, WorkoutExerciseDto[]>)[dayId] || []).find(e => e.id === exerciseId)
    : null

  const [name, setName] = useState(existing?.name || '')
  const [muscleGroup, setMuscleGroup] = useState<number>(existing?.muscleGroup as number ?? 0)
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)

  // Catalog state
  const [catalog, setCatalog] = useState<ExerciseCatalogEntry[]>(catalogCache || [])
  const [catalogLoading, setCatalogLoading] = useState(!catalogCache)
  const [searchText, setSearchText] = useState('')
  const [filterGroup, setFilterGroup] = useState('')

  // Load catalog once
  useEffect(() => {
    if (catalogCache) {
      setCatalog(catalogCache)
      setCatalogLoading(false)
      return
    }

    let cancelled = false
    setCatalogLoading(true)

    api<ExerciseCatalogEntry[]>(ENDPOINTS.exerciseCatalog.list)
      .then(data => {
        if (cancelled) return
        catalogCache = data
        setCatalog(data)
      })
      .catch(e => {
        if (cancelled) return
        console.error('Failed to load exercise catalog:', e)
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    const search = searchText.toLowerCase().trim()
    return catalog.filter(ex => {
      const matchesSearch = !search ||
        (ex.nameRu && ex.nameRu.toLowerCase().includes(search)) ||
        (ex.nameEn && ex.nameEn.toLowerCase().includes(search)) ||
        (ex.bodyPart && ex.bodyPart.toLowerCase().includes(search)) ||
        (ex.target && ex.target.toLowerCase().includes(search)) ||
        (ex.equipment && ex.equipment.toLowerCase().includes(search))
      const matchesFilter = !filterGroup || ex.muscleGroup === parseInt(filterGroup)
      return matchesSearch && matchesFilter
    }).slice(0, 30)
  }, [catalog, searchText, filterGroup])

  const selectFromCatalog = useCallback((ex: ExerciseCatalogEntry) => {
    setName(ex.nameRu)
    setMuscleGroup(ex.muscleGroup ?? 0)
    if (ex.equipment) {
      setNotes(prev => {
        const prefix = `Оборудование: ${ex.equipment}`
        return prev ? `${prefix}\n${prev}` : prefix
      })
    }
  }, [])

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.warning('Введите название упражнения')
      return
    }

    const programId = state.selectedProgramId
    if (!programId) {
      toast.error('Ошибка: не выбрана программа')
      return
    }

    const data = {
      programId,
      dayId,
      name: trimmedName,
      muscleGroup,
      notes: notes.trim() || null,
    }

    setSaving(true)
    try {
      if (exerciseId && existing) {
        await workoutsApi.exercises.update(exerciseId, data)
        const exercises = (state.workoutExercises as Record<string, WorkoutExerciseDto[]>)[dayId] || []
        const index = exercises.findIndex(e => e.id === exerciseId)
        if (index !== -1) {
          exercises[index] = { ...exercises[index], ...data }
        }
      } else {
        const created = await workoutsApi.exercises.create(data) as WorkoutExerciseDto
        if (!(state.workoutExercises as any)[dayId]) {
          ;(state.workoutExercises as any)[dayId] = []
        }
        ;((state.workoutExercises as any)[dayId] as WorkoutExerciseDto[]).push(created)
      }
      onSave()
      closeModal()
    } catch (e) {
      console.error('Failed to save workout exercise:', e)
      toast.error('Ошибка сохранения упражнения')
    } finally {
      setSaving(false)
    }
  }, [name, muscleGroup, notes, dayId, exerciseId, existing, onSave, closeModal])

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>{exerciseId ? '[ РЕДАКТИРОВАТЬ УПРАЖНЕНИЕ ]' : '[ СОЗДАТЬ УПРАЖНЕНИЕ ]'}</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>
      <div className="modal-body">
        {/* Exercise catalog search */}
        <div className="form-group">
          <label>Каталог упражнений</label>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Поиск по каталогу..."
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                <option value="">Все группы</option>
                {MUSCLE_GROUP_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
            {catalogLoading ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
                Загрузка каталога...
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
                {catalog.length === 0 ? 'Каталог пуст. Добавьте упражнение вручную.' : 'Не найдено упражнений'}
              </div>
            ) : (
              filteredCatalog.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => selectFromCatalog(ex)}
                  style={{
                    padding: 10,
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-secondary, rgba(255,255,255,0.05))')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{ex.nameRu}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{ex.nameEn}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {[ex.equipment, ex.exerciseType, ex.category].filter(Boolean).join(' \u2022 ') || 'Без категории'}
                  </div>
                </div>
              ))
            )}
          </div>
          {!catalogLoading && catalog.length > 30 && filteredCatalog.length >= 30 && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4 }}>
              Показано 30 из {catalog.filter(ex => {
                const search = searchText.toLowerCase().trim()
                const matchesSearch = !search ||
                  (ex.nameRu && ex.nameRu.toLowerCase().includes(search)) ||
                  (ex.nameEn && ex.nameEn.toLowerCase().includes(search))
                const matchesFilter = !filterGroup || ex.muscleGroup === parseInt(filterGroup)
                return matchesSearch && matchesFilter
              }).length}
            </div>
          )}
        </div>

        {/* Manual fields */}
        <div className="form-group">
          <label>Название упражнения</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Название упражнения"
          />
        </div>
        <div className="form-group">
          <label>Группа мышц</label>
          <select value={muscleGroup} onChange={e => setMuscleGroup(Number(e.target.value))}>
            {MUSCLE_GROUP_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Заметки</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Заметки (необязательно)"
            rows={3}
          />
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
