import React, { useState, useCallback } from 'react'
import { workoutsApi } from '../../../api.js'
import { state } from '../../../state.js'
import { toast } from '../../components/Toast.js'
import type { WorkoutDayDto } from '../../../types/index.js'

interface Props {
  programId: string
  dayId?: string
  onSave: () => void
  closeModal: () => void
}

const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 0, label: 'Воскресенье' },
]

export default function WorkoutDayModal({ programId, dayId, onSave, closeModal }: Props) {
  const existing = dayId
    ? ((state.workoutDays as Record<string, WorkoutDayDto[]>)[programId] || []).find(d => d.id === dayId)
    : null

  const [dayOfWeek, setDayOfWeek] = useState(existing?.dayOfWeek ?? 1)
  const [title, setTitle] = useState(existing?.title || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    const data = {
      programId,
      dayOfWeek,
      title: title.trim() || null,
      notes: notes.trim() || null,
    }

    setSaving(true)
    try {
      if (dayId && existing) {
        await workoutsApi.days.update(dayId, data)
        const days = (state.workoutDays as Record<string, WorkoutDayDto[]>)[programId] || []
        const index = days.findIndex(d => d.id === dayId)
        if (index !== -1) {
          days[index] = { ...days[index], ...data }
        }
      } else {
        const created = await workoutsApi.days.create(data) as WorkoutDayDto
        if (!(state.workoutDays as any)[programId]) {
          ;(state.workoutDays as any)[programId] = []
        }
        ;((state.workoutDays as any)[programId] as WorkoutDayDto[]).push(created)
      }
      onSave()
      closeModal()
    } catch (e) {
      console.error('Failed to save workout day:', e)
      toast.error('Ошибка сохранения дня')
    } finally {
      setSaving(false)
    }
  }, [programId, dayId, dayOfWeek, title, notes, existing, onSave, closeModal])

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>{dayId ? '[ РЕДАКТИРОВАТЬ ДЕНЬ ]' : '[ СОЗДАТЬ ДЕНЬ ]'}</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label>День недели</label>
          <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}>
            {DAY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Название</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Например: Грудь + Трицепс (необязательно)"
          />
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
