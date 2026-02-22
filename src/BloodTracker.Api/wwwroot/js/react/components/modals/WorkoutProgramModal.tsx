import React, { useState, useCallback } from 'react'
import { workoutsApi } from '../../../api.js'
import { state } from '../../../state.js'
import { toast } from '../../components/Toast.js'
import type { WorkoutProgramDto } from '../../../types/index.js'

interface Props {
  programId?: string
  onSave: () => void
  closeModal: () => void
}

export default function WorkoutProgramModal({ programId, onSave, closeModal }: Props) {
  const existing = programId
    ? (state.workoutPrograms as WorkoutProgramDto[]).find(p => p.id === programId)
    : null

  const [title, setTitle] = useState(existing?.title || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.warning('Введите название программы')
      return
    }

    const data = {
      title: trimmedTitle,
      notes: notes.trim() || null,
    }

    setSaving(true)
    try {
      if (programId && existing) {
        await workoutsApi.programs.update(programId, data)
        const programs = state.workoutPrograms as WorkoutProgramDto[]
        const index = programs.findIndex(p => p.id === programId)
        if (index !== -1) {
          programs[index] = { ...programs[index], ...data }
        }
      } else {
        const created = await workoutsApi.programs.create(data) as WorkoutProgramDto
        ;(state.workoutPrograms as WorkoutProgramDto[]).push(created)
      }
      onSave()
      closeModal()
    } catch (e) {
      console.error('Failed to save workout program:', e)
      toast.error('Ошибка сохранения программы')
    } finally {
      setSaving(false)
    }
  }, [title, notes, programId, existing, onSave, closeModal])

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">
        <h2>{programId ? '[ РЕДАКТИРОВАТЬ ПРОГРАММУ ]' : '[ СОЗДАТЬ ПРОГРАММУ ]'}</h2>
        <button className="modal-close" onClick={closeModal}>&times;</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label>Название программы</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Например: Push/Pull/Legs"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Заметки</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Описание программы (необязательно)"
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
