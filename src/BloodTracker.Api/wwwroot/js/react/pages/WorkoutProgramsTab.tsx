import React, { useState, useEffect, useCallback, useRef } from 'react'
import { workoutsApi, workoutSessionsApi } from '../../api.js'
import { state } from '../../state.js'
import { toast } from '../components/Toast.js'
import { switchWorkoutSubTab } from '../../components/navigation.js'
import { useAppState } from '../hooks/useAppState.js'
import { useModal } from '../contexts/ModalContext.js'
import { parseDayOfWeek } from '../../utils.js'
import WorkoutProgramModal from '../components/modals/WorkoutProgramModal.js'
import WorkoutDayModal from '../components/modals/WorkoutDayModal.js'
import WorkoutExerciseModal from '../components/modals/WorkoutExerciseModal.js'
import WorkoutSetModal from '../components/modals/WorkoutSetModal.js'
import type { WorkoutProgramDto, WorkoutDayDto, WorkoutExerciseDto, WorkoutSetDto } from '../../types/index.js'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DAY_NAMES: Record<number, string> = {
  0: 'Воскресенье', 1: 'Понедельник', 2: 'Вторник', 3: 'Среда',
  4: 'Четверг', 5: 'Пятница', 6: 'Суббота',
}

const MUSCLE_GROUP_NAMES: Record<number, string> = {
  0: 'Все тело', 1: 'Грудь', 2: 'Спина', 3: 'Плечи', 4: 'Бицепс',
  5: 'Трицепс', 6: 'Предплечья', 7: 'Пресс', 8: 'Ягодицы',
  9: 'Квадрицепс', 10: 'Бицепс бедра', 11: 'Икры',
}

function formatDuration(duration: string): string {
  if (typeof duration === 'string') {
    const parts = duration.split(':')
    if (parts.length === 3) {
      const h = parseInt(parts[0])
      const m = parseInt(parts[1])
      const s = parseInt(parts[2])
      if (h > 0) return `${h}ч ${m}м ${s}с`
      if (m > 0) return `${m}м ${s}с`
      return `${s}с`
    }
  }
  return duration
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSCLE ASCII
// ═══════════════════════════════════════════════════════════════════════════════

function MuscleAsciiPanel({ muscleGroup }: { muscleGroup: number | null }) {
  const ref = useRef<HTMLPreElement>(null)
  const lastGroupRef = useRef<number | null>(null)

  useEffect(() => {
    if (!ref.current || muscleGroup == null) {
      if (ref.current) ref.current.textContent = ''
      lastGroupRef.current = null
      return
    }
    if (muscleGroup === lastGroupRef.current) return
    lastGroupRef.current = muscleGroup

    import('../../components/muscleAscii.js').then(({ renderMuscleAscii }) => {
      if (!ref.current) return
      ref.current.textContent = ''
      ref.current.insertAdjacentHTML('afterbegin', renderMuscleAscii(muscleGroup))

      // Scale ASCII art to fit container
      setTimeout(() => {
        if (!ref.current) return
        const highlight = ref.current.querySelector('.muscle-ascii-highlight') as HTMLElement | null
        if (!highlight) return
        highlight.style.transform = ''
        const containerWidth = ref.current.clientWidth
        const isMobile = window.innerWidth <= 480
        if (isMobile) {
          highlight.style.fontSize = ''
          highlight.style.transform = ''
          return
        }
        highlight.style.fontSize = containerWidth < 400 ? '4px' : '8px'
        const cw = containerWidth - 32
        const ch = ref.current.clientHeight - 60
        if (cw <= 0 || ch <= 0) return
        const nw = highlight.scrollWidth
        const nh = highlight.scrollHeight
        if (nw <= cw && nh <= ch) return
        const scale = Math.min(cw / nw, ch / nh, 1)
        highlight.style.transformOrigin = 'top center'
        highlight.style.transform = `scale(${scale})`
      }, 10)
    })
  }, [muscleGroup])

  return <pre ref={ref} className="muscle-ascii" />
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAMS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function ProgramsPanel({
  programs,
  selectedId,
  onSelect,
  onOpenModal,
}: {
  programs: WorkoutProgramDto[]
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenModal: (programId?: string) => void
}) {
  if (programs.length === 0) {
    return (
      <div className="empty-state">
        <p>Нет программ тренировок</p>
        <button className="btn-primary" onClick={() => onOpenModal()}>
          Создать программу
        </button>
      </div>
    )
  }

  return (
    <>
      {programs.map(program => (
        <div
          key={program.id}
          className={`workout-program-card${selectedId === program.id ? ' active' : ''}`}
          onClick={() => onSelect(program.id)}
        >
          <div className="workout-program-title">{program.title}</div>
          {program.notes && <div className="workout-program-notes">{program.notes}</div>}
          <div className="workout-program-actions">
            <button className="btn-small" onClick={e => { e.stopPropagation(); onOpenModal(program.id) }}>
              Редактировать
            </button>
            <button className="btn-small btn-danger" onClick={e => { e.stopPropagation(); deleteProgram(program.id) }}>
              Удалить
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

async function deleteProgram(id: string): Promise<void> {
  if (!confirm('Удалить программу тренировок?')) return
  try {
    await workoutsApi.programs.remove(id)
    state.workoutPrograms = (state.workoutPrograms as WorkoutProgramDto[]).filter(p => p.id !== id)
    if (state.selectedProgramId === id) {
      state.selectedProgramId = (state.workoutPrograms as WorkoutProgramDto[]).length > 0
        ? (state.workoutPrograms as WorkoutProgramDto[])[0].id : null
    }
  } catch (e) {
    console.error('Failed to delete workout program:', e)
    toast.error('Ошибка удаления программы')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAYS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function DaysPanel({
  programId,
  days,
  selectedId,
  onSelect,
  onOpenModal,
}: {
  programId: string
  days: WorkoutDayDto[]
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenModal: (programId: string, dayId?: string) => void
}) {
  if (days.length === 0) {
    return (
      <div className="empty-state">
        <p>Нет дней в программе</p>
        <button className="btn-small" onClick={() => onOpenModal(programId)}>
          Добавить день
        </button>
      </div>
    )
  }

  return (
    <>
      {days.map(day => (
        <div
          key={day.id}
          className={`workout-day-card${selectedId === day.id ? ' active' : ''}`}
          onClick={() => onSelect(day.id)}
        >
          <div className="workout-day-name">{DAY_NAMES[parseDayOfWeek(day.dayOfWeek)]}</div>
          {day.title && <div className="workout-day-title">{day.title}</div>}
          <div className="workout-day-actions">
            <button className="btn-primary" style={{ marginBottom: 8 }} onClick={e => { e.stopPropagation(); startWorkoutFromDay(day.id) }}>
              {'\u25B6'} НАЧАТЬ ТРЕНИРОВКУ
            </button>
            <button className="btn-small" onClick={e => { e.stopPropagation(); duplicateDay(programId, day.id) }} title="Дублировать день">
              {'\uD83D\uDCCB'}
            </button>
            <button className="btn-small" onClick={e => { e.stopPropagation(); onOpenModal(programId, day.id) }}>
              Редактировать
            </button>
            <button className="btn-small btn-danger" onClick={e => { e.stopPropagation(); deleteDay(day.id) }}>
              Удалить
            </button>
          </div>
        </div>
      ))}
      <button className="btn-small btn-add" onClick={() => onOpenModal(programId)}>
        + Добавить день
      </button>
    </>
  )
}

async function deleteDay(id: string): Promise<void> {
  if (!confirm('Удалить день тренировки?')) return
  try {
    await workoutsApi.days.remove(id)
    delete (state.workoutDays as any)[state.selectedProgramId!]
    if (state.selectedDayId === id) state.selectedDayId = null
  } catch (e) {
    console.error('Failed to delete workout day:', e)
    toast.error('Ошибка удаления дня')
  }
}

async function duplicateDay(programId: string, sourceDayId: string): Promise<void> {
  const allDays = ((state.workoutDays as any)[programId] || []) as WorkoutDayDto[]
  const sourceDay = allDays.find(d => d.id === sourceDayId)
  if (!sourceDay) { toast.warning('День не найден'); return }

  const existingDayNums = allDays.map(d => parseDayOfWeek(d.dayOfWeek))
  const sourceDow = parseDayOfWeek(sourceDay.dayOfWeek)
  const available = Object.entries(DAY_NAMES)
    .map(([k, name]) => ({ index: Number(k), name, exists: existingDayNums.includes(Number(k)), isSource: Number(k) === sourceDow }))
    .filter(d => !d.isSource)

  let message = `В какие дни недели скопировать тренировку "${sourceDay.title || DAY_NAMES[sourceDow]}"?\n\n`
  message += 'Доступные дни:\n'
  available.forEach(d => { message += `${d.index} - ${d.name}${d.exists ? ' (существует, будет перезаписан)' : ''}\n` })
  message += '\nВведите номера дней через запятую (например: 2,4 для Среда и Пятница):'

  const input = prompt(message, '2,4')
  if (input === null || !input.trim()) return

  const dayNumbers = input.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 6 && n !== sourceDow)
  if (dayNumbers.length === 0) { toast.warning('Неверный ввод'); return }

  const daysToOverwrite = dayNumbers.filter(n => existingDayNums.includes(n))
  if (daysToOverwrite.length > 0) {
    const overwriteNames = daysToOverwrite.map(n => DAY_NAMES[n]).join(', ')
    if (!confirm(`Дни ${overwriteNames} уже существуют. Перезаписать их?`)) return
  }

  try {
    for (const dayOfWeek of dayNumbers) {
      const existingDay = allDays.find(d => d.dayOfWeek === dayOfWeek)
      if (existingDay) {
        const exs = await workoutsApi.exercises.listByDay(existingDay.id) as WorkoutExerciseDto[]
        for (const ex of exs) {
          const sets = await workoutsApi.sets.listByExercise(ex.id) as WorkoutSetDto[]
          for (const set of sets) await workoutsApi.sets.remove(set.id)
          await workoutsApi.exercises.remove(ex.id)
        }
        await workoutsApi.days.remove(existingDay.id)
      }

      const newDay = await workoutsApi.days.create({
        programId, dayOfWeek, title: sourceDay.title || null, notes: sourceDay.notes || null,
      }) as WorkoutDayDto

      const sourceExercises = await workoutsApi.exercises.listByDay(sourceDayId) as WorkoutExerciseDto[]
      for (const exercise of sourceExercises) {
        const newEx = await workoutsApi.exercises.create({
          programId, dayId: newDay.id, name: exercise.name, muscleGroup: exercise.muscleGroup, notes: exercise.notes || null,
        }) as WorkoutExerciseDto
        const sourceSets = await workoutsApi.sets.listByExercise(exercise.id) as WorkoutSetDto[]
        for (const set of sourceSets) {
          await workoutsApi.sets.create({
            exerciseId: newEx.id, repetitions: set.repetitions, weight: set.weight, duration: set.duration, notes: set.notes || null,
          })
        }
      }
    }

    delete (state.workoutDays as any)[programId]
    toast.success(`Тренировка скопирована в: ${dayNumbers.map(n => DAY_NAMES[n]).join(', ')}!`)
  } catch (e) {
    console.error('Failed to duplicate workout day:', e)
    toast.error('Ошибка копирования дня')
  }
}

async function startWorkoutFromDay(dayId: string): Promise<void> {
  try {
    const activeSession = await workoutSessionsApi.getActive() as any
    if (activeSession) {
      const confirmed = confirm('У вас уже есть активная тренировка. Хотите продолжить её или начать новую? (OK = Продолжить, Cancel = Начать новую)')
      if (confirmed) { switchWorkoutSubTab('training'); return }
      await workoutSessionsApi.abandon(activeSession.id)
      toast.info('Предыдущая тренировка отменена')
    }
    const session = await workoutSessionsApi.start({ sourceDayId: dayId }) as any
    state.activeWorkoutSession = session
    toast.success('Тренировка начата!')
    switchWorkoutSubTab('training')
  } catch (err) {
    console.error('Failed to start workout:', err)
    toast.error('Ошибка начала тренировки')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISES PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function ExercisesPanel({
  dayId,
  exercises,
  selectedId,
  onSelect,
  onOpenModal,
}: {
  dayId: string
  exercises: WorkoutExerciseDto[]
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenModal: (dayId: string, exerciseId?: string) => void
}) {
  if (exercises.length === 0) {
    return (
      <div className="empty-state">
        <p>Нет упражнений</p>
        <button className="btn-small" onClick={() => onOpenModal(dayId)}>
          Добавить упражнение
        </button>
      </div>
    )
  }

  return (
    <>
      {exercises.map(exercise => (
        <div
          key={exercise.id}
          className={`workout-exercise-card${selectedId === exercise.id ? ' active' : ''}`}
          onClick={() => onSelect(exercise.id)}
        >
          <div className="workout-exercise-title">{exercise.name}</div>
          <div className="workout-exercise-muscle">Группа: {MUSCLE_GROUP_NAMES[exercise.muscleGroup as number] || 'Неизвестно'}</div>
          <div className="workout-exercise-actions">
            <button className="btn-small" onClick={e => { e.stopPropagation(); duplicateExercise(dayId, exercise.id) }} title="Дублировать упражнение">
              {'\uD83D\uDCCB'}
            </button>
            <button className="btn-small" onClick={e => { e.stopPropagation(); onOpenModal(dayId, exercise.id) }}>
              Редактировать
            </button>
            <button className="btn-small btn-danger" onClick={e => { e.stopPropagation(); deleteExercise(exercise.id) }}>
              Удалить
            </button>
          </div>
        </div>
      ))}
      <button className="btn-small btn-add" onClick={() => onOpenModal(dayId)}>
        + Добавить упражнение
      </button>
    </>
  )
}

async function deleteExercise(id: string): Promise<void> {
  if (!confirm('Удалить упражнение?')) return
  try {
    await workoutsApi.exercises.remove(id)
    delete (state.workoutExercises as any)[state.selectedDayId!]
    if (state.selectedExerciseId === id) state.selectedExerciseId = null
  } catch (e) {
    console.error('Failed to delete workout exercise:', e)
    toast.error('Ошибка удаления упражнения')
  }
}

async function duplicateExercise(dayId: string, exerciseId: string): Promise<void> {
  const exercises = ((state.workoutExercises as any)[dayId] || []) as WorkoutExerciseDto[]
  const exercise = exercises.find(e => e.id === exerciseId)
  if (!exercise) { toast.warning('Упражнение не найдено'); return }

  const programId = state.selectedProgramId
  if (!programId) { toast.error('Ошибка: не выбрана программа'); return }

  try {
    const newEx = await workoutsApi.exercises.create({
      programId, dayId, name: exercise.name, muscleGroup: exercise.muscleGroup, notes: exercise.notes || null,
    }) as WorkoutExerciseDto

    const sourceSets = await workoutsApi.sets.listByExercise(exerciseId) as WorkoutSetDto[]
    for (const set of sourceSets) {
      await workoutsApi.sets.create({
        exerciseId: newEx.id, repetitions: set.repetitions, weight: set.weight, duration: set.duration, notes: set.notes || null,
      })
    }

    delete (state.workoutExercises as any)[dayId]
  } catch (e) {
    console.error('Failed to duplicate workout exercise:', e)
    toast.error('Ошибка копирования упражнения')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function SetsPanel({
  exerciseId,
  sets,
  onOpenModal,
}: {
  exerciseId: string
  sets: WorkoutSetDto[]
  onOpenModal: (exerciseId: string, setId?: string) => void
}) {
  if (sets.length === 0) {
    return (
      <div className="empty-state">
        <p>Нет подходов</p>
        <button className="btn-small" onClick={() => onOpenModal(exerciseId)}>
          Добавить подход
        </button>
      </div>
    )
  }

  return (
    <>
      {sets.map((set, index) => (
        <div className="workout-set-card" key={set.id}>
          <div className="workout-set-header">
            <span>Подход {index + 1}</span>
            <div className="workout-set-actions">
              <button className="btn-small" onClick={() => duplicateSet(exerciseId, set.id)} title="Дублировать подход">
                {'\uD83D\uDCCB'}
              </button>
              <button className="btn-small" onClick={() => onOpenModal(exerciseId, set.id)}>
                Редактировать
              </button>
              <button className="btn-small btn-danger" onClick={() => deleteSet(set.id)}>
                Удалить
              </button>
            </div>
          </div>
          <div className="workout-set-details">
            {set.repetitions ? <span>{set.repetitions} повторений</span> : null}
            {set.weight ? <span>{set.weight} кг</span> : null}
            {set.duration ? <span>{formatDuration(set.duration)}</span> : null}
          </div>
          {set.notes && <div className="workout-set-notes">{set.notes}</div>}
        </div>
      ))}
      <button className="btn-small btn-add" onClick={() => onOpenModal(exerciseId)}>
        + Добавить подход
      </button>
    </>
  )
}

async function deleteSet(id: string): Promise<void> {
  if (!confirm('Удалить подход?')) return
  try {
    await workoutsApi.sets.remove(id)
    delete (state.workoutSets as any)[state.selectedExerciseId!]
  } catch (e) {
    console.error('Failed to delete workout set:', e)
    toast.error('Ошибка удаления подхода')
  }
}

async function duplicateSet(exerciseId: string, setId: string): Promise<void> {
  const sets = ((state.workoutSets as any)[exerciseId] || []) as WorkoutSetDto[]
  const set = sets.find(s => s.id === setId)
  if (!set) { toast.warning('Подход не найден'); return }

  try {
    await workoutsApi.sets.create({
      exerciseId, repetitions: set.repetitions, weight: set.weight, duration: set.duration, notes: set.notes || null,
    })
    delete (state.workoutSets as any)[exerciseId]
  } catch (e) {
    console.error('Failed to duplicate workout set:', e)
    toast.error('Ошибка копирования подхода')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function WorkoutProgramsTab() {
  const { openModal, closeModal } = useModal()
  const [refreshKey, setRefreshKey] = useState(0)

  const programs = useAppState('workoutPrograms') as WorkoutProgramDto[]
  const allDays = useAppState('workoutDays') as Record<string, WorkoutDayDto[]>
  const allExercises = useAppState('workoutExercises') as Record<string, WorkoutExerciseDto[]>
  const allSets = useAppState('workoutSets') as Record<string, WorkoutSetDto[]>
  const selectedProgramId = useAppState('selectedProgramId')
  const selectedDayId = useAppState('selectedDayId')
  const selectedExerciseId = useAppState('selectedExerciseId')

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // ── Modal openers ──────────────────────────────────────────────────────────

  const openProgramModal = useCallback((programId?: string) => {
    openModal(
      <WorkoutProgramModal
        programId={programId}
        onSave={handleRefresh}
        closeModal={closeModal}
      />
    )
  }, [openModal, closeModal, handleRefresh])

  const openDayModal = useCallback((programId: string, dayId?: string) => {
    openModal(
      <WorkoutDayModal
        programId={programId}
        dayId={dayId}
        onSave={handleRefresh}
        closeModal={closeModal}
      />
    )
  }, [openModal, closeModal, handleRefresh])

  const openExerciseModal = useCallback((dayId: string, exerciseId?: string) => {
    openModal(
      <WorkoutExerciseModal
        dayId={dayId}
        exerciseId={exerciseId}
        onSave={handleRefresh}
        closeModal={closeModal}
      />
    )
  }, [openModal, closeModal, handleRefresh])

  const openSetModal = useCallback((exerciseId: string, setId?: string) => {
    openModal(
      <WorkoutSetModal
        exerciseId={exerciseId}
        setId={setId}
        onSave={handleRefresh}
        closeModal={closeModal}
      />
    )
  }, [openModal, closeModal, handleRefresh])

  // Load programs on mount
  useEffect(() => {
    if (programs.length === 0) {
      workoutsApi.programs.list().then((progs: unknown) => {
        const p = progs as WorkoutProgramDto[]
        state.workoutPrograms = p
        if (p.length > 0 && !state.selectedProgramId) {
          state.selectedProgramId = p[0].id
        }
      }).catch(e => console.error('Failed to load programs:', e))
    }
  }, [])

  // Load days when program selected
  useEffect(() => {
    if (!selectedProgramId) return
    if (allDays[selectedProgramId]) return
    workoutsApi.days.listByProgram(selectedProgramId).then((days: unknown) => {
      const d = (days as WorkoutDayDto[]).sort((a, b) => (parseDayOfWeek(a.dayOfWeek) || 7) - (parseDayOfWeek(b.dayOfWeek) || 7))
      ;(state.workoutDays as any)[selectedProgramId] = d
    }).catch(e => console.error('Failed to load days:', e))
  }, [selectedProgramId, allDays])

  // Load exercises when day selected
  useEffect(() => {
    if (!selectedDayId) return
    if (allExercises[selectedDayId]) return
    workoutsApi.exercises.listByDay(selectedDayId).then((exercises: unknown) => {
      ;(state.workoutExercises as any)[selectedDayId] = exercises as WorkoutExerciseDto[]
    }).catch(e => console.error('Failed to load exercises:', e))
  }, [selectedDayId, allExercises])

  // Load sets when exercise selected
  useEffect(() => {
    if (!selectedExerciseId) return
    if (allSets[selectedExerciseId]) return
    workoutsApi.sets.listByExercise(selectedExerciseId).then((sets: unknown) => {
      ;(state.workoutSets as any)[selectedExerciseId] = sets as WorkoutSetDto[]
    }).catch(e => console.error('Failed to load sets:', e))
  }, [selectedExerciseId, allSets])

  const selectProgram = useCallback((id: string) => {
    state.selectedProgramId = id
    state.selectedDayId = null
    state.selectedExerciseId = null
  }, [])

  const selectDay = useCallback((id: string) => {
    state.selectedDayId = id
    state.selectedExerciseId = null
  }, [])

  const selectExercise = useCallback((id: string) => {
    state.selectedExerciseId = id
  }, [])

  // Resolve current data slices
  const days = selectedProgramId ? (allDays[selectedProgramId] || []) : []
  const exercises = selectedDayId ? (allExercises[selectedDayId] || []) : []
  const sets = selectedExerciseId ? (allSets[selectedExerciseId] || []) : []

  // Selected exercise muscle group for ASCII
  const selectedExercise = selectedExerciseId
    ? exercises.find((e: WorkoutExerciseDto) => e.id === selectedExerciseId)
    : null
  const muscleGroup = selectedExercise ? (selectedExercise.muscleGroup as number) : null

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title" data-asciify="md">[ ТРЕНИРОВКИ НЕДЕЛИ ]</div>
        <button className="btn-primary" onClick={() => openProgramModal()}>
          + Создать программу
        </button>
      </div>
      <div className="workouts-layout">
        <div className="workouts-panel">
          <div className="workouts-panel-title">[ ПРОГРАММЫ ]</div>
          <div className="workout-programs">
            <ProgramsPanel programs={programs} selectedId={selectedProgramId} onSelect={selectProgram} onOpenModal={openProgramModal} />
          </div>
        </div>
        <div className="workouts-panel">
          <div className="workouts-panel-title">[ ДНИ НЕДЕЛИ ]</div>
          <div className="workout-days">
            {selectedProgramId ? (
              <DaysPanel programId={selectedProgramId} days={days} selectedId={selectedDayId} onSelect={selectDay} onOpenModal={openDayModal} />
            ) : (
              <div className="empty-state"><p>Выберите программу</p></div>
            )}
          </div>
        </div>
        <div className="workouts-panel">
          <div className="workouts-panel-title">[ УПРАЖНЕНИЯ ]</div>
          <div className="workout-exercises">
            {selectedDayId ? (
              <ExercisesPanel dayId={selectedDayId} exercises={exercises} selectedId={selectedExerciseId} onSelect={selectExercise} onOpenModal={openExerciseModal} />
            ) : (
              <div className="empty-state"><p>Выберите день</p></div>
            )}
          </div>
        </div>
        <div className="workouts-panel">
          <div className="workouts-panel-title">[ ПОДХОДЫ ]</div>
          <div className="workout-sets">
            {selectedExerciseId ? (
              <SetsPanel exerciseId={selectedExerciseId} sets={sets} onOpenModal={openSetModal} />
            ) : (
              <div className="empty-state"><p>Выберите упражнение</p></div>
            )}
          </div>
        </div>
        <div className="workouts-panel">
          <div className="workouts-panel-title">[ ГРУППА МЫШЦ ]</div>
          <MuscleAsciiPanel muscleGroup={muscleGroup} />
        </div>
      </div>
    </div>
  )
}
