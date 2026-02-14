import { workoutSessionsApi } from '../api.js'
import { api } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { state } from '../state.js'
import { toast } from './toast.js'
import { startRestTimer } from './restTimer.js'
import { showPRCelebration } from './prCelebration.js'
import type { 
    WorkoutSessionSetDto, 
    CompleteSetResultDto, 
    UserExercisePRDto,
    PreviousExerciseDataDto
} from '../types/workouts.js'

let currentSetId: string | null = null
let currentSessionId: string | null = null
let currentExerciseName: string | null = null
let onCompleteCallback: (() => void) | null = null

const exercisePRsCache: Map<string, UserExercisePRDto | null> = new Map()

export function initQuickSetLogger(): void {
    const container = document.getElementById('quick-set-logger-container')
    if (!container) return

    container.innerHTML = `
        <div class="quick-set-logger-modal" id="quick-set-logger-modal">
            <div class="quick-set-logger-header">
                <div class="quick-set-logger-title" id="quick-set-logger-title">ПОДХОД</div>
                <div class="quick-set-logger-subtitle" id="quick-set-logger-subtitle"></div>
            </div>

            <div class="quick-set-what-to-beat" id="what-to-beat" style="display: none;"></div>
            <div class="quick-set-almost-pr" id="almost-pr" style="display: none;"></div>

            <div class="quick-set-logger-field">
                <label class="quick-set-logger-label">Вес (кг)</label>
                <div class="quick-set-logger-input-group">
                    <button class="quick-set-logger-increment-btn" data-action="weight" data-delta="-5">-5</button>
                    <button class="quick-set-logger-increment-btn" data-action="weight" data-delta="-2.5">-2.5</button>
                    <input type="number" inputmode="decimal" class="quick-set-logger-input" id="set-weight" step="0.5" />
                    <button class="quick-set-logger-increment-btn" data-action="weight" data-delta="2.5">+2.5</button>
                    <button class="quick-set-logger-increment-btn" data-action="weight" data-delta="5">+5</button>
                </div>
            </div>

            <div class="quick-set-logger-field">
                <label class="quick-set-logger-label">Повторения</label>
                <div class="quick-set-logger-input-group">
                    <button class="quick-set-logger-increment-btn" data-action="reps" data-delta="-2">-2</button>
                    <button class="quick-set-logger-increment-btn" data-action="reps" data-delta="-1">-1</button>
                    <input type="number" inputmode="numeric" class="quick-set-logger-input" id="set-reps" step="1" />
                    <button class="quick-set-logger-increment-btn" data-action="reps" data-delta="1">+1</button>
                    <button class="quick-set-logger-increment-btn" data-action="reps" data-delta="2">+2</button>
                </div>
            </div>

            <div class="quick-set-logger-field">
                <label class="quick-set-logger-label">RPE (1-10)</label>
                <div class="quick-set-logger-rpe-slider" id="rpe-slider"></div>
            </div>

            <div class="quick-set-logger-actions">
                <button class="quick-set-logger-btn quick-set-logger-btn-secondary" id="quick-set-logger-cancel">
                    ОТМЕНА
                </button>
                <button class="quick-set-logger-btn quick-set-logger-btn-primary" id="quick-set-logger-save">
                    ✓ ЗАВЕРШИТЬ ПОДХОД
                </button>
            </div>
        </div>
        <div class="bottom-sheet-backdrop" id="quick-set-logger-backdrop"></div>
    `

    const rpeSlider = document.getElementById('rpe-slider')!
    for (let i = 1; i <= 10; i++) {
        const option = document.createElement('div')
        option.className = 'quick-set-logger-rpe-option'
        option.textContent = String(i)
        option.dataset.rpe = String(i)
        option.addEventListener('click', () => selectRpe(i))
        rpeSlider.appendChild(option)
    }

    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', handleIncrement)
    })

    document.getElementById('quick-set-logger-save')?.addEventListener('click', saveSet)
    document.getElementById('quick-set-logger-cancel')?.addEventListener('click', closeQuickSetLogger)
    document.getElementById('quick-set-logger-backdrop')?.addEventListener('click', closeQuickSetLogger)

    document.getElementById('set-weight')?.addEventListener('focus', (e) => {
        (e.target as HTMLInputElement).select()
    })

    document.getElementById('set-reps')?.addEventListener('focus', (e) => {
        (e.target as HTMLInputElement).select()
    })
}

function handleIncrement(e: Event): void {
    const btn = e.currentTarget as HTMLElement
    const action = btn.dataset.action
    const delta = parseFloat(btn.dataset.delta || '0')

    if (action === 'weight') {
        const input = document.getElementById('set-weight') as HTMLInputElement
        const current = parseFloat(input.value) || 0
        input.value = String(Math.max(0, current + delta))
    } else if (action === 'reps') {
        const input = document.getElementById('set-reps') as HTMLInputElement
        const current = parseInt(input.value) || 0
        input.value = String(Math.max(0, current + delta))
    }

    if ('vibrate' in navigator) {
        navigator.vibrate(10)
    }
}

function selectRpe(rpe: number): void {
    document.querySelectorAll('.quick-set-logger-rpe-option').forEach(opt => {
        opt.classList.toggle('selected', (opt as HTMLElement).dataset.rpe === String(rpe))
    })

    if ('vibrate' in navigator) {
        navigator.vibrate(10)
    }
}

async function fetchExercisePRs(exerciseName: string): Promise<UserExercisePRDto | null> {
    if (exercisePRsCache.has(exerciseName)) {
        return exercisePRsCache.get(exerciseName)!
    }

    try {
        const allPRs = await api<UserExercisePRDto[]>(ENDPOINTS.analytics.exercisePRs)
        const exercisePR = allPRs.find(pr => pr.exerciseName === exerciseName) || null
        exercisePRsCache.set(exerciseName, exercisePR)
        return exercisePR
    } catch (err) {
        console.error('Failed to fetch exercise PRs:', err)
        exercisePRsCache.set(exerciseName, null)
        return null
    }
}

async function fetchPreviousExerciseData(exerciseName: string): Promise<PreviousExerciseDataDto | null> {
    try {
        return await workoutSessionsApi.getPreviousExercise(exerciseName) as PreviousExerciseDataDto
    } catch (err) {
        console.error('Failed to fetch previous exercise data:', err)
        return null
    }
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const day = date.getDate()
    const month = date.toLocaleDateString('ru-RU', { month: 'short' })
    return `${day} ${month}`
}

async function showWhatToBeatHints(exerciseName: string): Promise<void> {
    const container = document.getElementById('what-to-beat')
    if (!container) return

    const previousData = await fetchPreviousExerciseData(exerciseName)
    
    if (!previousData || !previousData.sets || previousData.sets.length === 0) {
        container.style.display = 'none'
        return
    }

    const lastSet = previousData.sets[0]
    const lastWeight = lastSet.weight || 0
    const lastReps = lastSet.repetitions || 0

    if (lastWeight === 0 && lastReps === 0) {
        container.style.display = 'none'
        return
    }

    const strengthSuggestion = {
        weight: lastWeight + 2.5,
        reps: Math.max(1, lastReps - 2)
    }

    const volumeSuggestion = {
        weight: lastWeight,
        reps: lastReps + 2
    }

    const dateStr = previousData.sessionDate ? `(${formatDate(previousData.sessionDate)})` : ''

    container.innerHTML = `
        <div class="what-to-beat-last" id="what-to-beat-last-tap">
            ПРОШЛЫЙ РАЗ: <span class="what-to-beat-value">${lastWeight}кг × ${lastReps}</span>
            <span class="what-to-beat-date">${dateStr}</span>
        </div>
        <div class="what-to-beat-hint">
            ПОБЕЙ ЭТО: <span class="what-to-beat-option">${strengthSuggestion.weight}кг×${strengthSuggestion.reps}</span> 
            или <span class="what-to-beat-option">${volumeSuggestion.weight}кг×${volumeSuggestion.reps}</span>
        </div>
    `

    const lastTap = document.getElementById('what-to-beat-last-tap')
    lastTap?.addEventListener('click', () => {
        const weightInput = document.getElementById('set-weight') as HTMLInputElement
        const repsInput = document.getElementById('set-reps') as HTMLInputElement
        weightInput.value = String(lastWeight)
        repsInput.value = String(lastReps)
        
        if ('vibrate' in navigator) {
            navigator.vibrate(20)
        }
    })

    container.style.display = 'block'
}

async function showAlmostPRWarning(exerciseName: string, currentWeight: number): Promise<void> {
    const container = document.getElementById('almost-pr')
    if (!container) return

    const pr = await fetchExercisePRs(exerciseName)
    
    if (!pr || !pr.bestWeight || currentWeight === 0) {
        container.style.display = 'none'
        return
    }

    const prThreshold = pr.bestWeight * 0.95

    if (currentWeight >= prThreshold && currentWeight < pr.bestWeight) {
        const diff = (pr.bestWeight - currentWeight).toFixed(1)
        container.innerHTML = `⚡ ПОЧТИ РЕКОРД! Текущий PR: ${pr.bestWeight}кг. До рекорда всего ${diff}кг!`
        container.style.display = 'block'
    } else {
        container.style.display = 'none'
    }
}

export async function openQuickSetLogger(
    sessionId: string,
    setId: string,
    exerciseName: string,
    setData: Partial<WorkoutSessionSetDto>,
    onComplete?: () => void
): Promise<void> {
    currentSessionId = sessionId
    currentSetId = setId
    currentExerciseName = exerciseName
    onCompleteCallback = onComplete || null

    const modal = document.getElementById('quick-set-logger-modal')!
    const backdrop = document.getElementById('quick-set-logger-backdrop')!
    const titleEl = document.getElementById('quick-set-logger-title')!
    const subtitleEl = document.getElementById('quick-set-logger-subtitle')!
    const weightInput = document.getElementById('set-weight') as HTMLInputElement
    const repsInput = document.getElementById('set-reps') as HTMLInputElement

    titleEl.textContent = `ПОДХОД ${(setData.orderIndex || 0) + 1}`
    subtitleEl.textContent = exerciseName

    const plannedWeight = setData.plannedWeight || setData.previousWeight || 0
    const plannedReps = setData.plannedRepetitions || setData.previousReps || 0

    weightInput.value = String(plannedWeight || '')
    repsInput.value = String(plannedReps || '')

    const defaultRpe = setData.rpe || 7
    selectRpe(defaultRpe)

    await showWhatToBeatHints(exerciseName)
    await showAlmostPRWarning(exerciseName, plannedWeight)

    modal.classList.add('active')
    backdrop.classList.add('visible')
    document.body.classList.add('modal-open')

    setTimeout(() => {
        weightInput.focus()
        weightInput.select()
    }, 300)
}

export function closeQuickSetLogger(): void {
    const modal = document.getElementById('quick-set-logger-modal')!
    const backdrop = document.getElementById('quick-set-logger-backdrop')!
    
    modal.classList.remove('active')
    backdrop.classList.remove('visible')
    document.body.classList.remove('modal-open')

    const whatToBeat = document.getElementById('what-to-beat')
    const almostPR = document.getElementById('almost-pr')
    if (whatToBeat) whatToBeat.style.display = 'none'
    if (almostPR) almostPR.style.display = 'none'

    currentSetId = null
    currentSessionId = null
    currentExerciseName = null
    onCompleteCallback = null
}

async function saveSet(): Promise<void> {
    if (!currentSetId || !currentSessionId || !currentExerciseName) return

    const weightInput = document.getElementById('set-weight') as HTMLInputElement
    const repsInput = document.getElementById('set-reps') as HTMLInputElement
    const selectedRpe = document.querySelector('.quick-set-logger-rpe-option.selected')

    const weight = parseFloat(weightInput.value)
    const reps = parseInt(repsInput.value)
    const rpe = selectedRpe ? parseInt(selectedRpe.textContent || '7') : undefined

    if (!weight && !reps) {
        toast.warning('Введите вес или повторения')
        return
    }

    const saveBtn = document.getElementById('quick-set-logger-save') as HTMLButtonElement
    saveBtn.disabled = true
    saveBtn.textContent = 'СОХРАНЕНИЕ...'

    const savedSessionId = currentSessionId!
    const savedExerciseName = currentExerciseName!
    const savedCallback = onCompleteCallback

    try {
        const result = await workoutSessionsApi.completeSet(savedSessionId, currentSetId, {
            weight,
            weightKg: weight,
            repetitions: reps,
            rpe
        }) as CompleteSetResultDto

        const setDto = result.set

        if (state.activeWorkoutSession) {
            const exercise = state.activeWorkoutSession.exercises.find(ex =>
                ex.sets.some(s => s.id === currentSetId)
            )
            if (exercise) {
                const setIndex = exercise.sets.findIndex(s => s.id === currentSetId)
                if (setIndex !== -1) {
                    exercise.sets[setIndex] = setDto
                }
            }
        }

        if (result.isNewPR && result.newPRs.length > 0) {
            showPRCelebration(result.newPRs, savedExerciseName)
        }

        const comparisonIcon = setDto.comparison === 'Better' ? '🟢' :
                              setDto.comparison === 'Same' ? '🟡' :
                              setDto.comparison === 'Worse' ? '🔴' : ''

        const toastEl = toast.success(`${comparisonIcon} Подход: ${weight}кг × ${reps}`, 5000)
        
        const undoBtn = document.createElement('button')
        undoBtn.textContent = 'ОТМЕНИТЬ'
        undoBtn.className = 'toast-undo-btn'
        undoBtn.style.cssText = 'margin-left: 12px; padding: 4px 12px; background: var(--bg-void-black); border: 1px solid var(--border); border-radius: 2px; cursor: pointer;'
        undoBtn.onclick = async () => {
            try {
                await workoutSessionsApi.undoSet(savedSessionId)
                toast.info('Подход отменён')
                if (savedCallback) savedCallback()
            } catch (err) {
                toast.error('Ошибка отмены')
            }
        }
        
        const toastContent = toastEl.querySelector('.toast-content')
        if (toastContent) {
            toastContent.appendChild(undoBtn)
        }

        closeQuickSetLogger()
        startRestTimer(90)

        if (savedCallback) {
            savedCallback()
        }

        if ('vibrate' in navigator) {
            navigator.vibrate([50, 30, 50])
        }
    } catch (err) {
        console.error('Failed to save set:', err)
        toast.error('Ошибка сохранения подхода')
        saveBtn.disabled = false
        saveBtn.textContent = '✓ ЗАВЕРШИТЬ ПОДХОД'
    }
}
