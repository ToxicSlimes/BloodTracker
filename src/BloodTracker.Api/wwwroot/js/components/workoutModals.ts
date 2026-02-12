import { workoutsApi } from '../api.js'
import { api } from '../api.js'
import { ENDPOINTS } from '../endpoints.js'
import { state } from '../state.js'
import { toast } from './toast.js'

/** @type {string|null} ID редактируемой программы */
let editingProgramId: string | null = null
let editingDayId: string | null = null
let editingExerciseId: string | null = null
let editingSetId: string | null = null
let currentProgramId: string | null = null
let currentDayId: string | null = null
let currentExerciseId: string | null = null
/** @type {Array} Полный каталог упражнений с API */
let exerciseCatalog: any[] = []
/** @type {Array} Отфильтрованный каталог для отображения */
let exerciseCatalogFiltered: any[] = []
/** @type {boolean} Флаг загрузки каталога упражнений */
let exerciseCatalogLoaded: boolean = false

/**
 * Открывает модалку создания/редактирования тренировочной программы.
 * @param {string|null} [programId=null] — ID программы для редактирования
 */
;(window as any).openWorkoutProgramModal = (programId: string | null = null): void => {
    editingProgramId = programId
    const modal = document.getElementById('workout-program-modal')!
    const title = document.getElementById('workout-program-modal-title')!
    const titleInput = document.getElementById('workout-program-title') as HTMLInputElement
    const notesInput = document.getElementById('workout-program-notes') as HTMLTextAreaElement

    if (programId) {
        const program = (state as any).workoutPrograms.find((p: any) => p.id === programId)
        if (program) {
            title.textContent = '[ РЕДАКТИРОВАТЬ ПРОГРАММУ ]'
            titleInput.value = program.title || ''
            notesInput.value = program.notes || ''
        }
    } else {
        title.textContent = '[ СОЗДАТЬ ПРОГРАММУ ]'
        titleInput.value = ''
        notesInput.value = ''
    }

    modal.classList.add('active')
    document.body.classList.add('modal-open')
}

/** Закрывает модалку тренировочной программы. */
;(window as any).closeWorkoutProgramModal = (): void => {
    document.getElementById('workout-program-modal')!.classList.remove('active')
    document.body.classList.remove('modal-open')
    editingProgramId = null
}

/**
 * Сохраняет тренировочную программу (создание/обновление).
 * Валидирует название, отправляет запрос, перерендеривает список.
 */
;(window as any).saveWorkoutProgram = async (): Promise<void> => {
    const title = (document.getElementById('workout-program-title') as HTMLInputElement).value.trim()
    if (!title) {
        toast.warning('Введите название программы')
        return
    }

    const data = {
        title,
        notes: (document.getElementById('workout-program-notes') as HTMLTextAreaElement).value.trim() || null
    }

    try {
        if (editingProgramId) {
            await workoutsApi.programs.update(editingProgramId, data)
            const index = (state as any).workoutPrograms.findIndex((p: any) => p.id === editingProgramId)
            if (index !== -1) {
                (state as any).workoutPrograms[index] = { ...(state as any).workoutPrograms[index], ...data }
            }
        } else {
            const created = await workoutsApi.programs.create(data)
            ;(state as any).workoutPrograms.push(created)
        }
        ;(window as any).closeWorkoutProgramModal()
        if (typeof (window as any).renderWorkouts === 'function') {
            await (window as any).renderWorkouts()
        } else {
            const { loadWorkouts } = await import('../pages/workouts.js')
            await loadWorkouts()
        }
    } catch (e) {
        console.error('Failed to save workout program:', e)
        toast.error('Ошибка сохранения программы')
    }
}

/**
 * Открывает модалку создания/редактирования дня тренировки.
 * @param {string} programId — ID программы
 * @param {string|null} [dayId=null] — ID дня для редактирования
 */
;(window as any).openWorkoutDayModal = (programId: string, dayId: string | null = null): void => {
    editingDayId = dayId
    currentProgramId = programId
    const modal = document.getElementById('workout-day-modal')!
    const title = document.getElementById('workout-day-modal-title')!
    const dayOfWeekSelect = document.getElementById('workout-day-dayofweek') as HTMLSelectElement
    const titleInput = document.getElementById('workout-day-title') as HTMLInputElement
    const notesInput = document.getElementById('workout-day-notes') as HTMLTextAreaElement

    if (dayId) {
        const day = (state as any).workoutDays[programId]?.find((d: any) => d.id === dayId)
        if (day) {
            title.textContent = '[ РЕДАКТИРОВАТЬ ДЕНЬ ]'
            dayOfWeekSelect.value = day.dayOfWeek
            titleInput.value = day.title || ''
            notesInput.value = day.notes || ''
        }
    } else {
        title.textContent = '[ СОЗДАТЬ ДЕНЬ ]'
        dayOfWeekSelect.value = '0'
        titleInput.value = ''
        notesInput.value = ''
    }

    modal.classList.add('active')
    document.body.classList.add('modal-open')
}

/** Закрывает модалку дня тренировки. */
;(window as any).closeWorkoutDayModal = (): void => {
    document.getElementById('workout-day-modal')!.classList.remove('active')
    document.body.classList.remove('modal-open')
    editingDayId = null
    currentProgramId = null
}

/**
 * Сохраняет день тренировки (создание/обновление).
 * Валидирует программу, отправляет запрос, перерендеривает список.
 */
;(window as any).saveWorkoutDay = async (): Promise<void> => {
    if (!currentProgramId) {
        toast.error('Ошибка: не указана программа')
        return
    }

    const data = {
        programId: currentProgramId,
        dayOfWeek: parseInt((document.getElementById('workout-day-dayofweek') as HTMLSelectElement).value),
        title: (document.getElementById('workout-day-title') as HTMLInputElement).value.trim() || null,
        notes: (document.getElementById('workout-day-notes') as HTMLTextAreaElement).value.trim() || null
    }

    try {
        if (editingDayId) {
            await workoutsApi.days.update(editingDayId, data)
            const days = (state as any).workoutDays[currentProgramId] || []
            const index = days.findIndex((d: any) => d.id === editingDayId)
            if (index !== -1) {
                days[index] = { ...days[index], ...data }
            }
        } else {
            const created = await workoutsApi.days.create(data)
            if (!(state as any).workoutDays[currentProgramId]) {
                (state as any).workoutDays[currentProgramId] = []
            }
            ;(state as any).workoutDays[currentProgramId].push(created)
        }
        ;(window as any).closeWorkoutDayModal()
        if (typeof (window as any).renderWorkouts === 'function') {
            await (window as any).renderWorkouts()
        } else {
            const { loadWorkouts } = await import('../pages/workouts.js')
            await loadWorkouts()
        }
    } catch (e) {
        console.error('Failed to save workout day:', e)
        toast.error('Ошибка сохранения дня')
    }
}

/**
 * Загружает каталог упражнений из API. Кеширует результат.
 * При ошибке показывает сообщение с диагностикой.
 * @param {boolean} [force=false] — принудительная перезагрузка
 * @returns {Promise<void>}
 */
async function loadExerciseCatalog(force: boolean = false): Promise<void> {
    if (exerciseCatalogLoaded && !force && exerciseCatalog.length > 0) {
        return
    }

    try {
        exerciseCatalog = await api(ENDPOINTS.exerciseCatalog.list)
        exerciseCatalogFiltered = exerciseCatalog
        exerciseCatalogLoaded = true
        
        if (exerciseCatalog.length === 0) {
            const container = document.getElementById('exercise-catalog-list')
            if (container) {
                container.innerHTML = `
                    <div style="padding: 16px; text-align: center; color: var(--text-secondary);">
                        <div style="margin-bottom: 8px;">⚠️ Каталог упражнений пуст</div>
                        <div style="font-size: 12px; margin-top: 8px; line-height: 1.5;">
                            Возможные причины:<br>
                            • API ключ RapidAPI не настроен<br>
                            • Превышен лимит запросов к API<br>
                            • Проблемы с подключением<br><br>
                            Вы можете добавить упражнение вручную ниже
                        </div>
                    </div>
                `
            }
        } else {
            renderExerciseCatalog()
        }
    } catch (e: any) {
        console.error('Failed to load exercise catalog:', e)
        exerciseCatalogLoaded = false
        const container = document.getElementById('exercise-catalog-list')
        if (container) {
            container.innerHTML = `
                <div style="padding: 16px; text-align: center; color: var(--text-warning, #ffaa00);">
                    <div style="margin-bottom: 8px;">❌ Ошибка загрузки каталога</div>
                    <div style="font-size: 12px; margin-top: 8px; line-height: 1.5;">
                        ${e.message || 'Проверьте настройки API или подключение к интернету'}<br><br>
                        Вы можете добавить упражнение вручную ниже
                    </div>
                </div>
            `
        }
    }
}

/**
 * Рендерит отфильтрованный каталог упражнений в DOM-контейнер.
 * Показывает максимум 30 элементов с информацией о bodyPart/target/equipment.
 */
function renderExerciseCatalog(): void {
    const container = document.getElementById('exercise-catalog-list')
    if (!container) return

    if (exerciseCatalogFiltered.length === 0) {
        container.innerHTML = `
            <div style="padding: 16px; text-align: center; color: var(--text-secondary);">
                <div>Не найдено упражнений</div>
                <div style="font-size: 12px; margin-top: 8px;">
                    Попробуйте изменить поисковый запрос или фильтр
                </div>
            </div>
        `
        return
    }

    const itemsToShow = exerciseCatalogFiltered.slice(0, 30)
    container.innerHTML = itemsToShow.map((ex: any) => `
        <div class="exercise-catalog-item" 
             data-ex-id="${ex.id}"
             onclick="window.selectExerciseFromCatalog('${ex.id}')"
             style="padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s;"
             onmouseover="this.style.background='var(--bg-secondary, rgba(255,255,255,0.05))'"
             onmouseout="this.style.background='transparent'">
            <div style="font-weight: bold; margin-bottom: 4px;">${ex.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">
                ${[ex.bodyPart, ex.target, ex.equipment].filter(Boolean).join(' • ') || 'Без категории'}
            </div>
        </div>
    `).join('')
    
    if (exerciseCatalogFiltered.length > 30) {
        container.innerHTML += `
            <div style="padding: 8px; text-align: center; color: var(--text-secondary); font-size: 12px;">
                Показано 30 из ${exerciseCatalogFiltered.length} упражнений
            </div>
        `
    }
}

/**
 * Выбирает упражнение из каталога — заполняет поля формы.
 * @param {string} exerciseId — ID упражнения из каталога
 */
;(window as any).selectExerciseFromCatalog = (exerciseId: string): void => {
    const exercise = exerciseCatalogFiltered.find((e: any) => e.id === exerciseId)
    if (!exercise) return

    ;(document.getElementById('workout-exercise-name') as HTMLInputElement).value = exercise.name
    ;(document.getElementById('workout-exercise-musclegroup') as HTMLSelectElement).value = exercise.muscleGroup || '0'
    if (exercise.equipment) {
        const notes = document.getElementById('workout-exercise-notes') as HTMLTextAreaElement
        notes.value = `Оборудование: ${exercise.equipment}${notes.value ? '\n' + notes.value : ''}`
    }
}

/**
 * Открывает модалку создания/редактирования упражнения.
 * Загружает каталог упражнений, настраивает поиск и фильтрацию.
 * @param {string} dayId — ID дня тренировки
 * @param {string|null} [exerciseId=null] — ID упражнения для редактирования
 */
;(window as any).openWorkoutExerciseModal = async (dayId: string, exerciseId: string | null = null): Promise<void> => {
    editingExerciseId = exerciseId
    currentDayId = dayId
    const modal = document.getElementById('workout-exercise-modal')!
    const title = document.getElementById('workout-exercise-modal-title')!
    const nameInput = document.getElementById('workout-exercise-name') as HTMLInputElement
    const muscleGroupSelect = document.getElementById('workout-exercise-musclegroup') as HTMLSelectElement
    const notesInput = document.getElementById('workout-exercise-notes') as HTMLTextAreaElement

    const searchInput = document.getElementById('exercise-catalog-search') as HTMLInputElement
    const filterSelect = document.getElementById('exercise-catalog-filter') as HTMLSelectElement
    
    searchInput.value = ''
    filterSelect.value = ''
    exerciseCatalogFiltered = exerciseCatalog

    if (!exerciseCatalogLoaded || exerciseCatalog.length === 0) {
        await loadExerciseCatalog()
    } else {
        exerciseCatalogFiltered = exerciseCatalog
        renderExerciseCatalog()
    }

    searchInput.oninput = () => {
        const search = searchInput.value.toLowerCase().trim()
        const filter = filterSelect.value
        exerciseCatalogFiltered = exerciseCatalog.filter((ex: any) => {
            const matchesSearch = !search || 
                ex.name.toLowerCase().includes(search) ||
                (ex.bodyPart && ex.bodyPart.toLowerCase().includes(search)) ||
                (ex.target && ex.target.toLowerCase().includes(search)) ||
                (ex.equipment && ex.equipment.toLowerCase().includes(search))
            const matchesFilter = !filter || ex.muscleGroup === parseInt(filter)
            return matchesSearch && matchesFilter
        })
        renderExerciseCatalog()
    }

    filterSelect.onchange = () => {
        searchInput.dispatchEvent(new Event('input'))
    }

    if (exerciseId) {
        const exercise = (state as any).workoutExercises[dayId]?.find((e: any) => e.id === exerciseId)
        if (exercise) {
            title.textContent = '[ РЕДАКТИРОВАТЬ УПРАЖНЕНИЕ ]'
            nameInput.value = exercise.name || ''
            muscleGroupSelect.value = exercise.muscleGroup || '0'
            notesInput.value = exercise.notes || ''
        }
    } else {
        title.textContent = '[ СОЗДАТЬ УПРАЖНЕНИЕ ]'
        nameInput.value = ''
        muscleGroupSelect.value = '0'
        notesInput.value = ''
    }

    modal.classList.add('active')
    document.body.classList.add('modal-open')
}

/** Закрывает модалку упражнения и сбрасывает фильтры. */
;(window as any).closeWorkoutExerciseModal = (): void => {
    document.getElementById('workout-exercise-modal')!.classList.remove('active')
    document.body.classList.remove('modal-open')
    editingExerciseId = null
    currentDayId = null
    ;(document.getElementById('exercise-catalog-search') as HTMLInputElement).value = ''
    ;(document.getElementById('exercise-catalog-filter') as HTMLSelectElement).value = ''
}

/**
 * Сохраняет упражнение (создание/обновление).
 * Валидирует название и программу, отправляет запрос.
 */
;(window as any).saveWorkoutExercise = async (): Promise<void> => {
    if (!currentDayId) {
        toast.error('Ошибка: не указан день')
        return
    }

    const name = (document.getElementById('workout-exercise-name') as HTMLInputElement).value.trim()
    if (!name) {
        toast.warning('Введите название упражнения')
        return
    }

    const programId = (state as any).selectedProgramId
    if (!programId) {
        toast.error('Ошибка: не выбрана программа')
        return
    }

    const data = {
        programId,
        dayId: currentDayId,
        name,
        muscleGroup: parseInt((document.getElementById('workout-exercise-musclegroup') as HTMLSelectElement).value),
        notes: (document.getElementById('workout-exercise-notes') as HTMLTextAreaElement).value.trim() || null
    }

    try {
        if (editingExerciseId) {
            await workoutsApi.exercises.update(editingExerciseId, data)
            const exercises = (state as any).workoutExercises[currentDayId] || []
            const index = exercises.findIndex((e: any) => e.id === editingExerciseId)
            if (index !== -1) {
                exercises[index] = { ...exercises[index], ...data }
            }
        } else {
            const created = await workoutsApi.exercises.create(data)
            if (!(state as any).workoutExercises[currentDayId]) {
                (state as any).workoutExercises[currentDayId] = []
            }
            ;(state as any).workoutExercises[currentDayId].push(created)
        }
        ;(window as any).closeWorkoutExerciseModal()
        if (typeof (window as any).renderWorkouts === 'function') {
            await (window as any).renderWorkouts()
        } else {
            const { loadWorkouts } = await import('../pages/workouts.js')
            await loadWorkouts()
        }
    } catch (e) {
        console.error('Failed to save workout exercise:', e)
        toast.error('Ошибка сохранения упражнения')
    }
}

/**
 * Открывает модалку создания/редактирования подхода.
 * @param {string} exerciseId — ID упражнения
 * @param {string|null} [setId=null] — ID подхода для редактирования
 */
;(window as any).openWorkoutSetModal = (exerciseId: string, setId: string | null = null): void => {
    editingSetId = setId
    currentExerciseId = exerciseId
    const modal = document.getElementById('workout-set-modal')!
    const title = document.getElementById('workout-set-modal-title')!
    const repetitionsInput = document.getElementById('workout-set-repetitions') as HTMLInputElement
    const weightInput = document.getElementById('workout-set-weight') as HTMLInputElement
    const durationInput = document.getElementById('workout-set-duration') as HTMLInputElement
    const notesInput = document.getElementById('workout-set-notes') as HTMLTextAreaElement

    if (setId) {
        const set = (state as any).workoutSets[exerciseId]?.find((s: any) => s.id === setId)
        if (set) {
            title.textContent = '[ РЕДАКТИРОВАТЬ ПОДХОД ]'
            repetitionsInput.value = set.repetitions || ''
            weightInput.value = set.weight || ''
            if (set.duration) {
                if (typeof set.duration === 'string') {
                    const parts = set.duration.split(':')
                    if (parts.length === 3) {
                        durationInput.value = `${parts[0]}:${parts[1]}:${parts[2]}`
                    } else {
                        durationInput.value = set.duration
                    }
                } else {
                    durationInput.value = ''
                }
            } else {
                durationInput.value = ''
            }
            notesInput.value = set.notes || ''
        }
    } else {
        title.textContent = '[ СОЗДАТЬ ПОДХОД ]'
        repetitionsInput.value = ''
        weightInput.value = ''
        durationInput.value = ''
        notesInput.value = ''
    }

    modal.classList.add('active')
    document.body.classList.add('modal-open')
}

/** Закрывает модалку подхода. */
;(window as any).closeWorkoutSetModal = (): void => {
    document.getElementById('workout-set-modal')!.classList.remove('active')
    document.body.classList.remove('modal-open')
    editingSetId = null
    currentExerciseId = null
}

/**
 * Сохраняет подход (создание/обновление).
 * Парсит duration из формата HH:MM:SS или MM:SS.
 */
;(window as any).saveWorkoutSet = async (): Promise<void> => {
    if (!currentExerciseId) {
        toast.error('Ошибка: не указано упражнение')
        return
    }

    const repetitions = (document.getElementById('workout-set-repetitions') as HTMLInputElement).value
    const weight = (document.getElementById('workout-set-weight') as HTMLInputElement).value
    const durationStr = (document.getElementById('workout-set-duration') as HTMLInputElement).value.trim()
    const notes = (document.getElementById('workout-set-notes') as HTMLTextAreaElement).value.trim() || null

    let duration: string | null = null
    if (durationStr) {
        const parts = durationStr.split(':').map(p => parseInt(p) || 0)
        if (parts.length === 3) {
            const hours = parts[0]
            const minutes = parts[1]
            const seconds = parts[2]
            duration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        } else if (parts.length === 2) {
            const minutes = parts[0]
            const seconds = parts[1]
            duration = `00:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        }
    }

    const data = {
        exerciseId: currentExerciseId,
        repetitions: repetitions ? parseInt(repetitions) : null,
        weight: weight ? parseFloat(weight) : null,
        duration: duration,
        notes
    }

    try {
        if (editingSetId) {
            await workoutsApi.sets.update(editingSetId, data)
            const sets = (state as any).workoutSets[currentExerciseId] || []
            const index = sets.findIndex((s: any) => s.id === editingSetId)
            if (index !== -1) {
                sets[index] = { ...sets[index], ...data }
            }
        } else {
            const created = await workoutsApi.sets.create(data)
            if (!(state as any).workoutSets[currentExerciseId]) {
                (state as any).workoutSets[currentExerciseId] = []
            }
            ;(state as any).workoutSets[currentExerciseId].push(created)
        }
        ;(window as any).closeWorkoutSetModal()
        if (typeof (window as any).renderWorkouts === 'function') {
            await (window as any).renderWorkouts()
        } else {
            const { loadWorkouts } = await import('../pages/workouts.js')
            await loadWorkouts()
        }
    } catch (e) {
        console.error('Failed to save workout set:', e)
        toast.error('Ошибка сохранения подхода')
    }
}

document.addEventListener('click', (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
        (e.target as HTMLElement).classList.remove('active')
        document.body.classList.remove('modal-open')
    }
})
