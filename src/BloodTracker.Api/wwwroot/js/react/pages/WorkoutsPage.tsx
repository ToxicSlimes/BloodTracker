import React, { Suspense, lazy } from 'react'
import { useAppState } from '../hooks/useAppState.js'
import { state } from '../../state.js'

const ActiveWorkoutTab = lazy(() => import('./ActiveWorkoutTab.js'))
const WorkoutHistoryTab = lazy(() => import('./WorkoutHistoryTab.js'))
const WorkoutProgramsTab = lazy(() => import('./WorkoutProgramsTab.js'))
const WorkoutAnalyticsTab = lazy(() => import('./WorkoutAnalyticsTab.js'))

const TABS = [
  { id: 'training', label: 'ТРЕНИРОВКА' },
  { id: 'history', label: 'ИСТОРИЯ' },
  { id: 'programs', label: 'ПРОГРАММЫ' },
  { id: 'analytics', label: 'АНАЛИТИКА' },
] as const

const TAB_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  training: ActiveWorkoutTab,
  history: WorkoutHistoryTab,
  programs: WorkoutProgramsTab,
  analytics: WorkoutAnalyticsTab,
}

export default function WorkoutsPage() {
  const subTab = useAppState('workoutSubTab') || 'training'
  const TabComponent = TAB_COMPONENTS[subTab] || ActiveWorkoutTab

  return (
    <div>
      <div className="workout-hub-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`workout-hub-tab${subTab === t.id ? ' active' : ''}`}
            onClick={() => { state.workoutSubTab = t.id }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="workout-hub-content">
        <div className="workout-hub-panel active">
          <Suspense fallback={<div className="loading">Загрузка...</div>}>
            <TabComponent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
