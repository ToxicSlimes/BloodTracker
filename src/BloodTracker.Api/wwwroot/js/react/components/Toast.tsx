import React, { useState, useEffect, useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// REACT TOAST NOTIFICATION SYSTEM - Dungeon Theme
// ═══════════════════════════════════════════════════════════════════════════════

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

interface ToastItemData {
  id: number
  message: string
  type: ToastType
  duration: number
  action?: ToastAction
}

const ICONS: Record<ToastType, string> = {
  success: '[ \u2713 ]',
  error: '[ \u2620 ]',
  warning: '[ ! ]',
  info: '[ ? ]',
}

const DEFAULT_DURATION = 4000
const REMOVE_ANIMATION_MS = 300

let nextId = 0
let addToastFn: ((item: ToastItemData) => void) | null = null

function createToast(message: string, type: ToastType, duration?: number, action?: ToastAction): void {
  const item: ToastItemData = {
    id: nextId++,
    message,
    type,
    duration: duration ?? DEFAULT_DURATION,
    action,
  }
  addToastFn?.(item)
}

export const toast = {
  success(msg: string, duration?: number, action?: ToastAction): void {
    createToast(msg, 'success', duration, action)
  },
  error(msg: string, duration?: number, action?: ToastAction): void {
    createToast(msg, 'error', duration, action)
  },
  warning(msg: string, duration?: number, action?: ToastAction): void {
    createToast(msg, 'warning', duration, action)
  },
  info(msg: string, duration?: number, action?: ToastAction): void {
    createToast(msg, 'info', duration, action)
  },
}

window.toast = toast

// ─── Individual toast item with its own timer ────────────────────────────────

interface ToastItemProps {
  item: ToastItemData
  onRemove: (id: number) => void
}

function ToastItem({ item, onRemove }: ToastItemProps) {
  const [removing, setRemoving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef(Date.now())
  const remainingRef = useRef(item.duration)
  const progressRef = useRef<HTMLDivElement | null>(null)

  const dismiss = useCallback(() => {
    if (removing) return
    setRemoving(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setTimeout(() => onRemove(item.id), REMOVE_ANIMATION_MS)
  }, [removing, onRemove, item.id])

  const updateProgress = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current
    const pct = Math.max(0, 1 - elapsed / item.duration) * 100
    if (progressRef.current) {
      progressRef.current.style.width = pct + '%'
    }
    if (pct > 0) {
      rafRef.current = requestAnimationFrame(updateProgress)
    }
  }, [item.duration])

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - (item.duration - remainingRef.current)
    timerRef.current = setTimeout(dismiss, remainingRef.current)
    rafRef.current = requestAnimationFrame(updateProgress)
  }, [item.duration, dismiss, updateProgress])

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    remainingRef.current -= Date.now() - startTimeRef.current
  }, [])

  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleActionClick(e: React.MouseEvent): void {
    e.stopPropagation()
    dismiss()
    item.action?.onClick()
  }

  const className = `toast toast--${item.type}${removing ? ' toast-removing' : ''}`

  return (
    <div
      className={className}
      role="status"
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
    >
      <span className="toast-icon">{ICONS[item.type]}</span>
      <div className="toast-content">
        <div className="toast-message">{item.message}</div>
        {item.action && (
          <button className="toast-action" onClick={handleActionClick}>
            {item.action.label}
          </button>
        )}
      </div>
      <button className="toast-close" aria-label="Close" onClick={dismiss}>
        {'\u00d7'}
      </button>
      <div className="toast-progress" ref={progressRef} style={{ width: '100%' }} />
    </div>
  )
}

// ─── Container component ─────────────────────────────────────────────────────

export function Toast() {
  const [items, setItems] = useState<ToastItemData[]>([])

  useEffect(() => {
    addToastFn = (item: ToastItemData) => {
      setItems((prev) => [...prev, item])
    }
    return () => {
      addToastFn = null
    }
  }, [])

  const handleRemove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <ToastItem key={item.id} item={item} onRemove={handleRemove} />
      ))}
    </div>
  )
}
