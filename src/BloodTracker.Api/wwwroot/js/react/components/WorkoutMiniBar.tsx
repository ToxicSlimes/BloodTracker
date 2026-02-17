import React, { useState, useEffect } from 'react'
import { state } from '../../state.js'
import { useAppState } from '../hooks/useAppState.js'

// ═══════════════════════════════════════════════════════════════════════════════
// WORKOUT MINI BAR — floating bar when navigating away from active workout
// ═══════════════════════════════════════════════════════════════════════════════

function formatElapsed(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function countSets(session: { exercises: Array<{ sets: Array<{ completedAt?: string }> }> }): {
  completed: number
  total: number
} {
  let completed = 0
  let total = 0
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      total++
      if (set.completedAt) completed++
    }
  }
  return { completed, total }
}

export function WorkoutMiniBar() {
  const session = useAppState('activeWorkoutSession')
  const currentPage = useAppState('currentPage')
  const workoutSubTab = useAppState('workoutSubTab')
  const [, setTick] = useState(0)

  const isOnTrainingTab = currentPage === 'workouts' && workoutSubTab === 'training'
  const isVisible = session != null && !isOnTrainingTab

  useEffect(() => {
    if (!isVisible) return undefined

    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible || !session) return null

  const { completed, total } = countSets(session)

  function handleReturn(): void {
    state.currentPage = 'workouts'
    state.workoutSubTab = 'training'
  }

  return (
    <div className="workout-mini-bar active">
      <div className="workout-mini-bar-info">
        <div className="workout-mini-bar-title">{session.title}</div>
        <div className="workout-mini-bar-stats">
          {formatElapsed(session.startedAt)} | {completed}/{total} подходов
        </div>
      </div>
      <button className="workout-mini-bar-btn" onClick={handleReturn}>
        ВЕРНУТЬСЯ
      </button>
    </div>
  )
}
