import { workoutSessionsApi, workoutsApi, api } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { switchWorkoutSubTab, hideMiniBar } from '../components/navigation.js'
import { state } from '../state.js'
import { toast } from '../components/toast.js'
import { acquireWakeLock, releaseWakeLock } from '../components/wakeLock.js'
// Quick Set Logger modal removed — inline set form used instead
import { startRestTimer } from '../components/restTimer.js'
import { showPRCelebration } from '../components/prCelebration.js'
import type {
    WorkoutSessionDto,
    WorkoutSessionExerciseDto,
    WorkoutSessionSetDto,
    CompleteSetResultDto,
    WeekStatusDto,
    WorkoutDayDto,
    WorkoutProgramDto,
    WorkoutDurationEstimateDto
} from '../types/workouts.js'

let elapsedInterval: ReturnType<typeof setInterval> | null = null
let currentExerciseIndex = 0
let autoSwipeTimer: ReturnType<typeof setTimeout> | null = null
let sessionExerciseCatalog: any[] = []
let sessionExerciseCatalogLoaded = false

const DAY_NAMES: Record<number, string> = {
    0: 'Воскресенье', 1: 'Понедельник', 2: 'Вторник',
    3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота'
}

export async function loadActiveWorkout(): Promise<void> {
    try {
        const session = await workoutSessionsApi.getActive() as WorkoutSessionDto | null

        if (!session) {
            state.activeWorkoutSession = null
            await renderSmartDaySuggestion()
            return
        }

        state.activeWorkoutSession = session

        if (currentExerciseIndex >= session.exercises.length) {
            currentExerciseIndex = 0
        }

        const firstIncomplete = session.exercises.findIndex(
            (ex: WorkoutSessionExerciseDto) => ex.sets.some((s: WorkoutSessionSetDto) => !s.completedAt)
        )
        if (firstIncomplete >= 0 && currentExerciseIndex === 0) {
            currentExerciseIndex = firstIncomplete
        }

        renderActiveWorkout()
        await acquireWakeLock()
        startElapsedTimer()
    } catch (err) {
        console.error('Failed to load active workout:', err)
        toast.error('Ошибка загрузки тренировки')
    }
}

async function renderSmartDaySuggestion(): Promise<void> {
    const container = document.getElementById('active-workout-content')
    if (!container) return

    try {
        const weekStatus = await workoutSessionsApi.getWeekStatus() as WeekStatusDto
        const programs = state.workoutPrograms as WorkoutProgramDto[]

        if (!programs || programs.length === 0) {
            try {
                const progs = await workoutsApi.programs.list() as WorkoutProgramDto[]
                state.workoutPrograms = progs
            } catch (_) {}
        }

        const currentPrograms = state.workoutPrograms as WorkoutProgramDto[]
        if (currentPrograms.length === 0) {
            container.innerHTML = `
                <div class="workout-history-empty">
                    <div class="workout-history-empty-icon">🏋️</div>
                    <div class="workout-history-empty-title">Нет программ тренировок</div>
                    <div class="workout-history-empty-text">
                        Создайте программу во вкладке ПРОГРАММЫ<br/>или начните пустую тренировку.
                    </div>
                    <button class="btn-primary smart-day-empty-btn" id="start-empty-workout">[ + ПУСТАЯ ТРЕНИРОВКА ]</button>
                </div>
            `
            document.getElementById('start-empty-workout')?.addEventListener('click', startEmptyWorkout)
            return
        }

        let allDays: WorkoutDayDto[] = []
        for (const program of currentPrograms) {
            const cached = state.workoutDays[program.id] as WorkoutDayDto[] | undefined
            if (cached) {
                allDays = allDays.concat(cached)
            } else {
                try {
                    const days = await workoutsApi.days.listByProgram(program.id) as WorkoutDayDto[]
                    state.workoutDays[program.id] = days
                    allDays = allDays.concat(days)
                } catch (_) {}
            }
        }

        const todayDow = new Date().getDay()
        const today = new Date()
        const dateStr = today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

        const completedDayIds = new Set(
            weekStatus.currentWeekSessions
                .filter(s => s.sourceDayId)
                .map(s => s.sourceDayId!)
        )

        const completedSessionsByDayId = new Map<string, { completedAt: string; title: string }>()
        weekStatus.currentWeekSessions.forEach(s => {
            if (s.sourceDayId) {
                completedSessionsByDayId.set(s.sourceDayId, { completedAt: s.completedAt, title: s.title })
            }
        })

        let recommendedDay: WorkoutDayDto | null = null
        const todayDay = allDays.find(d => d.dayOfWeek === todayDow && !completedDayIds.has(d.id))
        if (todayDay) {
            recommendedDay = todayDay
        } else {
            for (let i = 1; i <= 7; i++) {
                const dow = (todayDow + i) % 7
                const nextDay = allDays.find(d => d.dayOfWeek === dow && !completedDayIds.has(d.id))
                if (nextDay) {
                    recommendedDay = nextDay
                    break
                }
            }
        }

        // Load estimates for all days in parallel
        const estimateCache = new Map<string, WorkoutDurationEstimateDto>()
        const availableDayIds = allDays.filter(d => !completedDayIds.has(d.id)).map(d => d.id)
        try {
            const estimates = await Promise.all(
                availableDayIds.map(id =>
                    workoutSessionsApi.getEstimate(id)
                        .then(e => ({ id, estimate: e as WorkoutDurationEstimateDto }))
                        .catch(() => ({ id, estimate: null }))
                )
            )
            estimates.forEach(({ id, estimate }) => {
                if (estimate) estimateCache.set(id, estimate)
            })
        } catch (_) {}

        let recommendedHtml = ''
        if (recommendedDay) {
            const recEstimate = estimateCache.get(recommendedDay.id)
            const durationBadge = recEstimate && recEstimate.estimatedMinutes > 0
                ? `<div class="smart-day-duration-badge">~${recEstimate.estimatedMinutes} мин · ${recEstimate.totalSets} подходов</div>`
                : ''
            const notesBadge = recEstimate && recEstimate.previousSessionNotes
                ? `<div class="smart-day-notes-hint">${escapeHtml(recEstimate.previousSessionNotes.slice(0, 60))}</div>`
                : ''

            recommendedHtml = `
                <div class="smart-day-recommended">
                    <div class="smart-day-recommended-badge">РЕКОМЕНДАЦИЯ</div>
                    <div class="smart-day-recommended-icon">🏋️</div>
                    <div class="smart-day-recommended-title">${escapeHtml(DAY_NAMES[recommendedDay.dayOfWeek])} — ${escapeHtml(recommendedDay.title || '')}</div>
                    ${durationBadge}
                    ${notesBadge}
                    <button class="smart-day-start-btn" data-day-id="${recommendedDay.id}">
                        ╔══════════════════════════╗<br>
                        ║ ▶ НАЧАТЬ ТРЕНИРОВКУ      ║<br>
                        ╚══════════════════════════╝
                    </button>
                </div>
            `
        }

        const otherDays = allDays.filter(d => !recommendedDay || d.id !== recommendedDay.id)
        let otherDaysHtml = ''
        if (otherDays.length > 0) {
            otherDaysHtml = `
                <div class="smart-day-others-title">Другие дни:</div>
                <div class="smart-day-others-grid">
                    ${otherDays.map(d => {
                        const isDone = completedDayIds.has(d.id)
                        const session = completedSessionsByDayId.get(d.id)
                        const doneDate = session ? new Date(session.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''
                        const dayEstimate = estimateCache.get(d.id)
                        const dayDuration = !isDone && dayEstimate && dayEstimate.estimatedMinutes > 0
                            ? `<div class="smart-day-duration-badge">~${dayEstimate.estimatedMinutes} мин</div>`
                            : ''
                        return `
                            <div class="smart-day-card ${isDone ? 'smart-day-card--done' : ''}">
                                <div class="smart-day-card-name">${escapeHtml(DAY_NAMES[d.dayOfWeek])}</div>
                                <div class="smart-day-card-title">${escapeHtml(d.title || '')}</div>
                                ${dayDuration}
                                ${isDone
                                    ? `<div class="smart-day-card-done">✓ ${doneDate}</div>`
                                    : `<button class="smart-day-card-btn" data-day-id="${d.id}">НАЧАТЬ</button>`
                                }
                            </div>
                        `
                    }).join('')}
                </div>
            `
        }

        container.innerHTML = `
            <div class="smart-day-container">
                <div class="smart-day-date">Сегодня: ${escapeHtml(dateStr)}</div>
                ${recommendedHtml}
                ${otherDaysHtml}
                <div class="smart-day-quick-actions">
                    <button class="smart-day-repeat-last-btn" id="start-repeat-last-btn">🔄 Повторить последнюю</button>
                    <button class="smart-day-empty-workout-btn" id="start-empty-workout-btn">[ + ПУСТАЯ ТРЕНИРОВКА ]</button>
                </div>
            </div>
        `

        document.getElementById('start-repeat-last-btn')?.addEventListener('click', startRepeatLastWorkout)

        container.querySelectorAll('.smart-day-start-btn, .smart-day-card-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const dayId = (btn as HTMLElement).dataset.dayId!
                await startWorkoutFromSuggestion(dayId)
            })
        })

        document.getElementById('start-empty-workout-btn')?.addEventListener('click', startEmptyWorkout)
    } catch (err) {
        console.error('Failed to render smart day suggestion:', err)
        container.innerHTML = `
            <div class="workout-history-empty">
                <div class="workout-history-empty-icon">🏋️</div>
                <div class="workout-history-empty-title">Нет активной тренировки</div>
                <div class="workout-history-empty-text">Начните тренировку из раздела Программы</div>
            </div>
        `
    }
}

async function startWorkoutFromSuggestion(dayId: string): Promise<void> {
    try {
        const session = await workoutSessionsApi.start({ sourceDayId: dayId }) as WorkoutSessionDto
        state.activeWorkoutSession = session
        currentExerciseIndex = 0
        toast.success('Тренировка начата!')
        renderActiveWorkout()
        await acquireWakeLock()
        startElapsedTimer()
    } catch (err) {
        console.error('Failed to start workout:', err)
        toast.error('Ошибка начала тренировки')
    }
}

async function startRepeatLastWorkout(): Promise<void> {
    try {
        const session = await workoutSessionsApi.start({ repeatLast: true }) as WorkoutSessionDto
        state.activeWorkoutSession = session
        currentExerciseIndex = 0
        toast.success('Повтор последней тренировки начат!')
        renderActiveWorkout()
        await acquireWakeLock()
        startElapsedTimer()
    } catch (err) {
        console.error('Failed to start repeat last:', err)
        toast.error('Нет завершённой тренировки для повтора')
    }
}

async function startEmptyWorkout(): Promise<void> {
    try {
        const session = await workoutSessionsApi.start({ customTitle: 'Свободная тренировка' }) as WorkoutSessionDto
        state.activeWorkoutSession = session
        currentExerciseIndex = 0
        toast.success('Тренировка начата!')
        renderActiveWorkout()
        await acquireWakeLock()
        startElapsedTimer()
    } catch (err) {
        console.error('Failed to start empty workout:', err)
        toast.error('Ошибка начала тренировки')
    }
}

export function renderActiveWorkout(): void {
    const container = document.getElementById('active-workout-content')
    if (!container) return

    const session = state.activeWorkoutSession as WorkoutSessionDto | null

    if (!session) {
        renderSmartDaySuggestion()
        return
    }

    const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    const completedSets = session.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(s => s.completedAt).length, 0)

    if (currentExerciseIndex >= session.exercises.length) {
        currentExerciseIndex = Math.max(0, session.exercises.length - 1)
    }

    const currentExercise = session.exercises[currentExerciseIndex]

    container.innerHTML = `
        <div class="active-workout-header">
            <div class="active-workout-title">${escapeHtml(session.title)}</div>
            <div class="active-workout-actions">
                <button class="btn btn-secondary" id="abandon-workout-btn">ОТМЕНИТЬ</button>
                <button class="btn btn-primary" id="finish-workout-btn">ЗАВЕРШИТЬ</button>
            </div>
        </div>

        <div class="active-workout-progress">
            <div class="active-workout-progress-item">
                <div class="active-workout-progress-label">Время</div>
                <div class="active-workout-progress-value" id="elapsed-time">00:00</div>
            </div>
            <div class="active-workout-progress-item">
                <div class="active-workout-progress-label">Подходы</div>
                <div class="active-workout-progress-value">${completedSets}/${totalSets}</div>
            </div>
            <div class="active-workout-progress-item">
                <div class="active-workout-progress-label">Тоннаж</div>
                <div class="active-workout-progress-value" id="current-tonnage">0 кг</div>
            </div>
        </div>

        ${session.exercises.length > 0 ? `
            <div class="exercise-carousel-nav">
                <button class="exercise-carousel-arrow" id="carousel-prev">◀</button>
                <div class="exercise-carousel-counter">
                    <span id="carousel-index">${currentExerciseIndex + 1}</span>/${session.exercises.length}
                    ${currentExercise ? escapeHtml(currentExercise.name) : ''}
                </div>
                <button class="exercise-carousel-arrow" id="carousel-next">▶</button>
            </div>

            <div class="exercise-carousel" id="exercise-carousel">
                ${session.exercises.map((exercise, idx) => renderExerciseSlide(exercise, session.id, idx)).join('')}
            </div>

            <div class="exercise-carousel-dots" id="carousel-dots">
                ${session.exercises.map((ex, i) => {
                    const allDone = ex.sets.every(s => s.completedAt)
                    const isCurrent = i === currentExerciseIndex
                    const dotClass = allDone ? 'dot-done' : isCurrent ? 'dot-current' : 'dot-pending'
                    return `<span class="carousel-dot ${dotClass}" data-index="${i}"></span>`
                }).join('')}
            </div>

            <button class="add-exercise-session-btn" id="add-exercise-btn">
                + ДОБАВИТЬ УПРАЖНЕНИЕ
            </button>
        ` : `
            <div class="workout-history-empty" style="padding: 32px 16px;">
                <div class="workout-history-empty-icon">🏋️</div>
                <div class="workout-history-empty-title">Нет упражнений</div>
                <button class="btn-primary" id="add-exercise-btn">+ ДОБАВИТЬ УПРАЖНЕНИЕ</button>
            </div>
        `}
    `

    document.getElementById('abandon-workout-btn')?.addEventListener('click', abandonWorkout)
    document.getElementById('finish-workout-btn')?.addEventListener('click', finishWorkout)

    const carousel = document.getElementById('exercise-carousel')
    if (carousel) {
        scrollToSlide(currentExerciseIndex, false)

        let scrollTimeout: ReturnType<typeof setTimeout> | null = null
        carousel.addEventListener('scroll', () => {
            if (scrollTimeout) clearTimeout(scrollTimeout)
            scrollTimeout = setTimeout(() => {
                const slideWidth = carousel.clientWidth
                if (slideWidth > 0) {
                    const newIndex = Math.round(carousel.scrollLeft / slideWidth)
                    if (newIndex !== currentExerciseIndex && newIndex >= 0 && newIndex < session.exercises.length) {
                        currentExerciseIndex = newIndex
                        cancelAutoSwipe()
                        updateCarouselUI()
                    }
                }
            }, 100)
        })
    }

    document.getElementById('carousel-prev')?.addEventListener('click', () => {
        if (currentExerciseIndex > 0) {
            currentExerciseIndex--
            scrollToSlide(currentExerciseIndex)
            cancelAutoSwipe()
            updateCarouselUI()
        }
    })

    document.getElementById('carousel-next')?.addEventListener('click', () => {
        if (currentExerciseIndex < session.exercises.length - 1) {
            currentExerciseIndex++
            scrollToSlide(currentExerciseIndex)
            cancelAutoSwipe()
            updateCarouselUI()
        }
    })

    document.querySelectorAll('.carousel-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt((dot as HTMLElement).dataset.index || '0')
            currentExerciseIndex = idx
            scrollToSlide(idx)
            cancelAutoSwipe()
            updateCarouselUI()
        })
    })

    session.exercises.forEach((exercise, exIdx) => {
        exercise.sets.forEach(set => {
            if (!set.completedAt) {
                const isActive = !exercise.sets.some(s => s.orderIndex < set.orderIndex && !s.completedAt)

                if (isActive) {
                    // [ПОДХОД] → expands inline set form (no modal)
                    document.getElementById(`log-set-btn-${set.id}`)?.addEventListener('click', () => {
                        expandInlineSetForm(set, exercise, session.id)
                    })

                    // [═] → instant complete (no modal, 1 tap)
                    document.getElementById(`same-set-btn-${set.id}`)?.addEventListener('click', () => {
                        inlineSameAsLast(set.id, session.id, exercise)
                    })
                }
            }
        })

        document.getElementById(`add-set-btn-${exercise.id}`)?.addEventListener('click', () => {
            addExtraSet(session.id, exercise)
        })
    })

    document.getElementById('add-exercise-btn')?.addEventListener('click', () => {
        openAddExerciseModal(session.id)
    })

    updateTonnage()
}

function renderExerciseSlide(exercise: WorkoutSessionExerciseDto, sessionId: string, index: number): string {
    const completedSets = exercise.sets.filter(s => s.completedAt).length
    const totalSets = exercise.sets.length
    const allDone = completedSets === totalSets && totalSets > 0

    return `
        <div class="exercise-slide" data-index="${index}">
            <div class="exercise-slide-header">
                <div class="exercise-slide-name">${escapeHtml(exercise.name)} ${allDone ? '✓' : ''}</div>
                <div class="exercise-slide-stats">${exercise.muscleGroup} · ${completedSets}/${totalSets} подходов</div>
            </div>
            <table class="sets-table">
                <thead>
                    <tr>
                        <th>Сет</th>
                        <th>Вес</th>
                        <th>Повт.</th>
                        <th>RPE</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
                    ${exercise.sets.map(set => renderSetRow(set, exercise, sessionId)).join('')}
                </tbody>
            </table>
            <button class="add-set-btn" id="add-set-btn-${exercise.id}">+ ЕЩЁ ПОДХОД</button>
        </div>
    `
}

function renderSetRow(set: WorkoutSessionSetDto, exercise: WorkoutSessionExerciseDto, sessionId: string): string {
    const isCompleted = !!set.completedAt
    const isActive = !isCompleted && !exercise.sets.some(s => s.orderIndex < set.orderIndex && !s.completedAt)

    const ghostW = set.previousWeight ? `<div class="ghost">ᵍ${set.previousWeight}кг</div>` : ''
    const ghostR = set.previousReps ? `<div class="ghost">ᵍ×${set.previousReps}</div>` : ''
    const hasPrev = exercise.sets.some(s => s.completedAt && s.orderIndex < set.orderIndex) || !!set.previousWeight

    if (isCompleted) {
        let statusIcon = '✓'
        if (set.comparison === 'Better') statusIcon = '✓ 🟢'
        else if (set.comparison === 'Same') statusIcon = '✓ 🟡'
        else if (set.comparison === 'Worse') statusIcon = '✓ 🔴'

        return `
            <tr class="set-row completed">
                <td class="set-cell-num">${set.orderIndex + 1}</td>
                <td class="set-cell-weight">
                    <div>${set.actualWeight || '—'} кг</div>
                    ${ghostW}
                </td>
                <td class="set-cell-reps">
                    <div>${set.actualRepetitions || '—'}</div>
                    ${ghostR}
                </td>
                <td class="set-cell-rpe">${set.rpe || '—'}</td>
                <td class="set-cell-status">${statusIcon}</td>
            </tr>
        `
    }

    if (isActive) {
        const plannedW = set.plannedWeight ? `${set.plannedWeight}кг` : '—'
        const plannedR = set.plannedRepetitions ? `${set.plannedRepetitions}` : '—'

        return `
            <tr class="set-row active" id="set-row-${set.id}">
                <td class="set-cell-num">${set.orderIndex + 1}</td>
                <td class="set-cell-weight">
                    <div>${plannedW}</div>
                    ${ghostW}
                </td>
                <td class="set-cell-reps">
                    <div>${plannedR}</div>
                    ${ghostR}
                </td>
                <td class="set-cell-rpe">—</td>
                <td class="set-cell-status set-cell-actions">
                    <button class="set-action-btn set-action-log" id="log-set-btn-${set.id}">ПОДХОД</button>
                    ${hasPrev ? `<button class="set-action-btn set-action-same" id="same-set-btn-${set.id}">═</button>` : ''}
                </td>
            </tr>
        `
    }

    // Pending
    const plannedW = set.plannedWeight ? `${set.plannedWeight}кг` : '—'
    const plannedR = set.plannedRepetitions ? `${set.plannedRepetitions}` : '—'

    return `
        <tr class="set-row pending">
            <td class="set-cell-num">${set.orderIndex + 1}</td>
            <td class="set-cell-weight">
                <div>${plannedW}</div>
                ${ghostW}
            </td>
            <td class="set-cell-reps">
                <div>${plannedR}</div>
                ${ghostR}
            </td>
            <td class="set-cell-rpe">—</td>
            <td class="set-cell-status"></td>
        </tr>
    `
}

// ── Inline Set Form ─────────────────────────────────────────────

function expandInlineSetForm(set: WorkoutSessionSetDto, exercise: WorkoutSessionExerciseDto, sessionId: string): void {
    const row = document.getElementById(`set-row-${set.id}`)
    if (!row) return

    // Initial values: planned → previous → last completed
    const completedSets = exercise.sets.filter(s => s.completedAt).sort((a, b) => b.orderIndex - a.orderIndex)
    const initWeight = Number(set.plannedWeight || set.previousWeight || completedSets[0]?.actualWeight || 0)
    const initReps = Number(set.plannedRepetitions || set.previousReps || completedSets[0]?.actualRepetitions || 0)
    const hasPrev = completedSets.length > 0 || !!set.previousWeight

    const formRow = document.createElement('tr')
    formRow.className = 'set-row active-form'
    formRow.id = `set-row-form-${set.id}`
    formRow.innerHTML = `
        <td colspan="5">
            <div class="iset-form">
                <div class="iset-header">[ СЕТ ${set.orderIndex + 1} ]</div>
                <div class="iset-row">
                    <span class="iset-label">ВЕС</span>
                    <div class="iset-inc-group">
                        <button class="iset-inc" data-field="weight" data-delta="-5">-5</button>
                        <button class="iset-inc" data-field="weight" data-delta="-2.5">-2.5</button>
                        <input class="iset-input" type="number" id="iset-weight-${set.id}" value="${initWeight || ''}" step="0.5" inputmode="decimal" placeholder="0">
                        <button class="iset-inc" data-field="weight" data-delta="2.5">+2.5</button>
                        <button class="iset-inc" data-field="weight" data-delta="5">+5</button>
                    </div>
                    <span class="iset-unit">кг</span>
                </div>
                <div class="iset-row">
                    <span class="iset-label">ПОВТ</span>
                    <div class="iset-inc-group">
                        <button class="iset-inc" data-field="reps" data-delta="-2">-2</button>
                        <button class="iset-inc" data-field="reps" data-delta="-1">-1</button>
                        <input class="iset-input" type="number" id="iset-reps-${set.id}" value="${initReps || ''}" step="1" inputmode="numeric" placeholder="0">
                        <button class="iset-inc" data-field="reps" data-delta="1">+1</button>
                        <button class="iset-inc" data-field="reps" data-delta="2">+2</button>
                    </div>
                </div>
                <div class="iset-actions">
                    <button class="iset-btn-done" id="iset-done-${set.id}">✓ ЗАПИСАТЬ</button>
                    ${hasPrev ? `<button class="iset-btn-same" id="iset-same-${set.id}">═ КАК ПРОШЛЫЙ</button>` : ''}
                    <button class="iset-btn-cancel" id="iset-cancel-${set.id}">✗</button>
                </div>
            </div>
        </td>
    `

    row.replaceWith(formRow)

    // Auto-focus weight input
    const weightInput = document.getElementById(`iset-weight-${set.id}`) as HTMLInputElement
    if (weightInput) {
        weightInput.focus()
        weightInput.select()
    }

    // Increment/decrement buttons
    formRow.querySelectorAll('.iset-inc').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = (btn as HTMLElement).dataset.field!
            const delta = parseFloat((btn as HTMLElement).dataset.delta!)
            const inputId = field === 'weight' ? `iset-weight-${set.id}` : `iset-reps-${set.id}`
            const input = document.getElementById(inputId) as HTMLInputElement
            if (input) {
                const current = parseFloat(input.value) || 0
                const newVal = Math.max(0, current + delta)
                input.value = newVal % 1 === 0 ? String(newVal) : newVal.toFixed(1)
            }
            if ('vibrate' in navigator) navigator.vibrate(10)
        })
    })

    // Done button → submit
    document.getElementById(`iset-done-${set.id}`)?.addEventListener('click', () => {
        submitInlineSet(set.id, sessionId, exercise)
    })

    // Same as last
    document.getElementById(`iset-same-${set.id}`)?.addEventListener('click', () => {
        inlineSameAsLast(set.id, sessionId, exercise)
    })

    // Cancel → re-render
    document.getElementById(`iset-cancel-${set.id}`)?.addEventListener('click', () => {
        loadActiveWorkout()
    })

    // Enter key submits
    formRow.querySelectorAll('.iset-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Enter') {
                submitInlineSet(set.id, sessionId, exercise)
            }
        })
    })

    // Select all on focus
    formRow.querySelectorAll('.iset-input').forEach(input => {
        input.addEventListener('focus', () => {
            (input as HTMLInputElement).select()
        })
    })
}

async function submitInlineSet(setId: string, sessionId: string, exercise: WorkoutSessionExerciseDto): Promise<void> {
    const weightInput = document.getElementById(`iset-weight-${setId}`) as HTMLInputElement
    const repsInput = document.getElementById(`iset-reps-${setId}`) as HTMLInputElement
    if (!weightInput || !repsInput) return

    const weight = parseFloat(weightInput.value) || 0
    const reps = parseInt(repsInput.value) || 0

    if (!weight && !reps) {
        toast.warning('Введи вес или повторения')
        return
    }

    const doneBtn = document.getElementById(`iset-done-${setId}`) as HTMLButtonElement
    if (doneBtn) doneBtn.disabled = true

    try {
        const result = await workoutSessionsApi.completeSet(sessionId, setId, {
            weight, weightKg: weight, repetitions: reps
        }) as CompleteSetResultDto

        try {
            if (result.isNewPR && result.newPRs?.length > 0) {
                showPRCelebration(result.newPRs, exercise.name)
            }
            toast.success(`✓ ${weight}кг × ${reps}`, 4000)
        } catch (_) {}

        startRestTimer()
        if ('vibrate' in navigator) navigator.vibrate([50, 30, 50])

        const exIdx = (state.activeWorkoutSession as WorkoutSessionDto).exercises.findIndex(e => e.id === exercise.id)
        await loadActiveWorkout()
        if (exIdx >= 0) checkAutoSwipe(exIdx)
    } catch (err) {
        console.error('Failed to complete set (inline):', err)
        toast.error('Ошибка записи подхода')
        if (doneBtn) doneBtn.disabled = false
    }
}

async function inlineSameAsLast(setId: string, sessionId: string, exercise: WorkoutSessionExerciseDto): Promise<void> {
    const completedSets = exercise.sets.filter(s => s.completedAt).sort((a, b) => b.orderIndex - a.orderIndex)

    let weight = 0
    let reps = 0

    if (completedSets.length > 0) {
        weight = Number(completedSets[0].actualWeight || completedSets[0].plannedWeight || 0)
        reps = Number(completedSets[0].actualRepetitions || completedSets[0].plannedRepetitions || 0)
    } else {
        const currentSet = exercise.sets.find(s => s.id === setId)
        if (currentSet) {
            weight = Number(currentSet.previousWeight || currentSet.plannedWeight || 0)
            reps = Number(currentSet.previousReps || currentSet.plannedRepetitions || 0)
        }
    }

    if (!weight && !reps) {
        toast.warning('Нет данных для копирования')
        return
    }

    const btn = document.getElementById(`is-${setId}`) as HTMLButtonElement
    if (btn) { btn.disabled = true }

    try {
        const result = await workoutSessionsApi.completeSet(sessionId, setId, {
            weight, weightKg: weight, repetitions: reps
        }) as CompleteSetResultDto

        try {
            if (result.isNewPR && result.newPRs?.length > 0) {
                showPRCelebration(result.newPRs, exercise.name)
            }
            toast.success(`═ ${weight}кг × ${reps}`, 4000)
        } catch (_) {}

        startRestTimer()
        if ('vibrate' in navigator) navigator.vibrate([50, 30, 50])

        const exIdx = (state.activeWorkoutSession as WorkoutSessionDto).exercises.findIndex(e => e.id === exercise.id)
        await loadActiveWorkout()
        if (exIdx >= 0) checkAutoSwipe(exIdx)
    } catch (err) {
        console.error('Failed to complete set (same):', err)
        toast.error('Ошибка записи подхода')
        if (btn) { btn.disabled = false }
    }
}

function scrollToSlide(index: number, smooth = true): void {
    const carousel = document.getElementById('exercise-carousel')
    if (!carousel) return
    const slide = carousel.children[index] as HTMLElement
    if (slide) {
        slide.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' as ScrollBehavior, inline: 'center', block: 'nearest' })
    }
}

function updateCarouselUI(): void {
    const session = state.activeWorkoutSession as WorkoutSessionDto | null
    if (!session) return

    const counterEl = document.getElementById('carousel-index')
    if (counterEl) counterEl.textContent = String(currentExerciseIndex + 1)

    const counter = document.querySelector('.exercise-carousel-counter')
    if (counter && session.exercises[currentExerciseIndex]) {
        counter.innerHTML = `
            <span id="carousel-index">${currentExerciseIndex + 1}</span>/${session.exercises.length}
            ${escapeHtml(session.exercises[currentExerciseIndex].name)}
        `
    }

    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        const ex = session.exercises[i]
        if (!ex) return
        const allDone = ex.sets.every(s => s.completedAt)
        const isCurrent = i === currentExerciseIndex
        dot.className = `carousel-dot ${allDone ? 'dot-done' : isCurrent ? 'dot-current' : 'dot-pending'}`
    })
}

function cancelAutoSwipe(): void {
    if (autoSwipeTimer) {
        clearTimeout(autoSwipeTimer)
        autoSwipeTimer = null
    }
}

function checkAutoSwipe(exerciseIndex: number): void {
    const session = state.activeWorkoutSession as WorkoutSessionDto | null
    if (!session) return

    const exercise = session.exercises[exerciseIndex]
    if (!exercise) return

    const allDone = exercise.sets.every(s => s.completedAt)
    if (!allDone) return

    let nextIdx = -1
    for (let i = exerciseIndex + 1; i < session.exercises.length; i++) {
        if (session.exercises[i].sets.some(s => !s.completedAt)) {
            nextIdx = i
            break
        }
    }

    if (nextIdx < 0) return

    const nextName = session.exercises[nextIdx].name
    toast.info(`Следующее: ${nextName}`, 3000)

    autoSwipeTimer = setTimeout(() => {
        currentExerciseIndex = nextIdx
        scrollToSlide(nextIdx)
        updateCarouselUI()
        autoSwipeTimer = null
    }, 3000)
}

// sameAsLastSet removed — replaced by inlineSameAsLast above

async function addExtraSet(sessionId: string, exercise: WorkoutSessionExerciseDto): Promise<void> {
    const completedSets = exercise.sets.filter(s => s.completedAt).sort((a, b) => b.orderIndex - a.orderIndex)
    let weight: number | undefined
    let reps: number | undefined

    if (completedSets.length > 0) {
        weight = Number(completedSets[0].actualWeight || 0) || undefined
        reps = Number(completedSets[0].actualRepetitions || 0) || undefined
    }

    try {
        await workoutSessionsApi.addSet(sessionId, exercise.id, {
            weight,
            repetitions: reps
        })

        if ('vibrate' in navigator) {
            navigator.vibrate(30)
        }

        toast.success('Подход добавлен')
        await loadActiveWorkout()
    } catch (err) {
        console.error('Failed to add set:', err)
        toast.error('Ошибка добавления подхода')
    }
}

async function loadExerciseCatalog(): Promise<void> {
    if (sessionExerciseCatalogLoaded) return
    try {
        sessionExerciseCatalog = await api(ENDPOINTS.exerciseCatalog.list) as any[]
        sessionExerciseCatalogLoaded = true
    } catch (_) {
        sessionExerciseCatalog = []
    }
}

function openAddExerciseModal(sessionId: string): void {
    const modal = document.getElementById('add-exercise-session-modal')
    if (!modal) return

    modal.classList.add('active')
    document.body.classList.add('modal-open')

    loadExerciseCatalog().then(() => renderSessionCatalogList('', ''))

    const searchInput = document.getElementById('session-exercise-search') as HTMLInputElement
    const filterSelect = document.getElementById('session-exercise-filter') as HTMLSelectElement

    const searchHandler = () => renderSessionCatalogList(searchInput.value, filterSelect.value)
    searchInput.oninput = searchHandler
    filterSelect.onchange = searchHandler

    ;(window as any)._addExerciseSessionId = sessionId
}

function renderSessionCatalogList(search: string, muscleFilter: string): void {
    const listEl = document.getElementById('session-exercise-catalog-list')
    if (!listEl) return

    let filtered = sessionExerciseCatalog
    if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter((e: any) =>
            (e.nameRu || '').toLowerCase().includes(q) ||
            (e.nameEn || '').toLowerCase().includes(q) ||
            (e.name || '').toLowerCase().includes(q)
        )
    }
    if (muscleFilter) {
        filtered = filtered.filter((e: any) => String(e.muscleGroup) === muscleFilter)
    }

    const shown = filtered.slice(0, 50)

    if (shown.length === 0) {
        listEl.innerHTML = '<div style="color: var(--text-secondary); padding: 8px;">Упражнения не найдены. Введите вручную ниже.</div>'
        return
    }

    listEl.innerHTML = shown.map((e: any) => `
        <div class="session-catalog-item" data-name="${escapeHtml(e.nameRu || e.name || e.nameEn || '')}" data-muscle="${e.muscleGroup || 0}" style="padding: 8px; border-bottom: 1px solid var(--border); cursor: pointer;">
            <div style="color: var(--text-primary);">${escapeHtml(e.nameRu || e.name || e.nameEn || '')}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(e.target || e.bodyPart || '')}</div>
        </div>
    `).join('')

    listEl.querySelectorAll('.session-catalog-item').forEach(item => {
        item.addEventListener('click', () => {
            const nameInput = document.getElementById('session-exercise-name') as HTMLInputElement
            const muscleSelect = document.getElementById('session-exercise-muscle') as HTMLSelectElement
            nameInput.value = (item as HTMLElement).dataset.name || ''
            muscleSelect.value = (item as HTMLElement).dataset.muscle || '0'
        })
    })
}

;(window as any).closeAddExerciseSessionModal = (): void => {
    const modal = document.getElementById('add-exercise-session-modal')
    if (modal) {
        modal.classList.remove('active')
        document.body.classList.remove('modal-open')
    }
}

;(window as any).saveAddExerciseToSession = async (): Promise<void> => {
    const sessionId = (window as any)._addExerciseSessionId
    if (!sessionId) return

    const nameInput = document.getElementById('session-exercise-name') as HTMLInputElement
    const muscleSelect = document.getElementById('session-exercise-muscle') as HTMLSelectElement

    const name = nameInput.value.trim()
    if (!name) {
        toast.warning('Введите название упражнения')
        return
    }

    try {
        await workoutSessionsApi.addExercise(sessionId, {
            name,
            muscleGroup: muscleSelect.value
        })

        toast.success('Упражнение добавлено')
        ;(window as any).closeAddExerciseSessionModal()

        if ('vibrate' in navigator) {
            navigator.vibrate(30)
        }

        await loadActiveWorkout()
        currentExerciseIndex = (state.activeWorkoutSession as WorkoutSessionDto).exercises.length - 1
        scrollToSlide(currentExerciseIndex)
        updateCarouselUI()
    } catch (err) {
        console.error('Failed to add exercise to session:', err)
        toast.error('Ошибка добавления упражнения')
    }
}

function startElapsedTimer(): void {
    if (elapsedInterval) clearInterval(elapsedInterval)

    elapsedInterval = setInterval(() => {
        const session = state.activeWorkoutSession as WorkoutSessionDto | null
        if (!session) {
            if (elapsedInterval) clearInterval(elapsedInterval)
            return
        }

        const start = new Date(session.startedAt).getTime()
        const elapsed = Math.floor((Date.now() - start) / 1000)

        const hours = Math.floor(elapsed / 3600)
        const mins = Math.floor((elapsed % 3600) / 60)
        const secs = elapsed % 60

        const elapsedEl = document.getElementById('elapsed-time')
        if (elapsedEl) {
            elapsedEl.textContent = hours > 0
                ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        }
    }, 1000)
}

function updateTonnage(): void {
    const session = state.activeWorkoutSession as WorkoutSessionDto | null
    if (!session) return

    let tonnage = 0
    for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
            if (set.completedAt && set.actualWeightKg && set.actualRepetitions) {
                tonnage += set.actualWeightKg * set.actualRepetitions
            }
        }
    }

    const tonnageEl = document.getElementById('current-tonnage')
    if (tonnageEl) {
        tonnageEl.textContent = `${tonnage.toFixed(0)} кг`
    }
}

export async function finishWorkout(): Promise<void> {
    const session = state.activeWorkoutSession as WorkoutSessionDto | null
    if (!session) return

    const confirmed = confirm('Завершить тренировку?')
    if (!confirmed) return

    try {
        const summary = await workoutSessionsApi.complete(session.id) as { session: WorkoutSessionDto }

        state.activeWorkoutSession = null
        hideMiniBar()
        await releaseWakeLock()

        if (elapsedInterval) {
            clearInterval(elapsedInterval)
            elapsedInterval = null
        }

        currentExerciseIndex = 0

        showWorkoutSummaryModal(summary.session)
    } catch (err) {
        console.error('Failed to finish workout:', err)
        toast.error('Ошибка завершения тренировки')
    }
}

function showWorkoutSummaryModal(session: WorkoutSessionDto): void {
    const overlay = document.getElementById('workout-summary-overlay') || createWorkoutSummaryOverlay()
    const content = document.getElementById('workout-summary-content')
    if (!content) return

    const durationMin = Math.floor(session.durationSeconds / 60)
    const durationSec = session.durationSeconds % 60
    const started = new Date(session.startedAt)
    const completed = session.completedAt ? new Date(session.completedAt) : started
    const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0)

    let byExerciseHtml = ''
    for (const ex of session.exercises) {
        const exTonnage = ex.sets.reduce((t, set) => t + ((set.actualWeightKg ?? 0) * (set.actualRepetitions ?? 0)), 0)
        const exReps = ex.sets.reduce((t, set) => t + (set.actualRepetitions || 0), 0)
        const exSets = ex.sets.filter(s => s.completedAt).length
        byExerciseHtml += `
            <div class="workout-summary-exercise">
                <span class="workout-summary-ex-name">${escapeHtml(ex.name)}</span>
                <span class="workout-summary-ex-stats">${exSets} подходов · ${exTonnage.toFixed(0)} кг · ${exReps} повт.</span>
            </div>
        `
    }

    content.innerHTML = `
        <div class="workout-summary-header">
            <h2 class="workout-summary-title">ИТОГИ ТРЕНИРОВКИ</h2>
            <div class="workout-summary-subtitle">${escapeHtml(session.title)}</div>
        </div>
        <div class="workout-summary-meta">
            <div>Длительность: ${durationMin}м ${durationSec}с</div>
            <div>Начало: ${started.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — Конец: ${completed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="workout-summary-stats">
            <div class="workout-summary-stat"><span class="workout-summary-stat-label">Тоннаж</span><span class="workout-summary-stat-value">${session.totalTonnage.toFixed(0)} кг</span></div>
            <div class="workout-summary-stat"><span class="workout-summary-stat-label">Объём</span><span class="workout-summary-stat-value">${session.totalVolume} повт.</span></div>
            <div class="workout-summary-stat"><span class="workout-summary-stat-label">Подходы</span><span class="workout-summary-stat-value">${session.totalSetsCompleted}/${totalSets}</span></div>
            <div class="workout-summary-stat"><span class="workout-summary-stat-label">Ср. интенсивность</span><span class="workout-summary-stat-value">${session.averageIntensity.toFixed(1)} кг/повт.</span></div>
            <div class="workout-summary-stat"><span class="workout-summary-stat-label">Ср. отдых</span><span class="workout-summary-stat-value">${session.averageRestSeconds} с</span></div>
        </div>
        <div class="workout-summary-by-exercise">
            <div class="workout-summary-by-ex-title">По упражнениям</div>
            ${byExerciseHtml}
        </div>
        <button class="btn btn-primary workout-summary-close" id="workout-summary-close-btn">ЗАКРЫТЬ</button>
    `

    overlay.classList.add('active')
    document.body.classList.add('modal-open')

    document.getElementById('workout-summary-close-btn')?.addEventListener('click', () => {
        overlay.classList.remove('active')
        document.body.classList.remove('modal-open')
        switchWorkoutSubTab('history')
        loadWorkoutHistory(1)
    })
}

function createWorkoutSummaryOverlay(): HTMLElement {
    const overlay = document.createElement('div')
    overlay.id = 'workout-summary-overlay'
    overlay.className = 'modal-overlay workout-summary-overlay'
    const content = document.createElement('div')
    content.id = 'workout-summary-content'
    content.className = 'modal workout-summary-modal'
    overlay.appendChild(content)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active')
            document.body.classList.remove('modal-open')
        }
    })
    document.body.appendChild(overlay)
    return overlay
}

async function loadWorkoutHistory(page: number): Promise<void> {
    const { loadWorkoutHistory: load } = await import('./workoutDiary.js')
    load(page)
}

export async function abandonWorkout(): Promise<void> {
    const session = state.activeWorkoutSession as WorkoutSessionDto | null
    if (!session) return

    const confirmed = confirm('Отменить тренировку? Все данные будут потеряны.')
    if (!confirmed) return

    try {
        await workoutSessionsApi.abandon(session.id)

        toast.info('Тренировка отменена')

        state.activeWorkoutSession = null
        hideMiniBar()
        await releaseWakeLock()

        if (elapsedInterval) {
            clearInterval(elapsedInterval)
            elapsedInterval = null
        }

        currentExerciseIndex = 0
        await renderSmartDaySuggestion()
    } catch (err) {
        console.error('Failed to abandon workout:', err)
        toast.error('Ошибка отмены тренировки')
    }
}

function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

export function initActiveWorkout(): void {
    loadActiveWorkout()
}

;(window as any).finishWorkout = finishWorkout
;(window as any).abandonWorkout = abandonWorkout
