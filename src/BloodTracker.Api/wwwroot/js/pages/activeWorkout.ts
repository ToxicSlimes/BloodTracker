import { workoutSessionsApi } from '../api.js'
import { state } from '../state.js'
import { toast } from '../components/toast.js'
import { acquireWakeLock, releaseWakeLock } from '../components/wakeLock.js'
import { openQuickSetLogger } from '../components/quickSetLogger.js'
import type { WorkoutSessionDto, WorkoutSessionExerciseDto, WorkoutSessionSetDto } from '../types/workouts.js'

let elapsedInterval: ReturnType<typeof setInterval> | null = null
let expandedExerciseId: string | null = null

export async function loadActiveWorkout(): Promise<void> {
    try {
        const session = await workoutSessionsApi.getActive() as WorkoutSessionDto | null
        
        if (!session) {
            state.activeWorkoutSession = null
            renderActiveWorkout()
            return
        }

        state.activeWorkoutSession = session

        // Auto-expand first incomplete exercise before rendering (avoids recursion)
        if (expandedExerciseId === null) {
            const firstIncomplete = session.exercises.find(
                (ex: WorkoutSessionExerciseDto) => ex.sets.some((s: WorkoutSessionSetDto) => !s.completedAt)
            )
            if (firstIncomplete) expandedExerciseId = firstIncomplete.id
        }

        renderActiveWorkout()
        await acquireWakeLock()
        startElapsedTimer()
    } catch (err) {
        console.error('Failed to load active workout:', err)
        toast.error('Ошибка загрузки тренировки')
    }
}

export function renderActiveWorkout(): void {
    const container = document.getElementById('active-workout-content')
    if (!container) return

    const session = state.activeWorkoutSession as WorkoutSessionDto | null

    if (!session) {
        container.innerHTML = `
            <div class="workout-history-empty">
                <div class="workout-history-empty-icon">🏋️</div>
                <div class="workout-history-empty-title">Нет активной тренировки</div>
                <div class="workout-history-empty-text">
                    Начните тренировку из раздела Программы
                </div>
            </div>
        `
        return
    }

    const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    const completedSets = session.exercises.reduce((sum, ex) => 
        sum + ex.sets.filter(s => s.completedAt).length, 0)

    container.innerHTML = `
        <div class="active-workout-header">
            <div class="active-workout-title">${escapeHtml(session.title)}</div>
            <div class="active-workout-actions">
                <button class="btn btn-secondary" onclick="window.abandonWorkout()">ОТМЕНИТЬ</button>
                <button class="btn btn-primary" onclick="window.finishWorkout()">ЗАВЕРШИТЬ</button>
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

        <div class="active-workout-exercises">
            ${session.exercises.map(exercise => renderExercise(exercise, session.id)).join('')}
        </div>
    `

    session.exercises.forEach(exercise => {
        document.getElementById(`exercise-header-${exercise.id}`)?.addEventListener('click', () => {
            toggleExercise(exercise.id)
        })

        exercise.sets.forEach(set => {
            if (!set.completedAt) {
                document.getElementById(`log-set-btn-${set.id}`)?.addEventListener('click', () => {
                    openQuickSetLogger(session.id, set.id, exercise.name, set, () => {
                        loadActiveWorkout()
                    })
                })
            }
        })
    })

    updateTonnage()
}

function renderExercise(exercise: WorkoutSessionExerciseDto, sessionId: string): string {
    const completedSets = exercise.sets.filter(s => s.completedAt).length
    const totalSets = exercise.sets.length
    const isCompleted = completedSets === totalSets
    const isExpanded = expandedExerciseId === exercise.id

    return `
        <div class="active-workout-exercise ${isCompleted ? 'completed' : ''} ${isExpanded ? 'expanded' : ''}" id="exercise-${exercise.id}">
            <div class="active-workout-exercise-header" id="exercise-header-${exercise.id}">
                <div>
                    <div class="active-workout-exercise-title">
                        ${escapeHtml(exercise.name)} ${isCompleted ? '✓' : ''}
                    </div>
                    <div class="active-workout-exercise-stats">
                        ${exercise.muscleGroup} · ${completedSets}/${totalSets} подходов
                    </div>
                </div>
                <div class="active-workout-exercise-toggle">${isExpanded ? '▼' : '▶'}</div>
            </div>
            <div class="active-workout-exercise-body">
                <div class="active-workout-sets">
                    ${exercise.sets.map(set => renderSet(set)).join('')}
                </div>
            </div>
        </div>
    `
}

function renderSet(set: WorkoutSessionSetDto): string {
    const isCompleted = !!set.completedAt
    const isActive = !isCompleted && !hasUncompletedBefore(set)

    let comparisonIcon = ''
    if (set.comparison === 'Better') comparisonIcon = '<span class="active-workout-set-comparison better">🟢</span>'
    else if (set.comparison === 'Same') comparisonIcon = '<span class="active-workout-set-comparison same">🟡</span>'
    else if (set.comparison === 'Worse') comparisonIcon = '<span class="active-workout-set-comparison worse">🔴</span>'

    const weightDisplay = isCompleted && set.actualWeight
        ? `${set.actualWeight}кг`
        : set.plannedWeight ? `${set.plannedWeight}кг` : '—'

    const repsDisplay = isCompleted && set.actualRepetitions
        ? `${set.actualRepetitions}`
        : set.plannedRepetitions ? `${set.plannedRepetitions}` : '—'

    const ghostWeight = set.previousWeight ? `<div class="active-workout-set-ghost">${set.previousWeight}кг</div>` : ''
    const ghostReps = set.previousReps ? `<div class="active-workout-set-ghost">×${set.previousReps}</div>` : ''

    return `
        <div class="active-workout-set ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
            <div class="active-workout-set-number">Сет ${set.orderIndex + 1}</div>
            <div class="active-workout-set-data">
                <div class="active-workout-set-value">
                    <div class="active-workout-set-label">Вес</div>
                    <div class="active-workout-set-actual">${weightDisplay}</div>
                    ${ghostWeight}
                </div>
                <div class="active-workout-set-value">
                    <div class="active-workout-set-label">Повт.</div>
                    <div class="active-workout-set-actual">${repsDisplay}</div>
                    ${ghostReps}
                </div>
                ${isCompleted && set.rpe ? `
                    <div class="active-workout-set-value">
                        <div class="active-workout-set-label">RPE</div>
                        <div class="active-workout-set-actual">${set.rpe}</div>
                    </div>
                ` : ''}
                ${comparisonIcon}
            </div>
            ${isActive ? `
                <button class="active-workout-set-action" id="log-set-btn-${set.id}">
                    ПОДХОД
                </button>
            ` : isCompleted ? `
                <div style="color: var(--green); font-size: var(--font-size-xl);">✓</div>
            ` : ''}
        </div>
    `
}

function hasUncompletedBefore(currentSet: WorkoutSessionSetDto): boolean {
    const session = state.activeWorkoutSession as WorkoutSessionDto
    if (!session) return false

    const exercise = session.exercises.find(ex => ex.sets.some(s => s.id === currentSet.id))
    if (!exercise) return false

    return exercise.sets.some(s => s.orderIndex < currentSet.orderIndex && !s.completedAt)
}

function toggleExercise(exerciseId: string): void {
    if (expandedExerciseId === exerciseId) {
        expandedExerciseId = null
    } else {
        expandedExerciseId = exerciseId
    }
    renderActiveWorkout()
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

        window.location.hash = '#workout-diary'
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

        window.location.hash = '#workouts'
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
    const page = document.getElementById('active-workout')
    if (!page) return

    loadActiveWorkout()
}

;(window as any).finishWorkout = finishWorkout
;(window as any).abandonWorkout = abandonWorkout
