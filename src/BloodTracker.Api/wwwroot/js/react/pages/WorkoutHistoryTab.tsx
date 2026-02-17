import React, { useState, useEffect, useCallback } from 'react'
import { workoutSessionsApi } from '../../api.js'
import { toast } from '../components/Toast.js'
import type { WorkoutSessionDto, WorkoutSessionExerciseDto, WorkoutSessionSetDto } from '../../types/workouts.js'

const PAGE_SIZE = 20

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
          <span>Тоннаж: {session.totalTonnage.toFixed(0)} кг</span>
          <span>Объём: {session.totalVolume} повт.</span>
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

function ComparisonRow({
  current,
  previous,
}: {
  current: WorkoutSessionDto
  previous: WorkoutSessionDto
}) {
  const tonnageDelta = current.totalTonnage - previous.totalTonnage
  const volumeDelta = current.totalVolume - previous.totalVolume
  const durationDelta = current.durationSeconds - previous.durationSeconds

  const fmt = (delta: number, unit: string) => {
    const sign = delta > 0 ? '+' : delta < 0 ? '-' : ''
    const cls = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'
    const icon = delta > 0 ? '\uD83D\uDCC8' : delta < 0 ? '\uD83D\uDCC9' : '\u2192'
    return { text: `${sign}${Math.abs(delta).toFixed(0)}${unit}`, cls, icon }
  }

  const t = fmt(tonnageDelta, 'кг')
  const v = fmt(volumeDelta, ' повт')
  const d = fmt(durationDelta / 60, ' мин')

  return (
    <div className="workout-comparison">
      <div className="workout-comparison-title">Сравнение с предыдущей</div>
      <div className="workout-comparison-stats">
        <div className="workout-comparison-item">
          <span className="workout-comparison-icon">{t.icon}</span>
          <span className="workout-comparison-label">Тоннаж:</span>
          <span className={`workout-comparison-delta ${t.cls}`}>{t.text}</span>
        </div>
        <div className="workout-comparison-item">
          <span className="workout-comparison-icon">{v.icon}</span>
          <span className="workout-comparison-label">Объём:</span>
          <span className={`workout-comparison-delta ${v.cls}`}>{v.text}</span>
        </div>
        <div className="workout-comparison-item">
          <span className="workout-comparison-icon">{d.icon}</span>
          <span className="workout-comparison-label">Время:</span>
          <span className={`workout-comparison-delta ${d.cls}`}>{d.text}</span>
        </div>
      </div>
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

  return (
    <div className="workout-history-card" onClick={onClick}>
      <div className="workout-history-card-header">
        <div>
          <div className="workout-history-card-title">{session.title}</div>
          <div className="workout-history-card-date">{dateStr} в {timeStr}</div>
        </div>
      </div>
      <div className="workout-history-card-stats">
        <div className="workout-history-card-stat">
          <div className="workout-history-card-stat-label">Длительность</div>
          <div className="workout-history-card-stat-value">{durationMin} мин</div>
        </div>
        <div className="workout-history-card-stat">
          <div className="workout-history-card-stat-label">Тоннаж</div>
          <div className="workout-history-card-stat-value">{session.totalTonnage.toFixed(0)} кг</div>
        </div>
        <div className="workout-history-card-stat">
          <div className="workout-history-card-stat-label">Объём</div>
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
