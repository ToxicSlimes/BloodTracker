import { renderMuscleAscii } from '../components/muscleAscii.js'

const workoutPlan = [
    {
        day: 'Понедельник',
        focus: 'Грудь + трицепс',
        exercises: [
            {
                name: 'Жим лёжа',
                muscle: 'chest',
                sets: [
                    { reps: 12, weight: '60 кг' },
                    { reps: 10, weight: '70 кг' },
                    { reps: 8, weight: '80 кг' }
                ]
            },
            {
                name: 'Отжимания на брусьях',
                muscle: 'arms',
                sets: [
                    { reps: 12, weight: 'собственный вес' },
                    { reps: 10, weight: 'доп. 10 кг' }
                ]
            },
            {
                name: 'Сведение в кроссовере',
                muscle: 'chest',
                sets: [
                    { reps: 15, weight: '20 кг' },
                    { reps: 12, weight: '25 кг' }
                ]
            }
        ]
    },
    {
        day: 'Среда',
        focus: 'Спина + бицепс',
        exercises: [
            {
                name: 'Тяга штанги в наклоне',
                muscle: 'back',
                sets: [
                    { reps: 12, weight: '50 кг' },
                    { reps: 10, weight: '60 кг' },
                    { reps: 8, weight: '70 кг' }
                ]
            },
            {
                name: 'Подтягивания',
                muscle: 'back',
                sets: [
                    { reps: 10, weight: 'собственный вес' },
                    { reps: 8, weight: 'доп. 5 кг' }
                ]
            },
            {
                name: 'Сгибания на бицепс',
                muscle: 'arms',
                sets: [
                    { reps: 12, weight: '16 кг' },
                    { reps: 10, weight: '18 кг' }
                ]
            }
        ]
    },
    {
        day: 'Пятница',
        focus: 'Ноги + плечи',
        exercises: [
            {
                name: 'Приседания',
                muscle: 'legs',
                sets: [
                    { reps: 12, weight: '80 кг' },
                    { reps: 10, weight: '90 кг' },
                    { reps: 8, weight: '100 кг' }
                ]
            },
            {
                name: 'Жим ногами',
                muscle: 'legs',
                sets: [
                    { reps: 15, weight: '140 кг' },
                    { reps: 12, weight: '160 кг' }
                ]
            },
            {
                name: 'Жим гантелей сидя',
                muscle: 'shoulders',
                sets: [
                    { reps: 12, weight: '16 кг' },
                    { reps: 10, weight: '18 кг' }
                ]
            }
        ]
    }
]

let selectedDayIndex = 0
let selectedExerciseIndex = 0

function renderDays() {
    const daysContainer = document.getElementById('workout-days')
    if (!daysContainer) return

    daysContainer.innerHTML = workoutPlan.map((day, index) => {
        const isActive = index === selectedDayIndex
        return `
            <button class="workout-day-card ${isActive ? 'active' : ''}" data-day-index="${index}">
                <div class="workout-day-name">${day.day}</div>
                <div class="workout-day-focus">${day.focus}</div>
            </button>
        `
    }).join('')
}

function renderExercises() {
    const exercisesContainer = document.getElementById('workout-exercises')
    if (!exercisesContainer) return

    const currentDay = workoutPlan[selectedDayIndex]

    exercisesContainer.innerHTML = currentDay.exercises.map((exercise, index) => {
        const isActive = index === selectedExerciseIndex
        const setsHtml = exercise.sets.map((set, setIndex) => `
            <div class="workout-set-card">
                <div>Подход ${setIndex + 1}</div>
                <div>${set.reps} × ${set.weight}</div>
            </div>
        `).join('')

        return `
            <div class="workout-exercise-card ${isActive ? 'active' : ''}" data-exercise-index="${index}">
                <div class="workout-exercise-title">${exercise.name}</div>
                <div class="workout-set-list">
                    ${setsHtml}
                </div>
            </div>
        `
    }).join('')
}

function updateAscii() {
    const asciiContainer = document.getElementById('muscle-ascii')
    if (!asciiContainer) return

    const currentDay = workoutPlan[selectedDayIndex]
    const currentExercise = currentDay.exercises[selectedExerciseIndex]
    asciiContainer.innerHTML = renderMuscleAscii(currentExercise.muscle)
}

function bindWorkoutEvents() {
    const daysContainer = document.getElementById('workout-days')
    const exercisesContainer = document.getElementById('workout-exercises')

    daysContainer?.addEventListener('click', event => {
        const target = event.target.closest('.workout-day-card')
        if (!target) return
        selectedDayIndex = Number(target.dataset.dayIndex)
        selectedExerciseIndex = 0
        renderDays()
        renderExercises()
        updateAscii()
    })

    exercisesContainer?.addEventListener('click', event => {
        const target = event.target.closest('.workout-exercise-card')
        if (!target) return
        selectedExerciseIndex = Number(target.dataset.exerciseIndex)
        renderExercises()
        updateAscii()
    })
}

function initWorkouts() {
    if (!document.getElementById('workouts')) return
    renderDays()
    renderExercises()
    updateAscii()
    bindWorkoutEvents()
}

document.addEventListener('DOMContentLoaded', initWorkouts)
