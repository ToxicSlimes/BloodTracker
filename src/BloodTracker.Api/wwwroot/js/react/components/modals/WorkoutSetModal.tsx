import React, { useState, useCallback } from 'react'
import { workoutsApi } from '../../../api.js'
import { state } from '../../../state.js'
import { toast } from '../../components/Toast.js'
import type { WorkoutSetDto } from '../../../types/index.js'

interface Props {
  exerciseId: string
  setId?: string
  onSave: () => void
  closeModal: () => void
}

function formatDurationForInput(duration: string | undefined | null): string {
  if (!duration || typeof duration !== 'string') return ''
  const parts = duration.split(':')
  if (parts.length === 3) {
    return `${parts[0]}:${parts[1]}:${parts[2]}`
  }
  return duration
}

function parseDuration(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':').map(p => parseInt(p) || 0)
  if (parts.length === 3) {
    return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}:${String(parts[2]).padStart(2, '0')}`
  }
  if (parts.length === 2) {
    return `00:${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`
  }
  return null
}

export default function WorkoutSetModal({ exerciseId, setId, onSave, closeModal }: Props) {
  const existing = setId
    ? ((state.workoutSets as Record<string, WorkoutSetDto[]>)[exerciseId] || []).find(s => s.id === setId)
    : null

  const [repetitions, setRepetitions] = useState(existing?.repetitions != null ? String(existing.repetitions) : '')
  const [weight, setWeight] = useState(existing?.weight != null ? String(existing.weight) : '')
  const [duration, setDuration] = useState(formatDurationForInput(existing?.duration))
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    const parsedDuration = parseDuration(duration)

    const data = {
      exerciseId,
      repetitions: repetitions ? parseInt(repetitions) : null,
      weight: weight ? parseFloat(weight) : null,
      duration: parsedDuration,
      notes: notes.trim() || null,
    }

    setSaving(true)
    try {
      if (setId && existing) {
        await workoutsApi.sets.update(setId, data)
        const sets = (state.workoutSets as Record<string, WorkoutSetDto[]>)[exerciseId] || []
        const index = sets.findIndex(s => s.id === setId)
        if (index !== -1) {
          sets[index] = { ...sets[index], ...data }
        }
      } else {
        const created = await workoutsApi.sets.create(data) as WorkoutSetDto
        if (!(state.workoutSets as any)[exerciseId]) {
          ;(state.workoutSets as any)[exerciseId] = []
        }
        ;((state.workoutSets as any)[exerciseId] as WorkoutSetDto[]).push(created)
      }
      onSave()
      closeModal()
    } catch (e) {
      console.error('Failed to save workout set:', e)
      toast.error('Ошибка сохранения подхода')
    } finally {
      setSaving(false)
    }
  }, [exerciseId, setId, repetitions, weight, duration, notes, existing, onSave, closeModal])

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>{setId ? '[ РЕДАКТИРОВАТЬ ПОДХОД ]' : '[ СОЗДАТЬ ПОДХОД ]'}</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>
      <div className="modal-body">
        <div className="form-row">
          <div className="form-group">
            <label>Повторения</label>
            <input
              type="number"
              value={repetitions}
              onChange={e => setRepetitions(e.target.value)}
              placeholder="12"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Вес (кг)</label>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="50"
              min="0"
              step="0.5"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Длительность (ЧЧ:ММ:СС или ММ:СС)</label>
          <input
            type="text"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="01:30 или 00:01:30"
          />
        </div>
        <div className="form-group">
          <label>Заметки</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Заметки (необязательно)"
            rows={2}
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
