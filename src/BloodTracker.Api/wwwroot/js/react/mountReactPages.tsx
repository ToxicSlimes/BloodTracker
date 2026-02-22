import React, { Suspense, lazy, type ComponentType } from 'react'
import { createRoot, type Root } from 'react-dom/client'

type PageModule = { default: ComponentType }

const REACT_PAGES: Record<string, () => Promise<PageModule>> = {
  dashboard: () => import('./pages/DashboardPage.js'),
  admin: () => import('./pages/AdminPage.js'),
  encyclopedia: () => import('./pages/EncyclopediaPage.js'),
  compare: () => import('./pages/ComparePage.js'),
  course: () => import('./pages/CoursePage.js'),
  analyses: () => import('./pages/AnalysesPage.js'),
}

const roots = new Map<string, Root>()

export function mountReactPage(pageId: string): void {
  const loader = REACT_PAGES[pageId]
  if (!loader) return

  // Already mounted — skip
  if (roots.has(pageId)) return

  // Find the inner container (e.g. #admin-panel for admin page)
  const container = document.getElementById(`${pageId}-panel`) || document.getElementById(pageId)
  if (!container) return

  const LazyPage = lazy(loader)
  const root = createRoot(container)
  roots.set(pageId, root)

  root.render(
    <Suspense fallback={<div className="loading">Загрузка...</div>}>
      <LazyPage />
    </Suspense>,
  )
}

export function unmountReactPage(pageId: string): void {
  const root = roots.get(pageId)
  if (!root) return
  root.unmount()
  roots.delete(pageId)
}

export function isReactPage(pageId: string): boolean {
  return pageId in REACT_PAGES
}

// ─── Sub-tab mounting (for workout tabs migrated independently) ──────────────

const REACT_TABS: Record<string, () => Promise<PageModule>> = {
  'workout-history-content': () => import('./pages/WorkoutHistoryTab.js'),
  'analytics-content': () => import('./pages/WorkoutAnalyticsTab.js'),
  'programs-content': () => import('./pages/WorkoutProgramsTab.js'),
  'active-workout-content': () => import('./pages/ActiveWorkoutTab.js'),
}

export function mountReactTab(containerId: string): void {
  const loader = REACT_TABS[containerId]
  if (!loader) return
  if (roots.has(containerId)) return

  const container = document.getElementById(containerId)
  if (!container) return

  const LazyTab = lazy(loader)
  const root = createRoot(container)
  roots.set(containerId, root)

  root.render(
    <Suspense fallback={<div className="loading">Загрузка...</div>}>
      <LazyTab />
    </Suspense>,
  )
}
