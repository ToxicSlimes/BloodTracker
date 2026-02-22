import React, { useCallback } from 'react'
import { state } from '../../state.js'
import { useAppState } from '../hooks/useAppState.js'
import { auth } from '../../auth.js'

interface NavItem {
  id: string
  label: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'ДАШБОРД' },
  { id: 'course', label: 'КУРС' },
  { id: 'analyses', label: 'АНАЛИЗЫ' },
  { id: 'compare', label: 'СРАВНЕНИЕ' },
  { id: 'workouts', label: 'ТРЕНИРОВКИ' },
  { id: 'encyclopedia', label: 'ЭНЦИКЛОПЕДИЯ' },
  { id: 'ascii-studio', label: 'ASCII ART' },
  { id: 'admin', label: 'АДМИН', adminOnly: true },
]

export default function Navigation() {
  const currentPage = useAppState('currentPage')
  const isAdmin = auth.isAdmin() && !auth.isImpersonating()

  const navigate = useCallback((pageId: string) => {
    state.currentPage = pageId
    window.location.hash = ''
  }, [])

  return (
    <nav role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(item => {
        if (item.adminOnly && !isAdmin) return null
        const isActive = currentPage === item.id
        return (
          <button
            key={item.id}
            className={`nav-btn${isActive ? ' active' : ''}${item.adminOnly ? ' nav-btn-admin' : ''}`}
            data-page={item.id}
            data-asciify="sm"
            role="tab"
            aria-selected={isActive}
            onClick={() => navigate(item.id)}
          >
            [ {item.label} ]
          </button>
        )
      })}
    </nav>
  )
}
