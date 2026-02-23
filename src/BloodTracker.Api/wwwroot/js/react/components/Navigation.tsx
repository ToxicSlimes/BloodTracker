import React, { useCallback, useState, useRef, useEffect } from 'react'
import { state } from '../../state.js'
import { useAppState } from '../hooks/useAppState.js'
import { auth } from '../../auth.js'

interface NavItem {
  id: string
  label: string
  adminOnly?: boolean
  overflow?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'ДАШБОРД' },
  { id: 'course', label: 'КУРС' },
  { id: 'analyses', label: 'АНАЛИЗЫ' },
  { id: 'workouts', label: 'ТРЕНИРОВКИ' },
  { id: 'compare', label: 'СРАВНЕНИЕ', overflow: true },
  { id: 'encyclopedia', label: 'ЭНЦИКЛОПЕДИЯ', overflow: true },
  { id: 'ascii-studio', label: 'ASCII ART', overflow: true },
  { id: 'admin', label: 'АДМИН', adminOnly: true, overflow: true },
]

export default function Navigation() {
  const currentPage = useAppState('currentPage')
  const isAdmin = auth.isAdmin() && !auth.isImpersonating()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const navigate = useCallback((pageId: string) => {
    state.currentPage = pageId
    window.location.hash = ''
    setMoreOpen(false)
  }, [])

  useEffect(() => {
    if (!moreOpen) return
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [moreOpen])

  const mainItems = NAV_ITEMS.filter(i => !i.overflow)
  const overflowItems = NAV_ITEMS.filter(i => i.overflow && (!i.adminOnly || isAdmin))
  const overflowActive = overflowItems.some(i => i.id === currentPage)

  return (
    <nav role="navigation" aria-label="Main navigation">
      {mainItems.map(item => {
        const isActive = currentPage === item.id
        return (
          <button
            key={item.id}
            className={`nav-btn${isActive ? ' active' : ''}`}
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

      {overflowItems.length > 0 && (
        <div className="nav-more-container" ref={moreRef}>
          <button
            className={`nav-btn nav-more-btn${overflowActive ? ' active' : ''}`}
            data-asciify="sm"
            role="tab"
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={(e) => { e.stopPropagation(); setMoreOpen(o => !o) }}
          >
            [ ЕЩЁ {moreOpen ? '\u25B2' : '\u25BC'} ]
          </button>
          {moreOpen && (
            <div className="nav-more-dropdown">
              {overflowItems.map(item => {
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    className={`nav-more-item${isActive ? ' active' : ''}${item.adminOnly ? ' nav-btn-admin' : ''}`}
                    onClick={() => navigate(item.id)}
                  >
                    [ {item.label} ]
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
