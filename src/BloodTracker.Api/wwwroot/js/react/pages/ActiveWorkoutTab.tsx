import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { workoutSessionsApi, workoutsApi, api } from '../../api.js'
import { ENDPOINTS } from '../../endpoints.js'
import { state } from '../../state.js'
import { useAppState } from '../hooks/useAppState.js'
import { toast } from '../components/Toast.js'
import { acquireWakeLock, releaseWakeLock } from '../../components/wakeLock.js'
import { startRestTimer, initRestTimer } from '../../components/restTimer.js'
import { showPRCelebration } from '../../components/prCelebration.js'
import { switchWorkoutSubTab, hideMiniBar } from '../../components/navigation.js'
import type {
  WorkoutSessionDto,
  WorkoutSessionExerciseDto,
  WorkoutSessionSetDto,
  CompleteSetResultDto,
  WeekStatusDto,
  WorkoutDayDto,
  WorkoutProgramDto,
  WorkoutDurationEstimateDto,
  PreviousExerciseDataDto
} from '../../types/workouts.js'

const DAY_NAMES: Record<number, string> = {
  0: 'Воскресенье', 1: 'Понедельник', 2: 'Вторник',
  3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота'
}

const MUSCLE_GROUPS = [
  { value: '0', label: 'Все тело' }, { value: '1', label: 'Грудь' },
  { value: '2', label: 'Спина' }, { value: '3', label: 'Плечи' },
  { value: '4', label: 'Бицепс' }, { value: '5', label: 'Трицепс' },
  { value: '6', label: 'Предплечья' }, { value: '7', label: 'Пресс' },
  { value: '8', label: 'Ягодицы' }, { value: '9', label: 'Квадрицепс' },
  { value: '10', label: 'Бицепс бедра' }, { value: '11', label: 'Икры' },
]

// ── Main Component ───────────────────────────────────────────────

export default function ActiveWorkoutTab() {
  const session = useAppState('activeWorkoutSession') as WorkoutSessionDto | null
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [showSummary, setShowSummary] = useState<WorkoutSessionDto | null>(null)
  const hintCache = useRef(new Map<string, PreviousExerciseDataDto | null>())
  const muscleAsciiRef = useRef<{ renderMuscleAscii: (g: string) => string } | null>(null)

  const loadSession = useCallback(async () => {
    try {
      if (!muscleAsciiRef.current) {
        muscleAsciiRef.current = await import('../../components/muscleAscii.js')
      }
      const active = await workoutSessionsApi.getActive() as WorkoutSessionDto | null
      state.activeWorkoutSession = active

      if (active) {
        const uncached = active.exercises
          .map(ex => ex.name)
          .filter(name => !hintCache.current.has(name))
        if (uncached.length > 0) {
          Promise.all(uncached.map(async name => {
            try {
              const data = await workoutSessionsApi.getPreviousExercise(name)
              hintCache.current.set(name, data as PreviousExerciseDataDto | null)
            } catch { hintCache.current.set(name, null) }
          }))
        }

        const firstIncomplete = active.exercises.findIndex(
          ex => ex.sets.some(s => !s.completedAt)
        )
        if (firstIncomplete >= 0) setCurrentIndex(firstIncomplete)

        await acquireWakeLock()
      }
    } catch (err) {
      console.error('Failed to load active workout:', err)
      toast.error('Ошибка загрузки тренировки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSession() }, [loadSession])

  useEffect(() => {
    if (session && currentIndex >= session.exercises.length) {
      setCurrentIndex(Math.max(0, session.exercises.length - 1))
    }
  }, [session, currentIndex])

  const reload = useCallback(async () => {
    const active = await workoutSessionsApi.getActive() as WorkoutSessionDto | null
    state.activeWorkoutSession = active
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-lg)' }}>
        <div className="skeleton skeleton-title" style={{ marginBottom: 'var(--space-lg)' }} />
        <div className="skeleton-stats">
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
        </div>
        <div className="skeleton" style={{ height: 200, marginTop: 'var(--space-lg)', borderRadius: 'var(--radius-md)' }} />
      </div>
    )
  }

  if (!session) {
    return <SmartDaySuggestion
      onStart={() => { setCurrentIndex(0); hintCache.current.clear() }}
    />
  }

  return (
    <>
      <ActiveWorkoutView
        session={session}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        reload={reload}
        hintCache={hintCache}
        muscleAscii={muscleAsciiRef.current}
        onAddExercise={() => setShowAddExercise(true)}
        onFinish={(summary) => setShowSummary(summary)}
      />
      {showAddExercise && (
        <AddExerciseModal
          sessionId={session.id}
          onClose={() => setShowAddExercise(false)}
          onAdded={async () => {
            await reload()
            const s = state.activeWorkoutSession as WorkoutSessionDto
            if (s) setCurrentIndex(s.exercises.length - 1)
          }}
        />
      )}
      {showSummary && (
        <WorkoutSummaryModal
          session={showSummary}
          onClose={() => {
            setShowSummary(null)
            switchWorkoutSubTab('history')
          }}
        />
      )}
    </>
  )
}

// ── Smart Day Suggestion ─────────────────────────────────────────

function SmartDaySuggestion({ onStart }: { onStart: () => void }) {
  const [weekStatus, setWeekStatus] = useState<WeekStatusDto | null>(null)
  const [allDays, setAllDays] = useState<WorkoutDayDto[]>([])
  const [estimates, setEstimates] = useState(new Map<string, WorkoutDurationEstimateDto>())
  const [loading, setLoading] = useState(true)
  const programs = useAppState('workoutPrograms') as WorkoutProgramDto[]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const ws = await workoutSessionsApi.getWeekStatus() as WeekStatusDto
        if (cancelled) return
        setWeekStatus(ws)

        let progs = programs
        if (!progs || progs.length === 0) {
          try {
            progs = await workoutsApi.programs.list() as WorkoutProgramDto[]
            state.workoutPrograms = progs
          } catch { progs = [] }
        }

        let days: WorkoutDayDto[] = []
        for (const prog of progs) {
          const cached = state.workoutDays[prog.id] as WorkoutDayDto[] | undefined
          if (cached) { days = days.concat(cached) }
          else {
            try {
              const d = await workoutsApi.days.listByProgram(prog.id) as WorkoutDayDto[]
              state.workoutDays[prog.id] = d
              days = days.concat(d)
            } catch {}
          }
        }
        if (cancelled) return
        setAllDays(days)

        const completedIds = new Set(ws.currentWeekSessions.filter(s => s.sourceDayId).map(s => s.sourceDayId!))
        const availableIds = days.filter(d => !completedIds.has(d.id)).map(d => d.id)
        try {
          const results = await Promise.all(
            availableIds.map(id =>
              workoutSessionsApi.getEstimate(id)
                .then(e => ({ id, estimate: e as WorkoutDurationEstimateDto }))
                .catch(() => ({ id, estimate: null }))
            )
          )
          if (cancelled) return
          const m = new Map<string, WorkoutDurationEstimateDto>()
          results.forEach(({ id, estimate }) => { if (estimate) m.set(id, estimate) })
          setEstimates(m)
        } catch {}
      } catch (err) {
        console.error('Failed to load smart day suggestion:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const startSession = useCallback(async (opts: any) => {
    try {
      const s = await workoutSessionsApi.start(opts) as WorkoutSessionDto
      state.activeWorkoutSession = s
      onStart()
      toast.success('Тренировка начата!')
      await acquireWakeLock()
    } catch (err) {
      console.error('Failed to start workout:', err)
      toast.error('Ошибка начала тренировки')
    }
  }, [onStart])

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-lg)' }}>
        <div className="skeleton skeleton-title" style={{ marginBottom: 'var(--space-lg)' }} />
        <div className="skeleton" style={{ height: 150, borderRadius: 'var(--radius-md)' }} />
      </div>
    )
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="workout-history-empty">
        <div className="workout-history-empty-icon">{'\u{1F3CB}\uFE0F'}</div>
        <div className="workout-history-empty-title">Нет программ тренировок</div>
        <div className="workout-history-empty-text">
          Создайте программу во вкладке ПРОГРАММЫ<br />или начните пустую тренировку.
        </div>
        <button className="btn-primary smart-day-empty-btn"
          onClick={() => startSession({ customTitle: 'Свободная тренировка' })}>
          [ + ПУСТАЯ ТРЕНИРОВКА ]
        </button>
      </div>
    )
  }

  const completedDayIds = new Set(
    (weekStatus?.currentWeekSessions || []).filter(s => s.sourceDayId).map(s => s.sourceDayId!)
  )
  const completedSessionsByDayId = new Map<string, { completedAt: string; title: string }>()
  ;(weekStatus?.currentWeekSessions || []).forEach(s => {
    if (s.sourceDayId) completedSessionsByDayId.set(s.sourceDayId, { completedAt: s.completedAt, title: s.title })
  })

  const todayDow = new Date().getDay()
  let recommendedDay: WorkoutDayDto | null = null
  const todayDay = allDays.find(d => d.dayOfWeek === todayDow && !completedDayIds.has(d.id))
  if (todayDay) {
    recommendedDay = todayDay
  } else {
    for (let i = 1; i <= 7; i++) {
      const dow = (todayDow + i) % 7
      const next = allDays.find(d => d.dayOfWeek === dow && !completedDayIds.has(d.id))
      if (next) { recommendedDay = next; break }
    }
  }

  const otherDays = allDays.filter(d => !recommendedDay || d.id !== recommendedDay.id)
  const dateStr = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="smart-day-container">
      <div className="smart-day-date">Сегодня: {dateStr}</div>

      {recommendedDay && (() => {
        const est = estimates.get(recommendedDay!.id)
        return (
          <div className="smart-day-recommended">
            <div className="smart-day-recommended-badge">РЕКОМЕНДАЦИЯ</div>
            <div className="smart-day-recommended-icon">{'\u{1F3CB}\uFE0F'}</div>
            <div className="smart-day-recommended-title">
              {DAY_NAMES[recommendedDay!.dayOfWeek]} — {recommendedDay!.title || ''}
            </div>
            {est && est.estimatedMinutes > 0 && (
              <div className="smart-day-duration-badge">~{est.estimatedMinutes} мин · {est.totalSets} подходов</div>
            )}
            {est?.previousSessionNotes && (
              <div className="smart-day-notes-hint">{est.previousSessionNotes.slice(0, 60)}</div>
            )}
            <button className="smart-day-start-btn"
              onClick={() => startSession({ sourceDayId: recommendedDay!.id })}>
              {'\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557'}<br />
              {'\u2551 \u25B6 НАЧАТЬ ТРЕНИРОВКУ      \u2551'}<br />
              {'\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D'}
            </button>
          </div>
        )
      })()}

      {otherDays.length > 0 && (
        <>
          <div className="smart-day-others-title">Другие дни:</div>
          <div className="smart-day-others-grid">
            {otherDays.map(d => {
              const isDone = completedDayIds.has(d.id)
              const sess = completedSessionsByDayId.get(d.id)
              const doneDate = sess ? new Date(sess.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''
              const dayEst = estimates.get(d.id)
              return (
                <div key={d.id} className={`smart-day-card ${isDone ? 'smart-day-card--done' : ''}`}>
                  <div className="smart-day-card-name">{DAY_NAMES[d.dayOfWeek]}</div>
                  <div className="smart-day-card-title">{d.title || ''}</div>
                  {!isDone && dayEst && dayEst.estimatedMinutes > 0 && (
                    <div className="smart-day-duration-badge">~{dayEst.estimatedMinutes} мин</div>
                  )}
                  {isDone
                    ? <div className="smart-day-card-done">{'\u2713'} {doneDate}</div>
                    : <button className="smart-day-card-btn"
                        onClick={() => startSession({ sourceDayId: d.id })}>НАЧАТЬ</button>
                  }
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="smart-day-quick-actions">
        <button className="smart-day-repeat-last-btn"
          onClick={() => startSession({ repeatLast: true })}>
          {'\uD83D\uDD04'} Повторить последнюю
        </button>
        <button className="smart-day-empty-workout-btn"
          onClick={() => startSession({ customTitle: 'Свободная тренировка' })}>
          [ + ПУСТАЯ ТРЕНИРОВКА ]
        </button>
      </div>
    </div>
  )
}

// ── Active Workout View ──────────────────────────────────────────

function ActiveWorkoutView({
  session, currentIndex, setCurrentIndex, reload, hintCache, muscleAscii, onAddExercise, onFinish
}: {
  session: WorkoutSessionDto
  currentIndex: number
  setCurrentIndex: (i: number) => void
  reload: () => Promise<void>
  hintCache: React.MutableRefObject<Map<string, PreviousExerciseDataDto | null>>
  muscleAscii: { renderMuscleAscii: (g: string) => string } | null
  onAddExercise: () => void
  onFinish: (summary: WorkoutSessionDto) => void
}) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const restTimerRef = useRef<HTMLDivElement>(null)
  const autoSwipeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalSets = session.exercises.reduce((s, ex) => s + ex.sets.length, 0)
  const completedSets = session.exercises.reduce((s, ex) =>
    s + ex.sets.filter(set => set.completedAt).length, 0)
  const tonnage = useMemo(() => {
    let t = 0
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.completedAt && set.actualWeightKg && set.actualRepetitions) {
          t += set.actualWeightKg * set.actualRepetitions
        }
      }
    }
    return t
  }, [session])

  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    const iv = setInterval(() => {
      const start = new Date(session.startedAt).getTime()
      const sec = Math.floor((Date.now() - start) / 1000)
      const h = Math.floor(sec / 3600)
      const m = Math.floor((sec % 3600) / 60)
      const s = sec % 60
      setElapsed(h > 0
        ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(iv)
  }, [session.startedAt])

  useEffect(() => {
    if (restTimerRef.current) {
      restTimerRef.current.id = 'rest-timer-container'
      initRestTimer()
      if (state.restTimerState?.isRunning) {
        const bar = document.getElementById('rest-timer-bar')
        if (bar) {
          bar.classList.add('active')
          if (state.restTimerState.remainingSeconds <= 5) bar.classList.add('alert')
        }
      }
    }
  }, [session])

  useEffect(() => {
    scrollToSlide(currentIndex, false)
  }, [currentIndex, session.exercises.length])

  const scrollToSlide = useCallback((idx: number, smooth = true) => {
    const carousel = carouselRef.current
    if (!carousel) return
    const slide = carousel.children[idx] as HTMLElement
    if (slide) {
      slide.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' as ScrollBehavior, inline: 'center', block: 'nearest' })
    }
  }, [])

  const cancelAutoSwipe = useCallback(() => {
    if (autoSwipeRef.current) {
      clearTimeout(autoSwipeRef.current)
      autoSwipeRef.current = null
    }
  }, [])

  const handleFinish = useCallback(async () => {
    if (!confirm('Завершить тренировку?')) return
    try {
      const summary = await workoutSessionsApi.complete(session.id) as { session: WorkoutSessionDto }
      state.activeWorkoutSession = null
      hideMiniBar()
      await releaseWakeLock()
      onFinish(summary.session)
    } catch (err) {
      console.error('Failed to finish workout:', err)
      toast.error('Ошибка завершения тренировки')
    }
  }, [session.id, onFinish])

  const handleAbandon = useCallback(async () => {
    if (!confirm('Отменить тренировку? Все данные будут потеряны.')) return
    try {
      await workoutSessionsApi.abandon(session.id)
      toast.info('Тренировка отменена')
      state.activeWorkoutSession = null
      hideMiniBar()
      await releaseWakeLock()
    } catch (err) {
      console.error('Failed to abandon workout:', err)
      toast.error('Ошибка отмены тренировки')
    }
  }, [session.id])

  useEffect(() => {
    (window as any).finishWorkout = handleFinish;
    (window as any).abandonWorkout = handleAbandon
    return () => {
      delete (window as any).finishWorkout
      delete (window as any).abandonWorkout
    }
  }, [handleFinish, handleAbandon])

  const handleUndo = useCallback(async () => {
    try {
      cancelAutoSwipe()
      await workoutSessionsApi.undoSet(session.id)
      toast.info('Подход отменён')
      await reload()
    } catch (err) {
      console.error('Failed to undo set:', err)
      toast.error('Не удалось отменить подход')
    }
  }, [session.id, reload, cancelAutoSwipe])

  const handleSetComplete = useCallback(async (setId: string, exerciseId: string, weight: number, reps: number) => {
    try {
      const result = await workoutSessionsApi.completeSet(session.id, setId, {
        weight, weightKg: weight, repetitions: reps
      }) as CompleteSetResultDto

      const exercise = session.exercises.find(e => e.id === exerciseId)
      if (result.isNewPR && result.newPRs?.length > 0 && exercise) {
        showPRCelebration(result.newPRs, exercise.name)
      }
      toast.success(`\u2713 ${weight}кг \u00D7 ${reps}`, 5000, {
        label: 'ОТМЕНИТЬ',
        onClick: () => handleUndo()
      })

      startRestTimer()
      if ('vibrate' in navigator) navigator.vibrate([50, 30, 50])

      const exIdx = session.exercises.findIndex(e => e.id === exerciseId)
      await reload()

      const updated = state.activeWorkoutSession as WorkoutSessionDto | null
      if (updated && exIdx >= 0) {
        const ex = updated.exercises[exIdx]
        if (ex && ex.sets.every(s => s.completedAt)) {
          let nextIdx = -1
          for (let i = exIdx + 1; i < updated.exercises.length; i++) {
            if (updated.exercises[i].sets.some(s => !s.completedAt)) { nextIdx = i; break }
          }
          if (nextIdx >= 0) {
            toast.info(`Следующее: ${updated.exercises[nextIdx].name}`, 3000)
            cancelAutoSwipe()
            autoSwipeRef.current = setTimeout(() => {
              setCurrentIndex(nextIdx)
              autoSwipeRef.current = null
            }, 3000)
          }
        }
      }
    } catch (err) {
      console.error('Failed to complete set:', err)
      toast.error('Ошибка записи подхода')
    }
  }, [session, reload, cancelAutoSwipe, setCurrentIndex, handleUndo])

  const handleSameAsLast = useCallback(async (setId: string, exercise: WorkoutSessionExerciseDto) => {
    const done = exercise.sets.filter(s => s.completedAt).sort((a, b) => b.orderIndex - a.orderIndex)
    let weight = 0, reps = 0

    if (done.length > 0) {
      weight = Number(done[0].actualWeight || done[0].plannedWeight || 0)
      reps = Number(done[0].actualRepetitions || done[0].plannedRepetitions || 0)
    } else {
      const cur = exercise.sets.find(s => s.id === setId)
      if (cur) {
        weight = Number(cur.previousWeight || cur.plannedWeight || 0)
        reps = Number(cur.previousReps || cur.plannedRepetitions || 0)
      }
    }

    if (!weight && !reps) { toast.warning('Нет данных для копирования'); return }
    await handleSetComplete(setId, exercise.id, weight, reps)
  }, [handleSetComplete])

  const handleAddSet = useCallback(async (exerciseId: string) => {
    const exercise = session.exercises.find(e => e.id === exerciseId)
    if (!exercise) return

    const done = exercise.sets.filter(s => s.completedAt).sort((a, b) => b.orderIndex - a.orderIndex)
    const weight = done.length > 0 ? Number(done[0].actualWeight || 0) || undefined : undefined
    const reps = done.length > 0 ? Number(done[0].actualRepetitions || 0) || undefined : undefined

    try {
      await workoutSessionsApi.addSet(session.id, exerciseId, { weight, repetitions: reps })
      if ('vibrate' in navigator) navigator.vibrate(30)
      toast.success('Подход добавлен')
      await reload()

      const updated = state.activeWorkoutSession as WorkoutSessionDto
      if (updated) {
        const exIdx = updated.exercises.findIndex(e => e.id === exerciseId)
        if (exIdx >= 0 && exIdx !== currentIndex) setCurrentIndex(exIdx)
      }
    } catch (err) {
      console.error('Failed to add set:', err)
      toast.error('Ошибка добавления подхода')
    }
  }, [session, currentIndex, reload, setCurrentIndex])

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCarouselScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => {
      const carousel = carouselRef.current
      if (!carousel) return
      const slideWidth = carousel.clientWidth
      if (slideWidth > 0) {
        const newIdx = Math.round(carousel.scrollLeft / slideWidth)
        if (newIdx !== currentIndex && newIdx >= 0 && newIdx < session.exercises.length) {
          cancelAutoSwipe()
          setCurrentIndex(newIdx)
        }
      }
    }, 100)
  }, [currentIndex, session.exercises.length, cancelAutoSwipe, setCurrentIndex])

  useEffect(() => () => cancelAutoSwipe(), [cancelAutoSwipe])

  const currentExercise = session.exercises[currentIndex]

  return (
    <>
      <div className="active-workout-header">
        <div className="active-workout-title">{session.title}</div>
        <div className="active-workout-actions">
          <button className="btn btn-secondary" onClick={handleAbandon}>ОТМЕНИТЬ</button>
          <button className="btn btn-primary" onClick={handleFinish}>ЗАВЕРШИТЬ</button>
        </div>
      </div>

      <div className="active-workout-progress">
        <div className="active-workout-progress-item">
          <div className="active-workout-progress-label">Время</div>
          <div className="active-workout-progress-value" role="timer" aria-label="Время тренировки">{elapsed || '00:00'}</div>
        </div>
        <div className="active-workout-progress-item">
          <div className="active-workout-progress-label">Подходы</div>
          <div className="active-workout-progress-value" role="progressbar"
            aria-valuenow={completedSets} aria-valuemin={0} aria-valuemax={totalSets}
            aria-label={`Прогресс подходов: ${completedSets} из ${totalSets}`}>
            {completedSets}/{totalSets}
          </div>
        </div>
        <div className="active-workout-progress-item">
          <div className="active-workout-progress-label">Тоннаж</div>
          <div className="active-workout-progress-value" aria-label="Текущий тоннаж">{tonnage.toFixed(0)} кг</div>
        </div>
      </div>

      <div ref={restTimerRef} />

      {session.exercises.length > 0 ? (
        <>
          <div className="exercise-carousel-nav">
            <button className="exercise-carousel-arrow" aria-label="Предыдущее упражнение"
              onClick={() => { if (currentIndex > 0) { cancelAutoSwipe(); setCurrentIndex(currentIndex - 1) } }}>
              {'\u25C0'}
            </button>
            <div className="exercise-carousel-counter">
              <span>{currentIndex + 1}</span>/{session.exercises.length}
              {currentExercise ? ` ${currentExercise.name}` : ''}
            </div>
            <button className="exercise-carousel-arrow" aria-label="Следующее упражнение"
              onClick={() => { if (currentIndex < session.exercises.length - 1) { cancelAutoSwipe(); setCurrentIndex(currentIndex + 1) } }}>
              {'\u25B6'}
            </button>
          </div>

          <div className="exercise-carousel" ref={carouselRef} onScroll={handleCarouselScroll}>
            {session.exercises.map((exercise, idx) => (
              <ExerciseSlide key={exercise.id} exercise={exercise} index={idx}
                isCurrent={idx === currentIndex} muscleAscii={muscleAscii}
                hintCache={hintCache} onComplete={handleSetComplete}
                onSameAsLast={handleSameAsLast} onAddSet={handleAddSet} />
            ))}
          </div>

          <div className="exercise-carousel-dots">
            {session.exercises.map((ex, i) => {
              const allDone = ex.sets.every(s => s.completedAt)
              const dotClass = allDone ? 'dot-done' : i === currentIndex ? 'dot-current' : 'dot-pending'
              return <span key={i} className={`carousel-dot ${dotClass}`}
                onClick={() => { cancelAutoSwipe(); setCurrentIndex(i) }} />
            })}
          </div>

          <button className="add-exercise-session-btn" onClick={onAddExercise}>+ ДОБАВИТЬ УПРАЖНЕНИЕ</button>
        </>
      ) : (
        <div className="workout-history-empty" style={{ padding: '32px 16px' }}>
          <div className="workout-history-empty-icon">{'\u{1F3CB}\uFE0F'}</div>
          <div className="workout-history-empty-title">Нет упражнений</div>
          <button className="btn-primary" onClick={onAddExercise}>+ ДОБАВИТЬ УПРАЖНЕНИЕ</button>
        </div>
      )}
    </>
  )
}

// ── Muscle Scale Hook ────────────────────────────────────────────

function useMuscleScale(
  heroRef: React.RefObject<HTMLDivElement>,
  isCurrent: boolean,
  muscleGroup: number | undefined,
  muscleAscii: { renderMuscleAscii: (g: string) => string } | null
) {
  useEffect(() => {
    const el = heroRef.current
    if (!isCurrent || !el || !muscleAscii || muscleGroup == null) return
    if (el.querySelector('.muscle-ascii-highlight')) return

    const asciiHtml = muscleAscii.renderMuscleAscii(muscleGroup)
    const range = document.createRange()
    const frag = range.createContextualFragment(asciiHtml)
    el.textContent = ''
    el.appendChild(frag)

    const recalc = () => {
      const highlight = el.querySelector('.muscle-ascii-highlight') as HTMLElement | null
      if (!highlight) return
      highlight.style.transform = ''
      const cw = el.clientWidth - 16
      const ch = el.clientHeight - 16
      if (cw <= 0 || ch <= 0) return
      const nw = highlight.scrollWidth
      const nh = highlight.scrollHeight
      const scale = Math.min(cw / nw, ch / nh, 1)
      el.style.setProperty('--muscle-scale', String(scale))
    }

    recalc()

    const ro = new ResizeObserver(recalc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isCurrent, muscleAscii, muscleGroup])
}

// ── Exercise Slide ───────────────────────────────────────────────

function ExerciseSlide({
  exercise, index, isCurrent, muscleAscii, hintCache, onComplete, onSameAsLast, onAddSet
}: {
  exercise: WorkoutSessionExerciseDto; index: number; isCurrent: boolean
  muscleAscii: { renderMuscleAscii: (g: string) => string } | null
  hintCache: React.MutableRefObject<Map<string, PreviousExerciseDataDto | null>>
  onComplete: (setId: string, exerciseId: string, weight: number, reps: number) => Promise<void>
  onSameAsLast: (setId: string, exercise: WorkoutSessionExerciseDto) => Promise<void>
  onAddSet: (exerciseId: string) => Promise<void>
}) {
  const heroRef = useRef<HTMLDivElement>(null)
  const [hint, setHint] = useState<PreviousExerciseDataDto | null>(null)
  const [hintLoaded, setHintLoaded] = useState(false)

  const completedCount = exercise.sets.filter(s => s.completedAt).length
  const allDone = completedCount === exercise.sets.length && exercise.sets.length > 0

  const activeSet = exercise.sets.find(s =>
    !s.completedAt && !exercise.sets.some(prev => prev.orderIndex < s.orderIndex && !prev.completedAt)
  )

  useMuscleScale(heroRef, isCurrent, exercise.muscleGroup, muscleAscii)

  useEffect(() => {
    if (!isCurrent || hintLoaded) return
    setHintLoaded(true)
    ;(async () => {
      try {
        let data: PreviousExerciseDataDto | null
        if (hintCache.current.has(exercise.name)) {
          data = hintCache.current.get(exercise.name)!
        } else {
          data = await workoutSessionsApi.getPreviousExercise(exercise.name) as PreviousExerciseDataDto | null
          hintCache.current.set(exercise.name, data)
        }
        if (data?.sets?.length) setHint(data)
      } catch {}
    })()
  }, [isCurrent, hintLoaded, exercise.name, hintCache])

  return (
    <div className="exercise-slide" data-index={index} data-muscle-group={exercise.muscleGroup}>
      <div className="ex-muscle-hero" ref={heroRef} />
      <div className="ex-header">
        <div className="ex-name">{exercise.name} {allDone ? '\u2713' : ''}</div>
        <div className="ex-progress">{completedCount}/{exercise.sets.length}</div>
      </div>
      <div className="ex-sets-chips">
        {exercise.sets.map(set => <SetChip key={set.id} set={set} exercise={exercise} />)}
      </div>
      {hint && <HintBar hint={hint} activeSetId={activeSet?.id} />}
      {activeSet && <PersistentInput set={activeSet} exercise={exercise} onComplete={onComplete} onSameAsLast={onSameAsLast} />}
      <button className="add-set-btn" onClick={() => onAddSet(exercise.id)}>+ ЕЩЁ ПОДХОД</button>
    </div>
  )
}

// ── Set Chip ─────────────────────────────────────────────────────

function SetChip({ set, exercise }: { set: WorkoutSessionSetDto; exercise: WorkoutSessionExerciseDto }) {
  const isCompleted = !!set.completedAt
  const isActive = !isCompleted && !exercise.sets.some(s => s.orderIndex < set.orderIndex && !s.completedAt)

  if (isCompleted) {
    let compIcon = ''
    if (set.comparison === 'Better') compIcon = ' \uD83D\uDFE2'
    else if (set.comparison === 'Same') compIcon = ' \uD83D\uDFE1'
    else if (set.comparison === 'Worse') compIcon = ' \uD83D\uDD34'
    const ghost = set.previousWeight ? `\u1D4D${set.previousWeight}\u043A\u0433\u00D7${set.previousReps || '?'}` : ''
    return (
      <div className="set-chip done">
        <span className="set-chip-num">{set.orderIndex + 1}</span>
        <span className="set-chip-value">{set.actualWeight || 0}кг{'\u00D7'}{set.actualRepetitions || 0}{compIcon}</span>
        {ghost && <span className="set-chip-ghost">{ghost}</span>}
      </div>
    )
  }

  const ghostVal = set.previousWeight
    ? `\u1D4D${set.previousWeight}кг\u00D7${set.previousReps || '?'}`
    : set.plannedWeight ? `\u1D4D${set.plannedWeight}кг\u00D7${set.plannedRepetitions || '?'}` : ''

  return (
    <div className={`set-chip ${isActive ? 'active' : 'pending'}`}>
      <span className="set-chip-num">{set.orderIndex + 1}</span>
      <span className="set-chip-value">{isActive ? '\u25B6' : '\u2014'}</span>
      {ghostVal && <span className="set-chip-ghost">{ghostVal}</span>}
    </div>
  )
}

// ── Hint Bar ─────────────────────────────────────────────────────

function HintBar({ hint, activeSetId }: { hint: PreviousExerciseDataDto; activeSetId?: string }) {
  const lastSet = hint.sets[0]
  const lastWeight = lastSet.weight || 0
  const lastReps = lastSet.repetitions || 0
  if (!lastWeight && !lastReps) return null

  const strengthW = lastWeight + 2.5, strengthR = Math.max(1, lastReps - 2)
  const volumeW = lastWeight, volumeR = lastReps + 2
  const dateStr = hint.sessionDate
    ? new Date(hint.sessionDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''

  const fillInput = (w: number, r: number) => {
    if (!activeSetId) return
    const wEl = document.getElementById(`pi-weight-${activeSetId}`) as HTMLInputElement
    const rEl = document.getElementById(`pi-reps-${activeSetId}`) as HTMLInputElement
    if (wEl) wEl.value = String(w)
    if (rEl) rEl.value = String(r)
    if ('vibrate' in navigator) navigator.vibrate(20)
  }

  return (
    <div className="ex-hint visible">
      <span className="ex-hint-value" onClick={() => fillInput(lastWeight, lastReps)}>
        ПРОШЛЫЙ РАЗ: {lastWeight}кг {'\u00D7'} {lastReps} {dateStr ? `(${dateStr})` : ''}
      </span><br />
      ПОБЕЙ: <span className="ex-hint-value" onClick={() => fillInput(strengthW, strengthR)}>
        {strengthW}кг{'\u00D7'}{strengthR}
      </span>
      {' '}или <span className="ex-hint-value" onClick={() => fillInput(volumeW, volumeR)}>
        {volumeW}кг{'\u00D7'}{volumeR}
      </span>
    </div>
  )
}

// ── Persistent Input ─────────────────────────────────────────────

function PersistentInput({ set, exercise, onComplete, onSameAsLast }: {
  set: WorkoutSessionSetDto; exercise: WorkoutSessionExerciseDto
  onComplete: (setId: string, exerciseId: string, weight: number, reps: number) => Promise<void>
  onSameAsLast: (setId: string, exercise: WorkoutSessionExerciseDto) => Promise<void>
}) {
  const done = exercise.sets.filter(s => s.completedAt).sort((a, b) => b.orderIndex - a.orderIndex)
  const autoW = Number(set.plannedWeight || set.previousWeight || done[0]?.actualWeight || 0)
  const autoR = Number(set.plannedRepetitions || set.previousReps || done[0]?.actualRepetitions || 0)
  const hasPrev = done.length > 0 || !!set.previousWeight

  const [weight, setWeight] = useState(autoW || 0)
  const [reps, setReps] = useState(autoR || 0)
  const [submitting, setSubmitting] = useState(false)
  const weightRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => { weightRef.current?.focus(); weightRef.current?.select() }, 100)
  }, [set.id])

  const handleSubmit = async () => {
    if (!weight && !reps) { toast.warning('Введи вес или повторения'); return }
    setSubmitting(true)
    await onComplete(set.id, exercise.id, weight, reps)
    setSubmitting(false)
  }

  const incW = (d: number) => { setWeight(p => Math.max(0, +(p + d).toFixed(1))); if ('vibrate' in navigator) navigator.vibrate(10) }
  const incR = (d: number) => { setReps(p => Math.max(0, p + d)); if ('vibrate' in navigator) navigator.vibrate(10) }

  return (
    <div className="ex-input-area" id={`ex-input-${set.id}`}>
      <div className="ex-input-header">
        [ СЕТ {set.orderIndex + 1} ]{' '}
        <span className="rpe-tooltip">RPE <span className="rpe-tooltip-icon">?</span>
          <span className="rpe-tooltip-text">Rate of Perceived Exertion — шкала усталости 1-10. RPE 7 = ещё 3 повтора в запасе. RPE 10 = на пределе.</span>
        </span>
      </div>
      <div className="ex-input-row">
        <div className="ex-input-field">
          <span className="ex-input-label">ВЕС</span>
          <div className="ex-input-controls">
            <button className="ex-inc" onClick={() => incW(-5)}>-5</button>
            <button className="ex-inc" onClick={() => incW(-2.5)}>-2.5</button>
            <input className="ex-input" type="number" ref={weightRef} id={`pi-weight-${set.id}`}
              value={weight || ''} onChange={e => setWeight(parseFloat(e.target.value) || 0)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              onFocus={e => e.target.select()} step="0.5" inputMode="decimal" placeholder="0" />
            <button className="ex-inc" onClick={() => incW(2.5)}>+2.5</button>
            <button className="ex-inc" onClick={() => incW(5)}>+5</button>
          </div>
          <span className="ex-input-unit">кг</span>
        </div>
        <div className="ex-input-field">
          <span className="ex-input-label">ПОВТ</span>
          <div className="ex-input-controls">
            <button className="ex-inc" onClick={() => incR(-1)}>-1</button>
            <input className="ex-input" type="number" id={`pi-reps-${set.id}`}
              value={reps || ''} onChange={e => setReps(parseInt(e.target.value) || 0)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              onFocus={e => e.target.select()} step="1" inputMode="numeric" placeholder="0" />
            <button className="ex-inc" onClick={() => incR(1)}>+1</button>
          </div>
        </div>
      </div>
      <div className="ex-input-actions">
        <button className="ex-btn-done" disabled={submitting} onClick={handleSubmit}>{'\u2713'} ЗАПИСАТЬ</button>
        {hasPrev && <button className="ex-btn-same" disabled={submitting}
          onClick={() => onSameAsLast(set.id, exercise)}>{'\u2550'} КАК ПРОШЛЫЙ</button>}
      </div>
    </div>
  )
}

// ── Add Exercise Modal ───────────────────────────────────────────

function AddExerciseModal({ sessionId, onClose, onAdded }: {
  sessionId: string; onClose: () => void; onAdded: () => Promise<void>
}) {
  const [catalog, setCatalog] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('')
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('0')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      try { setCatalog(await api(ENDPOINTS.exerciseCatalog.list) as any[]) }
      catch { setCatalog([]) }
    })()
  }, [])

  const filtered = useMemo(() => {
    let items = catalog
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((e: any) =>
        (e.nameRu || '').toLowerCase().includes(q) ||
        (e.nameEn || '').toLowerCase().includes(q) ||
        (e.name || '').toLowerCase().includes(q))
    }
    if (muscleFilter) items = items.filter((e: any) => String(e.muscleGroup) === muscleFilter)
    return items.slice(0, 50)
  }, [catalog, search, muscleFilter])

  const handleSave = async () => {
    if (!name.trim()) { toast.warning('Введите название упражнения'); return }
    setSaving(true)
    try {
      await workoutSessionsApi.addExercise(sessionId, { name: name.trim(), muscleGroup: parseInt(muscle, 10) })
      toast.success('Упражнение добавлено')
      if ('vibrate' in navigator) navigator.vibrate(30)
      onClose()
      await onAdded()
    } catch (err) {
      console.error('Failed to add exercise:', err)
      toast.error('Ошибка добавления упражнения')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2>[ ДОБАВИТЬ УПРАЖНЕНИЕ ]</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder="Поиск упражнения..." style={{ flex: 1 }}
                value={search} onChange={e => setSearch(e.target.value)} />
              <select style={{ width: 150 }} value={muscleFilter} onChange={e => setMuscleFilter(e.target.value)}>
                <option value="">Все группы</option>
                {MUSCLE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', padding: 8, background: 'var(--bg-secondary, rgba(0,0,0,0.2))', borderRadius: 4 }}>
              {filtered.length === 0
                ? <div style={{ color: 'var(--text-secondary)', padding: 8 }}>Упражнения не найдены.</div>
                : filtered.map((e: any, i: number) => (
                  <div key={i} style={{ padding: 8, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => { setName(e.nameRu || e.name || e.nameEn || ''); setMuscle(String(e.muscleGroup || 0)) }}>
                    <div style={{ color: 'var(--text-primary)' }}>{e.nameRu || e.name || e.nameEn || ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.target || e.bodyPart || ''}</div>
                  </div>
                ))}
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div className="form-group">
              <label>Или введите вручную</label>
              <input type="text" placeholder="Название упражнения" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Группа мышц</label>
              <select value={muscle} onChange={e => setMuscle(e.target.value)}>
                {MUSCLE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn" disabled={saving} onClick={handleSave}>[ ДОБАВИТЬ ]</button>
        </div>
      </div>
    </div>
  )
}

// ── Workout Summary Modal ────────────────────────────────────────

function WorkoutSummaryModal({ session, onClose }: { session: WorkoutSessionDto; onClose: () => void }) {
  const durMin = Math.floor(session.durationSeconds / 60)
  const durSec = session.durationSeconds % 60
  const started = new Date(session.startedAt)
  const completed = session.completedAt ? new Date(session.completedAt) : started
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0)

  return (
    <div className="modal-overlay workout-summary-overlay active"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal workout-summary-modal">
        <div className="workout-summary-header">
          <h2 className="workout-summary-title">ИТОГИ ТРЕНИРОВКИ</h2>
          <div className="workout-summary-subtitle">{session.title}</div>
        </div>
        <div className="workout-summary-meta">
          <div>Длительность: {durMin}м {durSec}с</div>
          <div>
            Начало: {started.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} —{' '}
            Конец: {completed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="workout-summary-stats">
          <div className="workout-summary-stat"><span className="workout-summary-stat-label">Тоннаж</span><span className="workout-summary-stat-value">{session.totalTonnage.toFixed(0)} кг</span></div>
          <div className="workout-summary-stat"><span className="workout-summary-stat-label">Объём</span><span className="workout-summary-stat-value">{session.totalVolume} повт.</span></div>
          <div className="workout-summary-stat"><span className="workout-summary-stat-label">Подходы</span><span className="workout-summary-stat-value">{session.totalSetsCompleted}/{totalSets}</span></div>
          <div className="workout-summary-stat"><span className="workout-summary-stat-label">Ср. интенсивность</span><span className="workout-summary-stat-value">{session.averageIntensity.toFixed(1)} кг/повт.</span></div>
          <div className="workout-summary-stat"><span className="workout-summary-stat-label">Ср. отдых</span><span className="workout-summary-stat-value">{session.averageRestSeconds} с</span></div>
        </div>
        <div className="workout-summary-by-exercise">
          <div className="workout-summary-by-ex-title">По упражнениям</div>
          {session.exercises.map(ex => {
            const exT = ex.sets.reduce((t, s) => t + ((s.actualWeightKg ?? 0) * (s.actualRepetitions ?? 0)), 0)
            const exR = ex.sets.reduce((t, s) => t + (s.actualRepetitions || 0), 0)
            const exS = ex.sets.filter(s => s.completedAt).length
            return (
              <div key={ex.id} className="workout-summary-exercise">
                <span className="workout-summary-ex-name">{ex.name}</span>
                <span className="workout-summary-ex-stats">{exS} подходов · {exT.toFixed(0)} кг · {exR} повт.</span>
              </div>
            )
          })}
        </div>
        <button className="btn btn-primary workout-summary-close" onClick={onClose}>ЗАКРЫТЬ</button>
      </div>
    </div>
  )
}
