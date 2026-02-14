import { workoutSessionsApi } from '../api.js'
import { state } from '../state.js'
import { toast } from './toast.js'
import { startRestTimer } from './restTimer.js'
import type { WorkoutSessionSetDto } from '../types/workouts.js'

let currentSetId: string | null = null
let currentSessionId: string | null = null
let currentExerciseName: string | null = null
let onCompleteCallback: (() => void) | null = null

export function initQuickSetLogger(): void {
    const container = document.getElementById('quick-set-logger-container')
    if (!container) return

    container.innerHTML = `
        <div class="quick-set-logger-modal" id="quick-set-logger-modal">
            <div class="quick-set-logger-header">
                <div class="quick-set-logger-title" id="quick-set-logger-title">ПОДХОД</div>
                <div class="quick-set-logger-subtitle" id="quick-set-logger-subtitle"></div>
            </div>

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

export function openQuickSetLogger(
    sessionId: string,
    setId: string,
    exerciseName: string,
    setData: Partial<WorkoutSessionSetDto>,
    onComplete?: () => void
): void {
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

    weightInput.value = String(setData.plannedWeight || setData.previousWeight || '')
    repsInput.value = String(setData.plannedRepetitions || setData.previousReps || '')

    const defaultRpe = setData.rpe || 7
    selectRpe(defaultRpe)

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

    currentSetId = null
    currentSessionId = null
    currentExerciseName = null
    onCompleteCallback = null
}

async function saveSet(): Promise<void> {
    if (!currentSetId || !currentSessionId) return

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
    const savedCallback = onCompleteCallback

    try {
        const setDto = await workoutSessionsApi.completeSet(savedSessionId, currentSetId, {
            weight,
            weightKg: weight,
            repetitions: reps,
            rpe
        }) as WorkoutSessionSetDto

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
