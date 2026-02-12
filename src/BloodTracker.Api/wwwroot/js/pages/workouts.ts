import { renderMuscleAscii } from '../components/muscleAscii.js'
import { workoutsApi } from '../api.js'
import { state } from '../state.js'
import { toast } from '../components/toast.js'
import type { WorkoutProgramDto, WorkoutDayDto, WorkoutExerciseDto, WorkoutSetDto } from '../types/index.js'

/** Русские названия дней недели (0=Понедельник ... 6=Воскресенье) */
const dayNames: string[] = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

// Selection state is stored in state.selectedProgramId / state.selectedDayId / state.selectedExerciseId
// Reactive subscriptions in main.ts handle re-renders on change.

/**
 * Загружает список программ тренировок с сервера и рендерит всю иерархию.
 * Автоматически выбирает первую программу, если ничего не выбрано.
 * @returns {Promise<void>}
 */
export async function loadWorkouts(): Promise<void> {
    try {
        state.workoutPrograms = await workoutsApi.programs.list() as WorkoutProgramDto[]
        if (state.workoutPrograms.length > 0 && !state.selectedProgramId) {
            state.selectedProgramId = state.workoutPrograms[0].id
        }
        // Дальнейший рендер вызывается реактивно через subscribe('workoutPrograms', ...)
    } catch (e) {
        console.error('Failed to load workout programs:', e)
        renderError('Ошибка загрузки программ тренировок')
    }
}

/**
 * Загружает дни тренировок для указанной программы.
 * Сортирует по dayOfWeek, кэширует в state.workoutDays.
 * @param {string} programId — ID программы
 * @returns {Promise<Array<Object>>} массив дней
 */
async function loadWorkoutDays(programId: string): Promise<WorkoutDayDto[]> {
    try {
        const days = await workoutsApi.days.listByProgram(programId) as WorkoutDayDto[]
        state.workoutDays[programId] = days.sort((a: WorkoutDayDto, b: WorkoutDayDto) => a.dayOfWeek - b.dayOfWeek)
        return state.workoutDays[programId]
    } catch (e) {
        console.error('Failed to load workout days:', e)
        toast.error('Ошибка загрузки дней тренировок')
        return []
    }
}

/**
 * Загружает упражнения для указанного дня тренировки.
 * @param {string} dayId — ID дня
 * @returns {Promise<Array<Object>>} массив упражнений
 */
async function loadWorkoutExercises(dayId: string): Promise<WorkoutExerciseDto[]> {
    try {
        const exercises = await workoutsApi.exercises.listByDay(dayId) as WorkoutExerciseDto[]
        state.workoutExercises[dayId] = exercises
        return exercises
    } catch (e) {
        console.error('Failed to load workout exercises:', e)
        toast.error('Ошибка загрузки упражнений')
        return []
    }
}

/**
 * Загружает подходы (сеты) для указанного упражнения.
 * @param {string} exerciseId — ID упражнения
 * @returns {Promise<Array<Object>>} массив подходов
 */
async function loadWorkoutSets(exerciseId: string): Promise<WorkoutSetDto[]> {
    try {
        const sets = await workoutsApi.sets.listByExercise(exerciseId) as WorkoutSetDto[]
        state.workoutSets[exerciseId] = sets
        return sets
    } catch (e) {
        console.error('Failed to load workout sets:', e)
        toast.error('Ошибка загрузки подходов')
        return []
    }
}

/**
 * Рендерит всю иерархию тренировок: программы → дни → упражнения → подходы.
 * Вызывается каскадно при изменении выбора на любом уровне.
 * @returns {Promise<void>}
 */
export async function renderWorkouts(): Promise<void> {
    renderPrograms()
    if (state.selectedProgramId) {
        await renderDays(state.selectedProgramId)
        if (state.selectedDayId) {
            await renderExercises(state.selectedDayId)
            if (state.selectedExerciseId) {
                await renderSets(state.selectedExerciseId)
                updateAscii()
            }
        }
    }
}

/**
 * Рендерит карточки программ тренировок.
 * Активная программа подсвечивается. Клик по карточке — выбор программы.
 */
function renderPrograms(): void {
    const container = document.getElementById('workout-programs') as HTMLElement | null
    if (!container) return

    if (state.workoutPrograms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Нет программ тренировок</p>
                <button class="btn-primary" onclick="window.openWorkoutProgramModal()">Создать программу</button>
            </div>
        `
        return
    }

    // ── Карточка программы тренировок ──────────────────────────
    // [Название программы]
    // [Заметки]
    // Кнопки: [Редактировать] [Удалить]
    container.innerHTML = state.workoutPrograms.map((program: any) => `
        <div class="workout-program-card ${state.selectedProgramId === program.id ? 'active' : ''}" 
             data-program-id="${program.id}">
            <div class="workout-program-title">${program.title}</div>
            ${program.notes ? `<div class="workout-program-notes">${program.notes}</div>` : ''}
            <div class="workout-program-actions">
                <button class="btn-small" onclick="window.openWorkoutProgramModal('${program.id}')">Редактировать</button>
                <button class="btn-small btn-danger" onclick="window.deleteWorkoutProgram('${program.id}')">Удалить</button>
            </div>
        </div>
    `).join('')

    container.querySelectorAll('.workout-program-card').forEach((card: Element) => {
        card.addEventListener('click', (e: Event) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return
            const programId = (card as HTMLElement).dataset.programId!
            state.selectedProgramId = programId
            state.selectedDayId = null
            state.selectedExerciseId = null
        })
    })
}

/**
 * Рендерит карточки дней для выбранной программы.
 * Показывает день недели, название, кнопки дублирования/редактирования/удаления.
 * @param {string} programId — ID программы
 * @returns {Promise<void>}
 */
async function renderDays(programId: string): Promise<void> {
    const container = document.getElementById('workout-days') as HTMLElement | null
    if (!container) return

    const days = await loadWorkoutDays(programId)

    if (days.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Нет дней в программе</p>
                <button class="btn-small" onclick="window.openWorkoutDayModal('${programId}')">Добавить день</button>
            </div>
        `
        return
    }

    // ── Карточка дня тренировки ──────────────────────────
    // [День недели]
    // [Название дня]
    // Кнопки: [📋 Дублировать] [Редактировать] [Удалить]
    container.innerHTML = days.map((day: WorkoutDayDto) => `
        <div class="workout-day-card ${state.selectedDayId === day.id ? 'active' : ''}" 
             data-day-id="${day.id}">
            <div class="workout-day-name">${dayNames[day.dayOfWeek]}</div>
            ${day.title ? `<div class="workout-day-title">${day.title}</div>` : ''}
            <div class="workout-day-actions">
                <button class="btn-small" onclick="window.duplicateWorkoutDay('${programId}', '${day.id}')" title="Дублировать день">📋</button>
                <button class="btn-small" onclick="window.openWorkoutDayModal('${programId}', '${day.id}')">Редактировать</button>
                <button class="btn-small btn-danger" onclick="window.deleteWorkoutDay('${day.id}')">Удалить</button>
            </div>
        </div>
    `).join('')

    container.innerHTML += `
        <button class="btn-small btn-add" onclick="window.openWorkoutDayModal('${programId}')">+ Добавить день</button>
    `

    container.querySelectorAll('.workout-day-card').forEach((card: Element) => {
        card.addEventListener('click', (e: Event) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return
            const dayId = (card as HTMLElement).dataset.dayId!
            state.selectedDayId = dayId
            state.selectedExerciseId = null
        })
    })
}

/**
 * Рендерит карточки упражнений для выбранного дня.
 * Показывает название, группу мышц, кнопки действий.
 * @param {string} dayId — ID дня
 * @returns {Promise<void>}
 */
async function renderExercises(dayId: string): Promise<void> {
    const container = document.getElementById('workout-exercises') as HTMLElement | null
    if (!container) return

    const exercises = await loadWorkoutExercises(dayId)

    if (exercises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Нет упражнений</p>
                <button class="btn-small" onclick="window.openWorkoutExerciseModal('${dayId}')">Добавить упражнение</button>
            </div>
        `
        return
    }

    // ── Карточка упражнения ──────────────────────────
    // [Название упражнения]
    // [Группа мышц]
    // Кнопки: [📋 Дублировать] [Редактировать] [Удалить]
    container.innerHTML = exercises.map((exercise: WorkoutExerciseDto) => `
        <div class="workout-exercise-card ${state.selectedExerciseId === exercise.id ? 'active' : ''}" 
             data-exercise-id="${exercise.id}">
            <div class="workout-exercise-title">${exercise.name}</div>
            <div class="workout-exercise-muscle">Группа: ${getMuscleGroupName(exercise.muscleGroup)}</div>
            <div class="workout-exercise-actions">
                <button class="btn-small" onclick="window.duplicateWorkoutExercise('${dayId}', '${exercise.id}')" title="Дублировать упражнение">📋</button>
                <button class="btn-small" onclick="window.openWorkoutExerciseModal('${dayId}', '${exercise.id}')">Редактировать</button>
                <button class="btn-small btn-danger" onclick="window.deleteWorkoutExercise('${exercise.id}')">Удалить</button>
            </div>
        </div>
    `).join('')

    container.innerHTML += `
        <button class="btn-small btn-add" onclick="window.openWorkoutExerciseModal('${dayId}')">+ Добавить упражнение</button>
    `

    container.querySelectorAll('.workout-exercise-card').forEach((card: Element) => {
        card.addEventListener('click', async (e: Event) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return
            const exerciseId = (card as HTMLElement).dataset.exerciseId!
            state.selectedExerciseId = exerciseId
        })
    })
}

/**
 * Рендерит карточки подходов (сетов) для выбранного упражнения.
 * Показывает номер подхода, повторения, вес, длительность, заметки.
 * @param {string} exerciseId — ID упражнения
 * @returns {Promise<void>}
 */
async function renderSets(exerciseId: string): Promise<void> {
    const container = document.getElementById('workout-sets') as HTMLElement | null
    if (!container) return

    const sets = await loadWorkoutSets(exerciseId)

    if (sets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Нет подходов</p>
                <button class="btn-small" onclick="window.openWorkoutSetModal('${exerciseId}')">Добавить подход</button>
            </div>
        `
        return
    }

    // ── Карточка подхода ──────────────────────────
    // Header: [Подход N] | Кнопки: [📋] [Ред] [Удалить]
    // Details: [X повторений] [Y кг] [Z длительность]
    // [Заметки]
    container.innerHTML = sets.map((set: WorkoutSetDto, index: number) => `
        <div class="workout-set-card">
            <div class="workout-set-header">
                <span>Подход ${index + 1}</span>
                <div class="workout-set-actions">
                    <button class="btn-small" onclick="window.duplicateWorkoutSet('${exerciseId}', '${set.id}')" title="Дублировать подход">📋</button>
                    <button class="btn-small" onclick="window.openWorkoutSetModal('${exerciseId}', '${set.id}')">Редактировать</button>
                    <button class="btn-small btn-danger" onclick="window.deleteWorkoutSet('${set.id}')">Удалить</button>
                </div>
            </div>
            <div class="workout-set-details">
                ${set.repetitions ? `<span>${set.repetitions} повторений</span>` : ''}
                ${set.weight ? `<span>${set.weight} кг</span>` : ''}
                ${set.duration ? `<span>${formatDuration(set.duration)}</span>` : ''}
            </div>
            ${set.notes ? `<div class="workout-set-notes">${set.notes}</div>` : ''}
        </div>
    `).join('')

    container.innerHTML += `
        <button class="btn-small btn-add" onclick="window.openWorkoutSetModal('${exerciseId}')">+ Добавить подход</button>
    `
}

/**
 * Обновляет ASCII-арт визуализацию задействованной группы мышц.
 * Рендерит в контейнер #muscle-ascii и масштабирует.
 */
function updateAscii(): void {
    const asciiContainer = document.getElementById('muscle-ascii') as HTMLElement | null
    if (!asciiContainer || !state.selectedExerciseId) {
        if (asciiContainer) asciiContainer.innerHTML = ''
        return
    }

    const exercise = state.workoutExercises[state.selectedDayId!]?.find((e: any) => e.id === state.selectedExerciseId)
    
    if (exercise) {
        const rendered = renderMuscleAscii(exercise.muscleGroup)
        asciiContainer.innerHTML = rendered
        setTimeout(() => scaleAsciiArt(asciiContainer), 10)
    }
}

/**
 * Масштабирует ASCII-арт чтобы он вписывался в контейнер.
 * Уменьшает font-size пока содержимое не влезет (минимум 4px).
 * @param {HTMLElement} container — DOM-элемент контейнера
 */
function scaleAsciiArt(container: HTMLElement): void {
    if (!container) return
    
    const highlight = container.querySelector('.muscle-ascii-highlight') as HTMLElement | null
    if (!highlight) return
    
    const containerWidth = container.clientWidth - 32
    const containerHeight = container.clientHeight - 60
    
    if (containerWidth <= 0 || containerHeight <= 0) return
    
    let fontSize = 8
    let fits = false
    let attempts = 0
    const maxAttempts = 20
    
    while (!fits && attempts < maxAttempts && fontSize >= 4) {
        highlight.style.fontSize = `${fontSize}px`
        
        const artWidth = highlight.scrollWidth
        const artHeight = highlight.scrollHeight
        
        if (artWidth <= containerWidth && artHeight <= containerHeight) {
            fits = true
        } else {
            fontSize -= 0.5
            attempts++
        }
    }
    
    if (!fits && fontSize < 4) {
        highlight.style.fontSize = '4px'
    }
}

/**
 * Возвращает русское название группы мышц по числовому коду.
 * @param {number} muscleGroup — код группы мышц (0-11)
 * @returns {string} название группы
 */
function getMuscleGroupName(muscleGroup: number): string {
    const names: Record<number, string> = {
        0: 'Все тело',
        1: 'Грудь',
        2: 'Спина',
        3: 'Плечи',
        4: 'Бицепс',
        5: 'Трицепс',
        6: 'Предплечья',
        7: 'Пресс',
        8: 'Ягодицы',
        9: 'Квадрицепс',
        10: 'Бицепс бедра',
        11: 'Икры'
    }
    return names[muscleGroup] || 'Неизвестно'
}

/**
 * Форматирует длительность из строки "HH:MM:SS" в человекочитаемый формат.
 * @param {string} duration — строка длительности
 * @returns {string} отформатированная строка (напр. "2м 30с")
 */
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

/**
 * Рендерит сообщение об ошибке в контейнере программ.
 * @param {string} message — текст ошибки
 */
function renderError(message: string): void {
    const container = document.getElementById('workout-programs') as HTMLElement | null
    if (container) {
        container.innerHTML = `<div class="error-state">${message}</div>`
    }
}

/**
 * Обработчик удаления программы тренировок.
 * Показывает confirm, удаляет через API, обновляет UI.
 * @param {string} id — ID программы
 */
(window as any).deleteWorkoutProgram = async (id: string): Promise<void> => {
    if (!confirm('Удалить программу тренировок?')) return
    try {
        await workoutsApi.programs.remove(id)
        state.workoutPrograms = state.workoutPrograms.filter((p: any) => p.id !== id)
        if (state.selectedProgramId === id) {
            state.selectedProgramId = state.workoutPrograms.length > 0 ? state.workoutPrograms[0].id : null
        }
    } catch (e) {
        console.error('Failed to delete workout program:', e)
        toast.error('Ошибка удаления программы')
    }
}

/**
 * Обработчик удаления дня тренировки.
 * @param {string} id — ID дня
 */
(window as any).deleteWorkoutDay = async (id: string): Promise<void> => {
    if (!confirm('Удалить день тренировки?')) return
    try {
        await workoutsApi.days.remove(id)
        delete state.workoutDays[state.selectedProgramId!]
        if (state.selectedDayId === id) {
            state.selectedDayId = null
        }
    } catch (e) {
        console.error('Failed to delete workout day:', e)
        toast.error('Ошибка удаления дня')
    }
}

/**
 * Обработчик удаления упражнения.
 * @param {string} id — ID упражнения
 */
(window as any).deleteWorkoutExercise = async (id: string): Promise<void> => {
    if (!confirm('Удалить упражнение?')) return
    try {
        await workoutsApi.exercises.remove(id)
        delete state.workoutExercises[state.selectedDayId!]
        if (state.selectedExerciseId === id) {
            state.selectedExerciseId = null
        }
    } catch (e) {
        console.error('Failed to delete workout exercise:', e)
        toast.error('Ошибка удаления упражнения')
    }
}

/**
 * Обработчик удаления подхода (сета).
 * @param {string} id — ID подхода
 */
(window as any).deleteWorkoutSet = async (id: string): Promise<void> => {
    if (!confirm('Удалить подход?')) return
    try {
        await workoutsApi.sets.remove(id)
        delete state.workoutSets[state.selectedExerciseId!]
    } catch (e) {
        console.error('Failed to delete workout set:', e)
        toast.error('Ошибка удаления подхода')
    }
}

/**
 * Дублирует день тренировки в другие дни недели.
 * Показывает prompt с выбором дней, копирует все упражнения и подходы.
 * Существующие дни перезаписываются после подтверждения.
 * @param {string} programId — ID программы
 * @param {string} sourceDayId — ID исходного дня для копирования
 */
(window as any).duplicateWorkoutDay = async (programId: string, sourceDayId: string): Promise<void> => {
    const sourceDay = state.workoutDays[programId]?.find((d: any) => d.id === sourceDayId) as WorkoutDayDto | undefined
    if (!sourceDay) {
        toast.warning('День не найден')
        return
    }

    const existingDays = (state.workoutDays[programId] || []) as WorkoutDayDto[]
    const existingDayNumbers = existingDays.map((d: WorkoutDayDto) => d.dayOfWeek)
    
    const availableDays = dayNames.map((name: string, index: number) => {
        const exists = existingDayNumbers.includes(index)
        const isSource = index === sourceDay.dayOfWeek
        return { index, name, exists, isSource }
    }).filter(d => !d.isSource)

    let message = `В какие дни недели скопировать тренировку "${sourceDay.title || dayNames[sourceDay.dayOfWeek]}"?\n\n`
    message += 'Доступные дни:\n'
    availableDays.forEach(d => {
        message += `${d.index} - ${d.name}${d.exists ? ' (существует, будет перезаписан)' : ''}\n`
    })
    message += '\nВведите номера дней через запятую (например: 2,4 для Среда и Пятница):'
    
    const input = prompt(message, '2,4')
    if (input === null || !input.trim()) return
    
    const dayNumbers = input.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 6 && n !== sourceDay.dayOfWeek)
    
    if (dayNumbers.length === 0) {
        toast.warning('Неверный ввод. Введите номера дней через запятую (например: 2,4)')
        return
    }

    const daysToOverwrite = dayNumbers.filter(n => existingDayNumbers.includes(n))
    if (daysToOverwrite.length > 0) {
        const overwriteNames = daysToOverwrite.map(n => dayNames[n]).join(', ')
        if (!confirm(`Дни ${overwriteNames} уже существуют. Перезаписать их?`)) return
    }

    try {
        for (const dayOfWeek of dayNumbers) {
            const existingDay = state.workoutDays[programId]?.find((d: any) => d.dayOfWeek === dayOfWeek) as WorkoutDayDto | undefined
            if (existingDay) {
                const existingExercises = await loadWorkoutExercises(existingDay.id)
                for (const ex of existingExercises) {
                    const existingSets = await loadWorkoutSets(ex.id)
                    for (const set of existingSets) {
                        await workoutsApi.sets.remove(set.id)
                    }
                    await workoutsApi.exercises.remove(ex.id)
                }
                await workoutsApi.days.remove(existingDay.id)
            }

            const newDay = await workoutsApi.days.create({
                programId,
                dayOfWeek,
                title: sourceDay.title || null,
                notes: sourceDay.notes || null
            }) as WorkoutDayDto

            const sourceExercises = await loadWorkoutExercises(sourceDayId)
            
            for (const exercise of sourceExercises) {
                const newExercise = await workoutsApi.exercises.create({
                    programId,
                    dayId: newDay.id,
                    name: exercise.name,
                    muscleGroup: exercise.muscleGroup,
                    notes: exercise.notes || null
                }) as WorkoutExerciseDto

                const sourceSets = await loadWorkoutSets(exercise.id)
                
                for (const set of sourceSets) {
                    await workoutsApi.sets.create({
                        exerciseId: newExercise.id,
                        repetitions: set.repetitions,
                        weight: set.weight,
                        duration: set.duration,
                        notes: set.notes || null
                    })
                }
            }
        }

        delete state.workoutDays[programId]
        // Рендер вызывается реактивно через subscribe('workoutDays', ...)
        const copiedDays = dayNumbers.map(n => dayNames[n]).join(', ')
        toast.success(`Тренировка скопирована в: ${copiedDays}!`)
    } catch (e) {
        console.error('Failed to duplicate workout day:', e)
        toast.error('Ошибка копирования дня')
    }
}

/**
 * Дублирует упражнение в тот же день (со всеми подходами).
 * @param {string} dayId — ID дня
 * @param {string} exerciseId — ID упражнения для копирования
 */
(window as any).duplicateWorkoutExercise = async (dayId: string, exerciseId: string): Promise<void> => {
    const exercise = state.workoutExercises[dayId]?.find((e: any) => e.id === exerciseId) as WorkoutExerciseDto | undefined
    if (!exercise) {
        toast.warning('Упражнение не найдено')
        return
    }

    const programId = state.selectedProgramId
    if (!programId) {
        toast.error('Ошибка: не выбрана программа')
        return
    }

    try {
        const newExercise = await workoutsApi.exercises.create({
            programId,
            dayId,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            notes: exercise.notes || null
        }) as WorkoutExerciseDto

        const sourceSets = await loadWorkoutSets(exerciseId)
        
        for (const set of sourceSets) {
            await workoutsApi.sets.create({
                exerciseId: newExercise.id,
                repetitions: set.repetitions,
                weight: set.weight,
                duration: set.duration,
                notes: set.notes || null
            })
        }

        delete state.workoutExercises[dayId]
        // Рендер вызывается реактивно через subscribe('workoutExercises', ...)
    } catch (e) {
        console.error('Failed to duplicate workout exercise:', e)
        toast.error('Ошибка копирования упражнения')
    }
}

/**
 * Дублирует подход (сет) в том же упражнении.
 * @param {string} exerciseId — ID упражнения
 * @param {string} setId — ID подхода для копирования
 */
(window as any).duplicateWorkoutSet = async (exerciseId: string, setId: string): Promise<void> => {
    const set = state.workoutSets[exerciseId]?.find((s: any) => s.id === setId) as WorkoutSetDto | undefined
    if (!set) {
        toast.warning('Подход не найден')
        return
    }

    try {
        await workoutsApi.sets.create({
            exerciseId,
            repetitions: set.repetitions,
            weight: set.weight,
            duration: set.duration,
            notes: set.notes || null
        })

        delete state.workoutSets[exerciseId]
    } catch (e) {
        console.error('Failed to duplicate workout set:', e)
        toast.error('Ошибка копирования подхода')
    }
}

/**
 * Инициализирует модуль тренировок, если DOM-контейнер существует.
 * Вызывается из main.js после проверки авторизации.
 */
export function initWorkouts(): void {
    if (!document.getElementById('workouts')) return
    loadWorkouts()
}

// Initialization is called from main.js init() after auth check passes.
// Do NOT auto-init here — it would fire before auth and trigger 401 reload loops.
