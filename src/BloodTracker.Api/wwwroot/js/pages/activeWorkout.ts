import { workoutSessionsApi, workoutsApi, api } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { state } from '../state.js'
import { toast } from '../components/toast.js'
import { acquireWakeLock, releaseWakeLock } from '../components/wakeLock.js'
import { startRestTimer } from '../components/restTimer.js'
import { showPRCelebration } from '../components/prCelebration.js'
import type {
    WorkoutSessionDto,
    WorkoutSessionExerciseDto,
    WorkoutSessionSetDto,
    CompleteSetResultDto,
    WeekStatusDto,
    WorkoutDayDto,
    WorkoutProgramDto
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

        let recommendedHtml = ''
        if (recommendedDay) {
            recommendedHtml = `
                <div class="smart-day-recommended">
                    <div class="smart-day-recommended-badge">РЕКОМЕНДАЦИЯ</div>
                    <div class="smart-day-recommended-icon">🏋️</div>
                    <div class="smart-day-recommended-title">${escapeHtml(DAY_NAMES[recommendedDay.dayOfWeek])} — ${escapeHtml(recommendedDay.title || '')}</div>
                    <button class="btn-primary smart-day-start-btn" data-day-id="${recommendedDay.id}">
                        ▶ НАЧАТЬ ТРЕНИРОВКУ
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
                        return `
                            <div class="smart-day-card ${isDone ? 'smart-day-card--done' : ''}">
                                <div class="smart-day-card-name">${escapeHtml(DAY_NAMES[d.dayOfWeek])}</div>
                                <div class="smart-day-card-title">${escapeHtml(d.title || '')}</div>
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
                <button class="smart-day-empty-workout-btn" id="start-empty-workout-btn">[ + ПУСТАЯ ТРЕНИРОВКА ]</button>
            </div>
        `

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
                    document.getElementById(`ic-${set.id}`)?.addEventListener('click', () => {
                        inlineCompleteSet(set.id, session.id, exercise.name, exercise.id)
                    })

                    document.getElementById(`is-${set.id}`)?.addEventListener('click', () => {
                        inlineSameAsLast(set.id, session.id, exercise)
                    })

                    // Enter key in inputs triggers completion
                    const weightIn = document.getElementById(`iw-${set.id}`)
                    const repsIn = document.getElementById(`ir-${set.id}`)
                    const enterHandler = (e: Event) => {
                        if ((e as KeyboardEvent).key === 'Enter') {
                            inlineCompleteSet(set.id, session.id, exercise.name, exercise.id)
                        }
                    }
                    weightIn?.addEventListener('keydown', enterHandler)
                    repsIn?.addEventListener('keydown', enterHandler)

                    // Auto-focus weight input on active set
                    if (exIdx === currentExerciseIndex) {
                        setTimeout(() => {
                            const wi = document.getElementById(`iw-${set.id}`) as HTMLInputElement
                            if (wi) { wi.focus(); wi.select() }
                        }, 200)
                    }
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
    const isCompleted = completedSets === totalSets && totalSets > 0

    const firstPrev = exercise.sets.find(s => s.previousWeight)
    const prevHint = firstPrev
        ? `<div class="exercise-slide-prev-hint">Прошлый раз: ${firstPrev.previousWeight}кг × ${firstPrev.previousReps || '?'}</div>`
        : ''

    return `
        <div class="exercise-slide" data-index="${index}">
            <div class="exercise-slide-header">
                <div class="exercise-slide-name">${escapeHtml(exercise.name)} ${isCompleted ? '✓' : ''}</div>
                <div class="exercise-slide-stats">${exercise.muscleGroup} · ${completedSets}/${totalSets} подходов</div>
                ${prevHint}
            </div>
            <div class="exercise-slide-sets">
                ${exercise.sets.map(set => renderSet(set, exercise, sessionId)).join('')}
            </div>
            <button class="add-set-btn" id="add-set-btn-${exercise.id}">+ ЕЩЁ ПОДХОД</button>
        </div>
    `
}

function renderSet(set: WorkoutSessionSetDto, exercise: WorkoutSessionExerciseDto, sessionId: string): string {
    const isCompleted = !!set.completedAt
    const isActive = !isCompleted && !exercise.sets.some(s => s.orderIndex < set.orderIndex && !s.completedAt)

    if (isCompleted) {
        let comparisonIcon = ''
        if (set.comparison === 'Better') comparisonIcon = '<span class="set-comparison better">🟢</span>'
        else if (set.comparison === 'Same') comparisonIcon = '<span class="set-comparison same">🟡</span>'
        else if (set.comparison === 'Worse') comparisonIcon = '<span class="set-comparison worse">🔴</span>'

        return `
            <div class="active-workout-set completed">
                <div class="set-num">${set.orderIndex + 1}</div>
                <div class="set-result">
                    <span class="set-weight">${set.actualWeight || '—'}кг</span>
                    <span class="set-x">×</span>
                    <span class="set-reps">${set.actualRepetitions || '—'}</span>
                    ${set.rpe ? `<span class="set-rpe">RPE ${set.rpe}</span>` : ''}
                </div>
                ${comparisonIcon}
                <div class="set-done-icon">✓</div>
            </div>
        `
    }

    if (isActive) {
        const prefillWeight = set.plannedWeight || set.previousWeight || 0
        const prefillReps = set.plannedRepetitions || set.previousReps || 0
        const hasPrev = exercise.sets.some(s => s.completedAt && s.orderIndex < set.orderIndex) || !!set.previousWeight

        return `
            <div class="active-workout-set active-input" data-set-id="${set.id}" data-session-id="${sessionId}" data-exercise-name="${escapeHtml(exercise.name)}" data-exercise-id="${exercise.id}">
                <div class="set-num">${set.orderIndex + 1}</div>
                <div class="inline-set-form">
                    <input type="number" inputmode="decimal" class="inline-input inline-weight"
                           id="iw-${set.id}" value="${prefillWeight || ''}"
                           placeholder="кг" step="2.5" />
                    <span class="inline-x">×</span>
                    <input type="number" inputmode="numeric" class="inline-input inline-reps"
                           id="ir-${set.id}" value="${prefillReps || ''}"
                           placeholder="повт" step="1" />
                    <button class="inline-btn-complete" id="ic-${set.id}" title="Записать подход">✓</button>
                    ${hasPrev ? `<button class="inline-btn-same" id="is-${set.id}" title="Как прошлый">═</button>` : ''}
                </div>
            </div>
        `
    }

    // Pending (future) set — compact display
    const plannedW = set.plannedWeight ? `${set.plannedWeight}кг` : '—'
    const plannedR = set.plannedRepetitions ? `${set.plannedRepetitions}` : '—'

    return `
        <div class="active-workout-set pending">
            <div class="set-num">${set.orderIndex + 1}</div>
            <div class="set-result pending-values">
                <span class="set-weight">${plannedW}</span>
                <span class="set-x">×</span>
                <span class="set-reps">${plannedR}</span>
            </div>
        </div>
    `
}

async function inlineCompleteSet(setId: string, sessionId: string, exerciseName: string, exerciseId: string): Promise<void> {
    const weightInput = document.getElementById(`iw-${setId}`) as HTMLInputElement
    const repsInput = document.getElementById(`ir-${setId}`) as HTMLInputElement

    const weight = parseFloat(weightInput?.value || '0')
    const reps = parseInt(repsInput?.value || '0')

    if (!weight && !reps) {
        toast.warning('Введите вес или повторения')
        weightInput?.focus()
        return
    }

    const btn = document.getElementById(`ic-${setId}`) as HTMLButtonElement
    if (btn) { btn.disabled = true; btn.textContent = '...' }

    try {
        const result = await workoutSessionsApi.completeSet(sessionId, setId, {
            weight, weightKg: weight, repetitions: reps
        }) as CompleteSetResultDto

        try {
            if (result.isNewPR && result.newPRs?.length > 0) {
                showPRCelebration(result.newPRs, exerciseName)
            }

            const comp = result.set?.comparison
            const icon = comp === 'Better' ? '🟢 ' : comp === 'Same' ? '🟡 ' : comp === 'Worse' ? '🔴 ' : ''
            const toastEl = toast.success(`${icon}${weight}кг × ${reps}`, 4000)

            if (toastEl) {
                const undoBtn = document.createElement('button')
                undoBtn.textContent = 'ОТМЕНА'
                undoBtn.className = 'toast-undo-btn'
                undoBtn.style.cssText = 'margin-left:8px;padding:2px 10px;background:var(--bg-void-black);border:1px solid var(--border);border-radius:2px;cursor:pointer;color:var(--text-primary);font-size:12px;'
                undoBtn.onclick = async () => {
                    try {
                        await workoutSessionsApi.undoSet(sessionId)
                        toast.info('Подход отменён')
                        await loadActiveWorkout()
                    } catch (_) { toast.error('Ошибка отмены') }
                }
                const tc = toastEl.querySelector('.toast-content')
                if (tc) tc.appendChild(undoBtn)
            }
        } catch (uiErr) {
            console.warn('Non-critical UI error:', uiErr)
        }

        startRestTimer(90)
        if ('vibrate' in navigator) navigator.vibrate([50, 30, 50])

        const exIdx = (state.activeWorkoutSession as WorkoutSessionDto).exercises.findIndex(e => e.id === exerciseId)
        await loadActiveWorkout()
        if (exIdx >= 0) checkAutoSwipe(exIdx)
    } catch (err) {
        console.error('Failed to complete set:', err)
        toast.error('Ошибка записи подхода')
        if (btn) { btn.disabled = false; btn.textContent = '✓' }
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

        startRestTimer(90)
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
        await workoutSessionsApi.complete(session.id)

        toast.success('Тренировка завершена!')

        state.activeWorkoutSession = null
        await releaseWakeLock()

        if (elapsedInterval) {
            clearInterval(elapsedInterval)
            elapsedInterval = null
        }

        currentExerciseIndex = 0

        const { switchWorkoutSubTab } = await import('../components/navigation.js')
        switchWorkoutSubTab('history')
    } catch (err) {
        console.error('Failed to finish workout:', err)
        toast.error('Ошибка завершения тренировки')
    }
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
