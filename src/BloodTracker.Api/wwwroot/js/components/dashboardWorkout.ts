import { workoutSessionsApi, workoutsApi } from '../api.js'
import { state } from '../state.js'
import { navigateToPage, switchWorkoutSubTab } from './navigation.js'
import { toast } from './toast.js'
import type { WeekStatusDto, WorkoutDayDto, WorkoutProgramDto } from '../types/workouts.js'

const DAY_LABELS: Record<number, string> = {
    0: 'ВОСКРЕСНУЮ',
    1: 'ПОНЕДЕЛЬНИЧНУЮ',
    2: 'ВТОРНИЧНУЮ',
    3: 'СРЕДОВУЮ',
    4: 'ЧЕТВЕРГОВУЮ',
    5: 'ПЯТНИЧНУЮ',
    6: 'СУББОТНЮЮ'
}

function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

export async function initDashboardWorkoutAction(): Promise<void> {
    const container = document.getElementById('dashboard-workout-action')
    if (!container) return

    try {
        const weekStatus = await workoutSessionsApi.getWeekStatus() as WeekStatusDto

        if (weekStatus.activeSession) {
            const start = new Date(weekStatus.activeSession.startedAt).getTime()
            const elapsed = Math.floor((Date.now() - start) / 1000)
            const mins = Math.floor(elapsed / 60)
            const secs = elapsed % 60
            const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

            container.innerHTML = `
                <button class="quick-action-btn dashboard-workout-btn dashboard-workout-btn--active" id="dashboard-workout-resume">
                    [ ▶ ПРОДОЛЖИТЬ ТРЕНИРОВКУ — ${timeStr} ]
                    <div class="dashboard-workout-subtitle">${escapeHtml(weekStatus.activeSession.title)}</div>
                </button>
            `
            document.getElementById('dashboard-workout-resume')?.addEventListener('click', () => {
                navigateToPage('workouts')
                switchWorkoutSubTab('training')
            })
            return
        }

        const programs = state.workoutPrograms as WorkoutProgramDto[]
        if (!programs || programs.length === 0) {
            container.innerHTML = ''
            return
        }

        const todayDow = new Date().getDay()
        const completedDayIds = new Set(
            weekStatus.currentWeekSessions
                .filter(s => s.sourceDayId)
                .map(s => s.sourceDayId!)
        )

        let allDays: WorkoutDayDto[] = []
        for (const program of programs) {
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

        if (allDays.length === 0) {
            container.innerHTML = ''
            return
        }

        let recommendedDay: WorkoutDayDto | null = null
        const todayDay = allDays.find(d => d.dayOfWeek === todayDow && !completedDayIds.has(d.id))
        if (todayDay) {
            recommendedDay = todayDay
        } else {
            const dayOrder = []
            for (let i = 1; i <= 7; i++) {
                dayOrder.push((todayDow + i) % 7)
            }
            for (const dow of dayOrder) {
                const nextDay = allDays.find(d => d.dayOfWeek === dow && !completedDayIds.has(d.id))
                if (nextDay) {
                    recommendedDay = nextDay
                    break
                }
            }
        }

        if (!recommendedDay) {
            container.innerHTML = ''
            return
        }

        const dayLabel = DAY_LABELS[recommendedDay.dayOfWeek] || ''
        const dayTitle = recommendedDay.title ? ` — ${escapeHtml(recommendedDay.title)}` : ''

        container.innerHTML = `
            <button class="quick-action-btn dashboard-workout-btn dashboard-workout-btn--suggest" id="dashboard-workout-start">
                [ ▶ НАЧАТЬ ${dayLabel} ТРЕНИРОВКУ ]
                <div class="dashboard-workout-subtitle">${escapeHtml(DAY_NAMES[recommendedDay.dayOfWeek] || '')}${dayTitle}</div>
            </button>
        `

        const dayId = recommendedDay.id
        document.getElementById('dashboard-workout-start')?.addEventListener('click', async () => {
            try {
                const session = await workoutSessionsApi.start({ sourceDayId: dayId }) as any
                state.activeWorkoutSession = session
                toast.success('Тренировка начата!')
                navigateToPage('workouts')
                switchWorkoutSubTab('training')
            } catch (err) {
                console.error('Failed to start workout from dashboard:', err)
                toast.error('Ошибка начала тренировки')
            }
        })
    } catch (err) {
        console.error('Failed to init dashboard workout action:', err)
        container.innerHTML = ''
    }
}

const DAY_NAMES: Record<number, string> = {
    0: 'Воскресенье',
    1: 'Понедельник',
    2: 'Вторник',
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница',
    6: 'Суббота'
}
