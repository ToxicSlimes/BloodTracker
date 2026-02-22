import React, { useState, useEffect, useCallback } from 'react'
import { workoutSessionsApi } from '../../api.js'
import { toast } from '../components/Toast.js'
import type { WorkoutSessionDto, WorkoutSessionExerciseDto, WorkoutSessionSetDto } from '../../types/workouts.js'
import { Tooltip } from '../components/Tooltip.js'

const PAGE_SIZE = 20

const MUSCLE_GROUP_LABELS: Record<number, string> = {
  0: 'Все тело', 1: 'Грудь', 2: 'Спина', 3: 'Плечи', 4: 'Бицепс',
  5: 'Трицепс', 6: 'Предплечья', 7: 'Пресс', 8: 'Ягодицы',
  9: 'Квадрицепс', 10: 'Бицепс бедра', 11: 'Икры',
}

const MUSCLE_GROUP_COLORS: Record<number, string> = {
  0: '#4AF626', 1: '#FF6B6B', 2: '#4A90D9', 3: '#FBB954', 4: '#E57CD8',
  5: '#FF9F43', 6: '#A29BFE', 7: '#FFEAA7', 8: '#55E6C1',
  9: '#74B9FF', 10: '#FD79A8', 11: '#81ECEC',
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function SessionDetailModal({
  session,
  onClose,
}: {
  session: WorkoutSessionDto
  onClose: () => void
}) {
  const date = new Date(session.startedAt)
  const dateStr = date.toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const durationMin = Math.floor(session.durationSeconds / 60)

  return (
    <div
      className="modal-overlay session-detail-overlay active"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal session-detail-modal">
        <div className="session-detail-header">
          <h2 className="session-detail-title">{session.title}</h2>
          <div className="session-detail-meta">{dateStr} в {timeStr} &middot; {durationMin} мин</div>
        </div>
        <div className="session-detail-stats">
          <span><Tooltip label="Тоннаж" />: {session.totalTonnage.toFixed(0)} кг</span>
          <span><Tooltip label="Объём" />: {session.totalVolume} повт.</span>
          <span>Подходы: {session.totalSetsCompleted}</span>
        </div>
        {session.notes && (
          <div className="session-detail-notes">{session.notes}</div>
        )}
        <div className="session-detail-exercises">
          {session.exercises.map((ex: WorkoutSessionExerciseDto) => (
            <div className="session-detail-exercise" key={ex.id}>
              <div className="session-detail-ex-name">{ex.name}</div>
              <div className="session-detail-ex-sets">
                {ex.sets.map((set: WorkoutSessionSetDto, i: number) => {
                  const done = set.completedAt
                  const w = set.actualWeight ?? set.plannedWeight
                  const r = set.actualRepetitions ?? set.plannedRepetitions
                  const rpe = set.rpe != null ? ` RPE ${set.rpe}` : ''
                  return (
                    <div className="session-detail-set" key={set.id || i}>
                      {done ? '\u2713' : '\u2014'} {w ?? '\u2014'} кг × {r ?? '\u2014'}{rpe}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary session-detail-close" onClick={onClose}>
          ЗАКРЫТЬ
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON ROW
// ═══════════════════════════════════════════════════════════════════════════════

function ComparisonRow({ current, previous }: { current: WorkoutSessionDto; previous: WorkoutSessionDto }) {
  const metrics = [
    { label: 'Тоннаж', current: current.totalTonnage, prev: previous.totalTonnage, unit: 'кг' },
    { label: 'Объём', current: current.totalVolume, prev: previous.totalVolume, unit: ' повт' },
    { label: 'Время', current: current.durationSeconds / 60, prev: previous.durationSeconds / 60, unit: ' мин' },
  ]

  return (
    <div className="workout-comparison">
      <div className="workout-comparison-title">vs предыдущая</div>
      {metrics.map(m => {
        const delta = m.current - m.prev
        const pct = m.prev > 0 ? Math.round((delta / m.prev) * 100) : 0
        const isUp = delta > 0
        const barWidth = Math.min(Math.abs(pct), 100)
        return (
          <div key={m.label} className="comparison-bar-row">
            <span className="comparison-bar-label">{m.label === 'Тоннаж' || m.label === 'Объём' ? <Tooltip label={m.label} /> : m.label}</span>
            <div className="comparison-bar-track">
              <div
                className={`comparison-bar-fill ${isUp ? 'positive' : 'negative'}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className={`comparison-bar-value ${isUp ? 'positive' : 'negative'}`}>
              {isUp ? '+' : ''}{delta.toFixed(0)}{m.unit} ({isUp ? '+' : ''}{pct}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION CARD
// ═══════════════════════════════════════════════════════════════════════════════

function SessionCard({
  session,
  previous,
  onClick,
}: {
  session: WorkoutSessionDto
  previous?: WorkoutSessionDto
  onClick: () => void
}) {
  const date = new Date(session.startedAt)
  const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const durationMin = Math.floor(session.durationSeconds / 60)

  const muscleGroups = [...new Set(
    session.exercises?.map(e => e.muscleGroup as unknown as number).filter(g => g != null) ?? []
  )]

  return (
    <div className="workout-history-card" onClick={onClick}>
      <div className="workout-history-card-header">
        <div>
          <div className="workout-history-card-title">{session.title}</div>
          <div className="workout-history-card-date">{dateStr} в {timeStr}</div>
          {muscleGroups.length > 0 && (
            <div className="workout-history-card-tags">
              {muscleGroups.map(g => (
                <span key={g} className="muscle-tag" style={{ borderColor: MUSCLE_GROUP_COLORS[g] || '#4AF626' }}>
                  {MUSCLE_GROUP_LABELS[g] || '?'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="workout-history-card-stats">
        <div className="workout-history-card-stat">
          <div className="workout-history-card-stat-label">Длительность</div>
          <div className="workout-history-card-stat-value">{durationMin} мин</div>
        </div>
        <div className="workout-history-card-stat">
          <div className="workout-history-card-stat-label"><Tooltip label="Тоннаж" /></div>
          <div className="workout-history-card-stat-value">{session.totalTonnage.toFixed(0)} кг</div>
        </div>
        <div className="workout-history-card-stat">
          <div className="workout-history-card-stat-label"><Tooltip label="Объём" /></div>
          <div className="workout-history-card-stat-value">{session.totalVolume} повт</div>
        </div>
        <div className="workout-history-card-stat">
          <div className="workout-history-card-stat-label">Подходы</div>
          <div className="workout-history-card-stat-value">{session.totalSetsCompleted}</div>
        </div>
      </div>
      {previous && <ComparisonRow current={session} previous={previous} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function WorkoutHistoryTab() {
  const [sessions, setSessions] = useState<WorkoutSessionDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [detailSession, setDetailSession] = useState<WorkoutSessionDto | null>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const loadPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const result = await workoutSessionsApi.getHistory({ page: p, pageSize: PAGE_SIZE }) as {
        items: WorkoutSessionDto[]
        totalCount: number
      }
      setSessions(result.items)
      setTotal(result.totalCount ?? result.items.length)
      setPage(p)
    } catch (err) {
      console.error('Failed to load workout history:', err)
      toast.error('Ошибка загрузки истории тренировок')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPage(1) }, [loadPage])

  const openDetail = useCallback(async (sessionId: string) => {
    try {
      const session = await workoutSessionsApi.getById(sessionId) as WorkoutSessionDto
      setDetailSession(session)
      document.body.classList.add('modal-open')
    } catch (err) {
      console.error('Failed to load session details:', err)
      toast.error('Ошибка загрузки тренировки')
    }
  }, [])

  const closeDetail = useCallback(() => {
    setDetailSession(null)
    document.body.classList.remove('modal-open')
  }, [])

  if (loading && sessions.length === 0) {
    return <div className="skeleton skeleton-card" style={{ height: 200 }} />
  }

  if (sessions.length === 0) {
    return (
      <div className="workout-history-empty">
        <div className="workout-history-empty-title">История пуста</div>
        <div className="workout-history-empty-text">
          Завершённых тренировок пока нет.<br />
          Начните первую тренировку в разделе Программы.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="workout-history-list">
        {sessions.map((session, i) => (
          <SessionCard
            key={session.id}
            session={session}
            previous={i > 0 ? sessions[i - 1] : undefined}
            onClick={() => openDetail(session.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="workout-history-pagination">
          <button
            className="workout-history-pagination-btn"
            disabled={page === 1}
            onClick={() => loadPage(page - 1)}
          >
            &larr; НАЗАД
          </button>
          <span className="workout-history-pagination-info">
            Страница {page} из {totalPages}
          </span>
          <button
            className="workout-history-pagination-btn"
            disabled={page === totalPages}
            onClick={() => loadPage(page + 1)}
          >
            ВПЕРЁД &rarr;
          </button>
        </div>
      )}

      {detailSession && (
        <SessionDetailModal session={detailSession} onClose={closeDetail} />
      )}
    </>
  )
}
