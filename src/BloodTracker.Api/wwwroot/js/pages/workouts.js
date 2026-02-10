import { renderMuscleAscii } from '../components/muscleAscii.js'
import { workoutsApi } from '../api.js'
import { state } from '../state.js'
import { toast } from '../components/toast.js'

const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

let selectedProgramId = null
let selectedDayId = null
let selectedExerciseId = null

export async function loadWorkouts() {
    try {
        state.workoutPrograms = await workoutsApi.programs.list()
        if (state.workoutPrograms.length > 0 && !selectedProgramId) {
            selectedProgramId = state.workoutPrograms[0].id
            state.selectedProgramId = selectedProgramId
        }
        await renderWorkouts()
    } catch (e) {
        console.error('Failed to load workout programs:', e)
        renderError('Ошибка загрузки программ тренировок')
    }
}

async function loadWorkoutDays(programId) {
    try {
        const days = await workoutsApi.days.listByProgram(programId)
        state.workoutDays[programId] = days.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        return state.workoutDays[programId]
    } catch (e) {
        console.error('Failed to load workout days:', e)
        return []
    }
}

async function loadWorkoutExercises(dayId) {
    try {
        const exercises = await workoutsApi.exercises.listByDay(dayId)
        state.workoutExercises[dayId] = exercises
        return exercises
    } catch (e) {
        console.error('Failed to load workout exercises:', e)
        return []
    }
}

async function loadWorkoutSets(exerciseId) {
    try {
        const sets = await workoutsApi.sets.listByExercise(exerciseId)
        state.workoutSets[exerciseId] = sets
        return sets
    } catch (e) {
        console.error('Failed to load workout sets:', e)
        return []
    }
}

async function renderWorkouts() {
    renderPrograms()
    if (selectedProgramId) {
        await renderDays(selectedProgramId)
        if (selectedDayId) {
            await renderExercises(selectedDayId)
            if (selectedExerciseId) {
                await renderSets(selectedExerciseId)
                updateAscii()
            }
        }
    }
}

function renderPrograms() {
    const container = document.getElementById('workout-programs')
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

    container.innerHTML = state.workoutPrograms.map(program => `
        <div class="workout-program-card ${selectedProgramId === program.id ? 'active' : ''}" 
             data-program-id="${program.id}">
            <div class="workout-program-title">${program.title}</div>
            ${program.notes ? `<div class="workout-program-notes">${program.notes}</div>` : ''}
            <div class="workout-program-actions">
                <button class="btn-small" onclick="window.openWorkoutProgramModal('${program.id}')">Редактировать</button>
                <button class="btn-small btn-danger" onclick="window.deleteWorkoutProgram('${program.id}')">Удалить</button>
            </div>
        </div>
    `).join('')

    container.querySelectorAll('.workout-program-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return
            const programId = card.dataset.programId
            selectedProgramId = programId
            state.selectedProgramId = programId
            selectedDayId = null
            selectedExerciseId = null
            renderWorkouts()
        })
    })
}

async function renderDays(programId) {
    const container = document.getElementById('workout-days')
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

    container.innerHTML = days.map(day => `
        <div class="workout-day-card ${selectedDayId === day.id ? 'active' : ''}" 
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

    container.querySelectorAll('.workout-day-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return
            const dayId = card.dataset.dayId
            selectedDayId = dayId
            state.selectedDayId = dayId
            selectedExerciseId = null
            renderWorkouts()
        })
    })
}

async function renderExercises(dayId) {
    const container = document.getElementById('workout-exercises')
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

    container.innerHTML = exercises.map(exercise => `
        <div class="workout-exercise-card ${selectedExerciseId === exercise.id ? 'active' : ''}" 
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

    container.querySelectorAll('.workout-exercise-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            if (e.target.tagName === 'BUTTON') return
            const exerciseId = card.dataset.exerciseId
            selectedExerciseId = exerciseId
            state.selectedExerciseId = exerciseId
            await renderSets(exerciseId)
            updateAscii()
        })
    })
}

async function renderSets(exerciseId) {
    const container = document.getElementById('workout-sets')
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

    container.innerHTML = sets.map((set, index) => `
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

function updateAscii() {
    const asciiContainer = document.getElementById('muscle-ascii')
    if (!asciiContainer || !selectedExerciseId) {
        if (asciiContainer) asciiContainer.innerHTML = ''
        return
    }

    const exercise = state.workoutExercises[selectedDayId]?.find(e => e.id === selectedExerciseId)
    
    if (exercise) {
        const rendered = renderMuscleAscii(exercise.muscleGroup)
        asciiContainer.innerHTML = rendered
        setTimeout(() => scaleAsciiArt(asciiContainer), 10)
    }
}

function scaleAsciiArt(container) {
    if (!container) return
    
    const highlight = container.querySelector('.muscle-ascii-highlight')
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

function getMuscleGroupName(muscleGroup) {
    const names = {
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

function formatDuration(duration) {
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

function renderError(message) {
    const container = document.getElementById('workout-programs')
    if (container) {
        container.innerHTML = `<div class="error-state">${message}</div>`
    }
}

window.deleteWorkoutProgram = async (id) => {
    if (!confirm('Удалить программу тренировок?')) return
    try {
        await workoutsApi.programs.remove(id)
        state.workoutPrograms = state.workoutPrograms.filter(p => p.id !== id)
        if (selectedProgramId === id) {
            selectedProgramId = state.workoutPrograms.length > 0 ? state.workoutPrograms[0].id : null
            state.selectedProgramId = selectedProgramId
        }
        await renderWorkouts()
    } catch (e) {
        console.error('Failed to delete workout program:', e)
        toast.error('Ошибка удаления программы')
    }
}

window.deleteWorkoutDay = async (id) => {
    if (!confirm('Удалить день тренировки?')) return
    try {
        await workoutsApi.days.remove(id)
        delete state.workoutDays[selectedProgramId]
        if (selectedDayId === id) {
            selectedDayId = null
            state.selectedDayId = null
        }
        await renderWorkouts()
    } catch (e) {
        console.error('Failed to delete workout day:', e)
        toast.error('Ошибка удаления дня')
    }
}

window.deleteWorkoutExercise = async (id) => {
    if (!confirm('Удалить упражнение?')) return
    try {
        await workoutsApi.exercises.remove(id)
        delete state.workoutExercises[selectedDayId]
        if (selectedExerciseId === id) {
            selectedExerciseId = null
            state.selectedExerciseId = null
        }
        await renderWorkouts()
    } catch (e) {
        console.error('Failed to delete workout exercise:', e)
        toast.error('Ошибка удаления упражнения')
    }
}

window.deleteWorkoutSet = async (id) => {
    if (!confirm('Удалить подход?')) return
    try {
        await workoutsApi.sets.remove(id)
        delete state.workoutSets[selectedExerciseId]
        await renderSets(selectedExerciseId)
    } catch (e) {
        console.error('Failed to delete workout set:', e)
        toast.error('Ошибка удаления подхода')
    }
}

window.duplicateWorkoutDay = async (programId, sourceDayId) => {
    const sourceDay = state.workoutDays[programId]?.find(d => d.id === sourceDayId)
    if (!sourceDay) {
        toast.warning('День не найден')
        return
    }

    const existingDays = state.workoutDays[programId] || []
    const existingDayNumbers = existingDays.map(d => d.dayOfWeek)
    
    const availableDays = dayNames.map((name, index) => {
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
            const existingDay = state.workoutDays[programId]?.find(d => d.dayOfWeek === dayOfWeek)
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
            })

            const sourceExercises = await loadWorkoutExercises(sourceDayId)
            
            for (const exercise of sourceExercises) {
                const newExercise = await workoutsApi.exercises.create({
                    programId,
                    dayId: newDay.id,
                    name: exercise.name,
                    muscleGroup: exercise.muscleGroup,
                    notes: exercise.notes || null
                })

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
        await renderWorkouts()
        const copiedDays = dayNumbers.map(n => dayNames[n]).join(', ')
        toast.success(`Тренировка скопирована в: ${copiedDays}!`)
    } catch (e) {
        console.error('Failed to duplicate workout day:', e)
        toast.error('Ошибка копирования дня')
    }
}

window.duplicateWorkoutExercise = async (dayId, exerciseId) => {
    const exercise = state.workoutExercises[dayId]?.find(e => e.id === exerciseId)
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
        })

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
        await renderWorkouts()
    } catch (e) {
        console.error('Failed to duplicate workout exercise:', e)
        toast.error('Ошибка копирования упражнения')
    }
}

window.duplicateWorkoutSet = async (exerciseId, setId) => {
    const set = state.workoutSets[exerciseId]?.find(s => s.id === setId)
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
        await renderSets(exerciseId)
    } catch (e) {
        console.error('Failed to duplicate workout set:', e)
        toast.error('Ошибка копирования подхода')
    }
}

export function initWorkouts() {
    if (!document.getElementById('workouts')) return
    loadWorkouts()
}

window.renderWorkouts = renderWorkouts

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('workouts')) {
        initWorkouts()
    }
})
