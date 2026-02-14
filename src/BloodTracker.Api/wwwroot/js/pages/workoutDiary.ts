import { workoutSessionsApi } from '../api.js'
import { state } from '../state.js'
import { toast } from '../components/toast.js'
import type { WorkoutSessionDto } from '../types/workouts.js'

let currentPage = 1
const pageSize = 20

export async function loadWorkoutHistory(page: number = 1): Promise<void> {
    currentPage = page

    try {
        const result = await workoutSessionsApi.getHistory({ page, pageSize }) as {
            items: WorkoutSessionDto[]
            total: number
            page: number
            pageSize: number
        }

        state.workoutHistory = result.items
        state.workoutHistoryTotal = result.total

        renderWorkoutHistory()
    } catch (err) {
        console.error('Failed to load workout history:', err)
        toast.error('Ошибка загрузки истории тренировок')
    }
}

export function renderWorkoutHistory(): void {
    const container = document.getElementById('workout-history-content')
    if (!container) return

    const sessions = state.workoutHistory as WorkoutSessionDto[]
    const total = state.workoutHistoryTotal

    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="workout-history-empty">
                <div class="workout-history-empty-icon">📜</div>
                <div class="workout-history-empty-title">История пуста</div>
                <div class="workout-history-empty-text">
                    Завершённых тренировок пока нет.<br/>
                    Начните первую тренировку в разделе Программы.
                </div>
            </div>
        `
        return
    }

    const totalPages = Math.ceil(total / pageSize)

    container.innerHTML = `
        <div class="workout-history-list">
            ${sessions.map((session, index) => renderSessionCard(session, index, sessions)).join('')}
        </div>
        
        ${totalPages > 1 ? `
            <div class="workout-history-pagination">
                <button 
                    class="workout-history-pagination-btn" 
                    id="prev-page-btn"
                    ${currentPage === 1 ? 'disabled' : ''}
                >
                    ← НАЗАД
                </button>
                <span class="workout-history-pagination-info">
                    Страница ${currentPage} из ${totalPages}
                </span>
                <button 
                    class="workout-history-pagination-btn" 
                    id="next-page-btn"
                    ${currentPage === totalPages ? 'disabled' : ''}
                >
                    ВПЕРЁД →
                </button>
            </div>
        ` : ''}
    `

    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        if (currentPage > 1) loadWorkoutHistory(currentPage - 1)
    })

    document.getElementById('next-page-btn')?.addEventListener('click', () => {
        if (currentPage < totalPages) loadWorkoutHistory(currentPage + 1)
    })

    sessions.forEach(session => {
        document.getElementById(`session-card-${session.id}`)?.addEventListener('click', () => {
            showSessionDetails(session.id)
        })
    })
}

function renderSessionCard(session: WorkoutSessionDto, index: number, allSessions: WorkoutSessionDto[]): string {
    const date = new Date(session.startedAt)
    const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    
    const durationMin = Math.floor(session.durationSeconds / 60)
    const tonnage = session.totalTonnage.toFixed(0)
    const volume = session.totalVolume
    const sets = session.totalSetsCompleted

    let comparisonHtml = ''
    
    if (index > 0) {
        const previous = allSessions[index - 1]
        const tonnageDelta = session.totalTonnage - previous.totalTonnage
        const volumeDelta = session.totalVolume - previous.totalVolume
        const durationDelta = session.durationSeconds - previous.durationSeconds

        comparisonHtml = renderComparison(tonnageDelta, volumeDelta, durationDelta)
    }

    return `
        <div class="workout-history-card" id="session-card-${session.id}">
            <div class="workout-history-card-header">
                <div>
                    <div class="workout-history-card-title">${escapeHtml(session.title)}</div>
                    <div class="workout-history-card-date">${dateStr} в ${timeStr}</div>
                </div>
            </div>
            <div class="workout-history-card-stats">
                <div class="workout-history-card-stat">
                    <div class="workout-history-card-stat-label">Длительность</div>
                    <div class="workout-history-card-stat-value">${durationMin} мин</div>
                </div>
                <div class="workout-history-card-stat">
                    <div class="workout-history-card-stat-label">Тоннаж</div>
                    <div class="workout-history-card-stat-value">${tonnage} кг</div>
                </div>
                <div class="workout-history-card-stat">
                    <div class="workout-history-card-stat-label">Объём</div>
                    <div class="workout-history-card-stat-value">${volume} повт</div>
                </div>
                <div class="workout-history-card-stat">
                    <div class="workout-history-card-stat-label">Подходы</div>
                    <div class="workout-history-card-stat-value">${sets}</div>
                </div>
            </div>
            ${comparisonHtml}
        </div>
    `
}

function renderComparison(tonnageDelta: number, volumeDelta: number, durationDelta: number): string {
    const formatDelta = (delta: number, unit: string, abs: boolean = false): { text: string, className: string, icon: string } => {
        const value = abs ? Math.abs(delta) : delta
        const sign = delta > 0 ? '+' : delta < 0 ? '-' : ''
        const className = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'
        const icon = delta > 0 ? '📈' : delta < 0 ? '📉' : '→'
        const displayValue = abs ? Math.abs(delta) : value
        return {
            text: `${sign}${displayValue.toFixed(0)}${unit}`,
            className,
            icon
        }
    }

    const tonnageComparison = formatDelta(tonnageDelta, 'кг', true)
    const volumeComparison = formatDelta(volumeDelta, ' повт', true)
    const durationComparison = formatDelta(durationDelta / 60, ' мин', true)

    return `
        <div class="workout-comparison">
            <div class="workout-comparison-title">Сравнение с предыдущей</div>
            <div class="workout-comparison-stats">
                <div class="workout-comparison-item">
                    <span class="workout-comparison-icon">${tonnageComparison.icon}</span>
                    <span class="workout-comparison-label">Тоннаж:</span>
                    <span class="workout-comparison-delta ${tonnageComparison.className}">${tonnageComparison.text}</span>
                </div>
                <div class="workout-comparison-item">
                    <span class="workout-comparison-icon">${volumeComparison.icon}</span>
                    <span class="workout-comparison-label">Объём:</span>
                    <span class="workout-comparison-delta ${volumeComparison.className}">${volumeComparison.text}</span>
                </div>
                <div class="workout-comparison-item">
                    <span class="workout-comparison-icon">${durationComparison.icon}</span>
                    <span class="workout-comparison-label">Время:</span>
                    <span class="workout-comparison-delta ${durationComparison.className}">${durationComparison.text}</span>
                </div>
            </div>
        </div>
    `
}

function showSessionDetails(sessionId: string): void {
    console.log('Show session details:', sessionId)
}

function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

export function initWorkoutDiary(): void {
    const diaryPage = document.getElementById('workout-diary')
    if (!diaryPage) return

    loadWorkoutHistory(1)
}
