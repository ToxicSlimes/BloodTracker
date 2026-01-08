import { workoutsApi } from '../api.js'
import { api } from '../api.js'
import { state } from '../state.js'

let editingProgramId = null
let editingDayId = null
let editingExerciseId = null
let editingSetId = null
let currentProgramId = null
let currentDayId = null
let currentExerciseId = null
let exerciseCatalog = []
let exerciseCatalogFiltered = []
let exerciseCatalogLoaded = false

window.openWorkoutProgramModal = (programId = null) => {
    editingProgramId = programId
    const modal = document.getElementById('workout-program-modal')
    const title = document.getElementById('workout-program-modal-title')
    const titleInput = document.getElementById('workout-program-title')
    const notesInput = document.getElementById('workout-program-notes')

    if (programId) {
        const program = state.workoutPrograms.find(p => p.id === programId)
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

    modal.style.display = 'flex'
}

window.closeWorkoutProgramModal = () => {
    document.getElementById('workout-program-modal').style.display = 'none'
    editingProgramId = null
}

window.saveWorkoutProgram = async () => {
    const title = document.getElementById('workout-program-title').value.trim()
    if (!title) {
        alert('Введите название программы')
        return
    }

    const data = {
        title,
        notes: document.getElementById('workout-program-notes').value.trim() || null
    }

    try {
        if (editingProgramId) {
            await workoutsApi.programs.update(editingProgramId, data)
            const index = state.workoutPrograms.findIndex(p => p.id === editingProgramId)
            if (index !== -1) {
                state.workoutPrograms[index] = { ...state.workoutPrograms[index], ...data }
            }
        } else {
            const created = await workoutsApi.programs.create(data)
            state.workoutPrograms.push(created)
        }
        window.closeWorkoutProgramModal()
        if (typeof window.renderWorkouts === 'function') {
            await window.renderWorkouts()
        } else {
            const { loadWorkouts } = await import('../pages/workouts.js')
            await loadWorkouts()
        }
    } catch (e) {
        console.error('Failed to save workout program:', e)
        alert('Ошибка сохранения программы')
    }
}

window.openWorkoutDayModal = (programId, dayId = null) => {
    editingDayId = dayId
    currentProgramId = programId
    const modal = document.getElementById('workout-day-modal')
    const title = document.getElementById('workout-day-modal-title')
    const dayOfWeekSelect = document.getElementById('workout-day-dayofweek')
    const titleInput = document.getElementById('workout-day-title')
    const notesInput = document.getElementById('workout-day-notes')

    if (dayId) {
        const day = state.workoutDays[programId]?.find(d => d.id === dayId)
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

    modal.style.display = 'flex'
}

window.closeWorkoutDayModal = () => {
    document.getElementById('workout-day-modal').style.display = 'none'
    editingDayId = null
    currentProgramId = null
}

window.saveWorkoutDay = async () => {
    if (!currentProgramId) {
        alert('Ошибка: не указана программа')
        return
    }

    const data = {
        programId: currentProgramId,
        dayOfWeek: parseInt(document.getElementById('workout-day-dayofweek').value),
        title: document.getElementById('workout-day-title').value.trim() || null,
        notes: document.getElementById('workout-day-notes').value.trim() || null
    }

    try {
        if (editingDayId) {
            await workoutsApi.days.update(editingDayId, data)
            const days = state.workoutDays[currentProgramId] || []
            const index = days.findIndex(d => d.id === editingDayId)
            if (index !== -1) {
                days[index] = { ...days[index], ...data }
            }
        } else {
            const created = await workoutsApi.days.create(data)
            if (!state.workoutDays[currentProgramId]) {
                state.workoutDays[currentProgramId] = []
            }
            state.workoutDays[currentProgramId].push(created)
        }
        window.closeWorkoutDayModal()
        if (typeof window.renderWorkouts === 'function') {
            await window.renderWorkouts()
        } else {
            const { loadWorkouts } = await import('../pages/workouts.js')
            await loadWorkouts()
        }
    } catch (e) {
        console.error('Failed to save workout day:', e)
        alert('Ошибка сохранения дня')
    }
}

async function loadExerciseCatalog(force = false) {
    if (exerciseCatalogLoaded && !force && exerciseCatalog.length > 0) {
        return
    }

    try {
        exerciseCatalog = await api('/exercisecatalog')
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
    } catch (e) {
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

function renderExerciseCatalog() {
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
    container.innerHTML = itemsToShow.map(ex => `
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

window.selectExerciseFromCatalog = (exerciseId) => {
    const exercise = exerciseCatalogFiltered.find(e => e.id === exerciseId)
    if (!exercise) return

    document.getElementById('workout-exercise-name').value = exercise.name
    document.getElementById('workout-exercise-musclegroup').value = exercise.muscleGroup || '0'
    if (exercise.equipment) {
        const notes = document.getElementById('workout-exercise-notes')
        notes.value = `Оборудование: ${exercise.equipment}${notes.value ? '\n' + notes.value : ''}`
    }
}

window.openWorkoutExerciseModal = async (dayId, exerciseId = null) => {
    editingExerciseId = exerciseId
    currentDayId = dayId
    const modal = document.getElementById('workout-exercise-modal')
    const title = document.getElementById('workout-exercise-modal-title')
    const nameInput = document.getElementById('workout-exercise-name')
    const muscleGroupSelect = document.getElementById('workout-exercise-musclegroup')
    const notesInput = document.getElementById('workout-exercise-notes')

    const searchInput = document.getElementById('exercise-catalog-search')
    const filterSelect = document.getElementById('exercise-catalog-filter')
    
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
        exerciseCatalogFiltered = exerciseCatalog.filter(ex => {
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
        const exercise = state.workoutExercises[dayId]?.find(e => e.id === exerciseId)
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

    modal.style.display = 'flex'
}

window.closeWorkoutExerciseModal = () => {
    document.getElementById('workout-exercise-modal').style.display = 'none'
    editingExerciseId = null
    currentDayId = null
    document.getElementById('exercise-catalog-search').value = ''
    document.getElementById('exercise-catalog-filter').value = ''
}

window.saveWorkoutExercise = async () => {
    if (!currentDayId) {
        alert('Ошибка: не указан день')
        return
    }

    const name = document.getElementById('workout-exercise-name').value.trim()
    if (!name) {
        alert('Введите название упражнения')
        return
    }

    const programId = state.selectedProgramId
    if (!programId) {
        alert('Ошибка: не выбрана программа')
        return
    }

    const data = {
        programId,
        dayId: currentDayId,
        name,
        muscleGroup: parseInt(document.getElementById('workout-exercise-musclegroup').value),
        notes: document.getElementById('workout-exercise-notes').value.trim() || null
    }

    try {
        if (editingExerciseId) {
            await workoutsApi.exercises.update(editingExerciseId, data)
            const exercises = state.workoutExercises[currentDayId] || []
            const index = exercises.findIndex(e => e.id === editingExerciseId)
            if (index !== -1) {
                exercises[index] = { ...exercises[index], ...data }
            }
        } else {
            const created = await workoutsApi.exercises.create(data)
            if (!state.workoutExercises[currentDayId]) {
                state.workoutExercises[currentDayId] = []
            }
            state.workoutExercises[currentDayId].push(created)
        }
        window.closeWorkoutExerciseModal()
        if (typeof window.renderWorkouts === 'function') {
            await window.renderWorkouts()
        } else {
            const { loadWorkouts } = await import('../pages/workouts.js')
            await loadWorkouts()
        }
    } catch (e) {
        console.error('Failed to save workout exercise:', e)
        alert('Ошибка сохранения упражнения')
    }
}

window.openWorkoutSetModal = (exerciseId, setId = null) => {
    editingSetId = setId
    currentExerciseId = exerciseId
    const modal = document.getElementById('workout-set-modal')
    const title = document.getElementById('workout-set-modal-title')
    const repetitionsInput = document.getElementById('workout-set-repetitions')
    const weightInput = document.getElementById('workout-set-weight')
    const durationInput = document.getElementById('workout-set-duration')
    const notesInput = document.getElementById('workout-set-notes')

    if (setId) {
        const set = state.workoutSets[exerciseId]?.find(s => s.id === setId)
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

    modal.style.display = 'flex'
}

window.closeWorkoutSetModal = () => {
    document.getElementById('workout-set-modal').style.display = 'none'
    editingSetId = null
    currentExerciseId = null
}

window.saveWorkoutSet = async () => {
    if (!currentExerciseId) {
        alert('Ошибка: не указано упражнение')
        return
    }

    const repetitions = document.getElementById('workout-set-repetitions').value
    const weight = document.getElementById('workout-set-weight').value
    const durationStr = document.getElementById('workout-set-duration').value.trim()
    const notes = document.getElementById('workout-set-notes').value.trim() || null

    let duration = null
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
            const sets = state.workoutSets[currentExerciseId] || []
            const index = sets.findIndex(s => s.id === editingSetId)
            if (index !== -1) {
                sets[index] = { ...sets[index], ...data }
            }
        } else {
            const created = await workoutsApi.sets.create(data)
            if (!state.workoutSets[currentExerciseId]) {
                state.workoutSets[currentExerciseId] = []
            }
            state.workoutSets[currentExerciseId].push(created)
        }
        window.closeWorkoutSetModal()
        if (typeof window.renderWorkouts === 'function') {
            await window.renderWorkouts()
        } else {
            const { loadWorkouts } = await import('../pages/workouts.js')
            await loadWorkouts()
        }
    } catch (e) {
        console.error('Failed to save workout set:', e)
        alert('Ошибка сохранения подхода')
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none'
    }
})

