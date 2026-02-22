import React, { Suspense, lazy, useEffect } from 'react'
import { useAppState } from '../hooks/useAppState.js'
import { state } from '../../state.js'

const DashboardPage = lazy(() => import('../pages/DashboardPage.js'))
const AnalysesPage = lazy(() => import('../pages/AnalysesPage.js'))
const ComparePage = lazy(() => import('../pages/ComparePage.js'))
const CoursePage = lazy(() => import('../pages/CoursePage.js'))
const WorkoutsPage = lazy(() => import('../pages/WorkoutsPage.js'))
const EncyclopediaPage = lazy(() => import('../pages/EncyclopediaPage.js'))
const AdminPage = lazy(() => import('../pages/AdminPage.js'))

const VALID_PAGES = new Set([
  'dashboard', 'analyses', 'compare', 'course',
  'workouts', 'encyclopedia', 'admin', 'ascii-studio',
])

function AsciiStudioPage() {
  useEffect(() => {
    import('../../components/asciiArtUI.js')
      .then(({ initAsciiArtUI }) => {
        const el = document.getElementById('ascii-art-studio-root')
        if (el && !el.hasChildNodes()) initAsciiArtUI('ascii-art-studio-root')
      })
      .catch(console.error)
  }, [])

  return <div id="ascii-art-studio-root" />
}

const PAGES: Record<string, React.ComponentType> = {
  dashboard: DashboardPage as unknown as React.ComponentType,
  analyses: AnalysesPage as unknown as React.ComponentType,
  compare: ComparePage as unknown as React.ComponentType,
  course: CoursePage as unknown as React.ComponentType,
  workouts: WorkoutsPage as unknown as React.ComponentType,
  encyclopedia: EncyclopediaPage as unknown as React.ComponentType,
  admin: AdminPage as unknown as React.ComponentType,
  'ascii-studio': AsciiStudioPage,
}

export default function PageRouter() {
  const currentPage = useAppState('currentPage')

  useEffect(() => {
    function handler() {
      const hash = window.location.hash.slice(1)
      if (!hash) return

      if (hash === 'active-workout' || hash === 'workout-diary') {
        state.currentPage = 'workouts'
        state.workoutSubTab = hash === 'workout-diary' ? 'history' : 'training'
      } else if (VALID_PAGES.has(hash)) {
        state.currentPage = hash
      }
    }

    window.addEventListener('hashchange', handler)
    if (window.location.hash) handler()
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const Page = PAGES[currentPage] || PAGES.dashboard

  return (
    <Suspense fallback={<div className="loading">Загрузка...</div>}>
      <Page />
    </Suspense>
  )
}
