import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { PRDetailDto } from '../../types/workouts.js'

// ═══════════════════════════════════════════════════════════════════════════════
// PR CELEBRATION — golden overlay when a personal record is broken
// ═══════════════════════════════════════════════════════════════════════════════

const RECORD_TYPE_LABELS: Record<string, string> = {
  MaxWeight: 'Максимальный вес',
  MaxEstimated1RM: 'Расчётный 1RM',
  MaxRepAtWeight: 'Максимум повторений',
}

const AUTO_DISMISS_MS = 5000
const CLOSE_ANIMATION_MS = 300
const MAX_PRS_SHOWN = 3

interface PRData {
  prs: PRDetailDto[]
  exerciseName: string
}

// ─── Module-level closure (same pattern as Toast) ───────────────────────────

let showPRFn: ((prs: PRDetailDto[], exerciseName: string) => void) | null = null

export function showPRCelebration(prs: PRDetailDto[], exerciseName: string): void {
  showPRFn?.(prs, exerciseName)
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PRCelebration() {
  const [data, setData] = useState<PRData | null>(null)
  const [closing, setClosing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    setClosing(true)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setTimeout(() => {
      setData(null)
      setClosing(false)
    }, CLOSE_ANIMATION_MS)
  }, [])

  useEffect(() => {
    showPRFn = (prs: PRDetailDto[], exerciseName: string) => {
      setData({ prs: prs.slice(0, MAX_PRS_SHOWN), exerciseName })
      setClosing(false)

      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200])
      }
    }
    return () => {
      showPRFn = null
    }
  }, [])

  useEffect(() => {
    if (!data || closing) return undefined

    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [data, closing, dismiss])

  if (!data) return <div id="pr-celebration-container" />

  const modalClass = `pr-celebration-modal active${closing ? ' closing' : ''}`

  return (
    <div id="pr-celebration-container">
      <div className={modalClass}>
        <div className="pr-celebration-content">
          <div className="pr-celebration-title">НОВЫЙ РЕКОРД!</div>
          <div className="pr-celebration-exercise">{data.exerciseName}</div>

          {data.prs.map((pr, i) => {
            const label = RECORD_TYPE_LABELS[pr.recordType] || pr.recordType
            return (
              <div key={i} className="pr-celebration-detail">
                <div className="pr-celebration-detail-label">{label}</div>
                <div className="pr-celebration-detail-change">
                  Было: {pr.previousValue ?? '—'} → Стало: {pr.value}
                </div>
                <div className="pr-celebration-detail-improvement">
                  Улучшение: +{pr.improvementPercent}%
                </div>
              </div>
            )
          })}

          <button className="pr-celebration-btn" onClick={dismiss}>
            NICE!
          </button>
        </div>
      </div>
    </div>
  )
}
