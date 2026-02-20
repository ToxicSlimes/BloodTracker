# Full React Conversion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert BloodTracker frontend from "React Islands in vanilla JS shell" to a fully React-driven SPA.

**Architecture:** Single React root (`App.tsx`) with custom hash-based `PageRouter`, React context modals, and existing Proxy state (`state.ts` + `useAppState`). No external routing library. All 10 existing React page components are kept as-is. ~23 vanilla JS files deleted after migration.

**Tech Stack:** React 18, TypeScript, Vite, existing Proxy-based reactive state

**Design doc:** `docs/plans/2026-02-17-react-full-conversion-design.md`

---

## Phase 1: React Shell

### Task 1: Create ModalContext

The modal system is needed before any page components can open modals, so it comes first.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/contexts/ModalContext.tsx`
- Test: `src/BloodTracker.Api/wwwroot/js/__tests__/react/ModalContext.test.tsx`

**Step 1: Write the test**

```tsx
// __tests__/react/ModalContext.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ModalProvider, useModal } from '../../react/contexts/ModalContext.js'

function TestOpener() {
  const { openModal, closeModal } = useModal()
  return (
    <button onClick={() => openModal(<div data-testid="modal-content">Hello</div>)}>
      Open
    </button>
  )
}

describe('ModalContext', () => {
  it('opens and closes modal via context', () => {
    render(
      <ModalProvider>
        <TestOpener />
      </ModalProvider>
    )
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByTestId('modal-content')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd src/BloodTracker.Api/wwwroot && npx vitest run __tests__/react/ModalContext.test.tsx`
Expected: FAIL — module not found

**Step 3: Write implementation**

```tsx
// react/contexts/ModalContext.tsx
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalContextValue {
  openModal: (content: ReactNode) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be inside ModalProvider')
  return ctx
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ReactNode | null>(null)

  const openModal = useCallback((content: ReactNode) => {
    setModal(content)
    document.body.classList.add('modal-open')
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    document.body.classList.remove('modal-open')
  }, [])

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {modal && createPortal(
        <div className="modal-overlay active" onClick={(e) => {
          if (e.target === e.currentTarget) closeModal()
        }}>
          {modal}
        </div>,
        document.body
      )}
    </ModalContext.Provider>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `cd src/BloodTracker.Api/wwwroot && npx vitest run __tests__/react/ModalContext.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/contexts/ModalContext.tsx src/BloodTracker.Api/wwwroot/js/__tests__/react/ModalContext.test.tsx
git commit -m "feat: add ModalContext with open/close via React portal"
```

---

### Task 2: Create Toast React Component

Replace vanilla `toast.ts` with a React component that exposes the same `toast.success/error/warning/info()` module-level API so existing React pages don't need changes.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/components/Toast.tsx`
- Test: `src/BloodTracker.Api/wwwroot/js/__tests__/react/Toast.test.tsx`

**Step 1: Write the test**

```tsx
// __tests__/react/Toast.test.tsx
import { render, screen, act } from '@testing-library/react'
import { Toast, toast } from '../../react/components/Toast.js'

describe('Toast', () => {
  it('shows success toast via module API', () => {
    render(<Toast />)
    act(() => { toast.success('Saved!') })
    expect(screen.getByText('Saved!')).toBeInTheDocument()
  })

  it('shows multiple toasts', () => {
    render(<Toast />)
    act(() => {
      toast.success('One')
      toast.error('Two')
    })
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd src/BloodTracker.Api/wwwroot && npx vitest run __tests__/react/Toast.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```tsx
// react/components/Toast.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration: number
  action?: { label: string; onClick: () => void }
}

const ICONS: Record<string, string> = {
  success: '[ ✓ ]', error: '[ ☠ ]', warning: '[ ! ]', info: '[ ? ]'
}

let addToastFn: ((item: Omit<ToastItem, 'id'>) => void) | null = null
let nextId = 0

export const toast = {
  success: (msg: string, duration = 4000, action?: ToastItem['action']) =>
    addToastFn?.({ message: msg, type: 'success', duration, action }),
  error: (msg: string, duration = 4000, action?: ToastItem['action']) =>
    addToastFn?.({ message: msg, type: 'error', duration, action }),
  warning: (msg: string, duration = 4000, action?: ToastItem['action']) =>
    addToastFn?.({ message: msg, type: 'warning', duration, action }),
  info: (msg: string, duration = 4000, action?: ToastItem['action']) =>
    addToastFn?.({ message: msg, type: 'info', duration, action }),
}

// Keep window.toast for backward compat during transition
;(window as any).toast = toast

export function Toast() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    addToastFn = (item) => {
      setItems(prev => [...prev, { ...item, id: nextId++ }])
    }
    return () => { addToastFn = null }
  }, [])

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {items.map(t => (
        <ToastItem key={t.id} item={t} onRemove={remove} />
      ))}
    </div>
  )
}

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const [removing, setRemoving] = useState(false)

  const dismiss = useCallback(() => {
    setRemoving(true)
    setTimeout(() => onRemove(item.id), 300)
  }, [item.id, onRemove])

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, item.duration)
    return () => clearTimeout(timerRef.current)
  }, [item.duration, dismiss])

  const pause = () => clearTimeout(timerRef.current)
  const resume = () => { timerRef.current = setTimeout(dismiss, 1000) }

  return (
    <div
      className={`toast toast--${item.type}${removing ? ' toast-removing' : ''}`}
      role="status"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      <span className="toast-icon">{ICONS[item.type]}</span>
      <div className="toast-content">
        <div className="toast-message">{item.message}</div>
        {item.action && (
          <button className="toast-action" onClick={() => { dismiss(); item.action!.onClick() }}>
            {item.action.label}
          </button>
        )}
      </div>
      <button className="toast-close" aria-label="Close" onClick={dismiss}>&times;</button>
    </div>
  )
}
```

**Step 4: Run test**

Run: `cd src/BloodTracker.Api/wwwroot && npx vitest run __tests__/react/Toast.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/Toast.tsx src/BloodTracker.Api/wwwroot/js/__tests__/react/Toast.test.tsx
git commit -m "feat: React Toast component with module-level API"
```

---

### Task 3: Create LoginPage React Component

Port `pages/login.ts` to React. Handles Google OAuth + email magic code.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/pages/LoginPage.tsx`

**Step 1: Write the component**

```tsx
// react/pages/LoginPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { API_URL } from '../../config.js'
import { ENDPOINTS } from '../../endpoints.js'
import { auth } from '../../auth.js'

const LOGIN_ASCII = `╔════════════════════════════════════════════════╗
║                                                ║
║   ███████╗███╗   ██╗████████╗███████╗██████╗   ║
║   ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗   ║
║   █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝   ║
║   ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗   ║
║   ███████╗██║ ╚████║   ██║   ███████╗██║  ██║  ║
║   ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ║
║                                                ║
║             T H E   D U N G E O N              ║
║                                                ║
╚════════════════════════════════════════════════╝`

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [googleReady, setGoogleReady] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Initialize Google Sign-In
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.config}`)
        if (!res.ok) return
        const config = await res.json()
        if (config.googleClientId && (window as any).google?.accounts?.id) {
          ;(window as any).google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: handleGoogleCredential,
          })
          if (googleBtnRef.current) {
            ;(window as any).google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard', theme: 'filled_black', size: 'large', text: 'signin_with', width: 400,
            })
          }
          setGoogleReady(true)
        }
      } catch { /* Google not available */ }
    })()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [countdown > 0]) // only restart when transitions from 0→positive

  const handleAuthResponse = useCallback(async (data: any) => {
    if (data.token && data.user) {
      auth.setSession(data.token, data.user)
      sessionStorage.removeItem('_bt_rl')
      window.location.reload()
    }
  }, [])

  const handleGoogleCredential = useCallback(async (response: any) => {
    try {
      const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.google}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'Ошибка авторизации Google')
        return
      }
      await handleAuthResponse(await res.json())
    } catch { setError('Ошибка подключения к серверу') }
  }, [handleAuthResponse])

  const sendCode = async () => {
    if (!email.trim()) { setError('Введите email'); return }
    setSending(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.sendCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'Ошибка отправки кода')
        setSending(false); return
      }
      const data = await res.json().catch(() => ({}))
      setStep('code')
      if (data.devCode) { setCode(data.devCode); setCodeError('⚠ SMTP недоступен — код подставлен автоматически') }
      setCountdown(600)
    } catch { setError('Ошибка подключения к серверу') }
    setSending(false)
  }

  const verifyCode = async () => {
    if (!code.trim() || code.length !== 6) { setCodeError('Введите 6-значный код'); return }
    setVerifying(true); setCodeError('')
    try {
      const res = await fetch(`${API_URL}/api/v1${ENDPOINTS.auth.verifyCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setCodeError(err.error || 'Неверный или просроченный код')
        setVerifying(false); return
      }
      await handleAuthResponse(await res.json())
    } catch { setCodeError('Ошибка подключения к серверу') }
    setVerifying(false)
  }

  const backToEmail = () => {
    setStep('email'); clearInterval(timerRef.current); setSending(false)
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="login-overlay">
      <div className="login-container">
        <pre className="login-ascii">{LOGIN_ASCII}</pre>

        {step === 'email' ? (
          <div className="login-form">
            {googleReady && (
              <>
                <div className="google-btn-wrapper">
                  <button className="login-btn login-btn-google" type="button">
                    {/* Google SVG icon */}
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    [ ВОЙТИ ЧЕРЕЗ GOOGLE ]
                  </button>
                  <div ref={googleBtnRef} className="google-btn-overlay" />
                </div>
                <div className="login-divider"><span>или</span></div>
              </>
            )}
            <div className="login-field">
              <label>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" autoComplete="email"
                onKeyDown={e => e.key === 'Enter' && sendCode()}
              />
            </div>
            <button className="login-btn login-btn-primary" disabled={sending} onClick={sendCode}>
              {sending ? '[ ОТПРАВКА... ]' : '[ ОТПРАВИТЬ КОД ]'}
            </button>
            {error && <div className="login-error" style={{ display: 'block' }}>{error}</div>}
          </div>
        ) : (
          <div className="login-form">
            <p className="login-hint">Код отправлен на <strong>{email}</strong></p>
            <div className="login-field">
              <label>Код подтверждения</label>
              <input
                type="text" value={code} onChange={e => setCode(e.target.value)}
                placeholder="000000" maxLength={6} autoComplete="one-time-code"
                inputMode="numeric" pattern="[0-9]*"
                onKeyDown={e => e.key === 'Enter' && verifyCode()}
                autoFocus
              />
            </div>
            <button className="login-btn login-btn-primary" disabled={verifying} onClick={verifyCode}>
              {verifying ? '[ ПРОВЕРКА... ]' : '[ ПОДТВЕРДИТЬ ]'}
            </button>
            <button className="login-btn login-btn-secondary" onClick={backToEmail}>[ НАЗАД ]</button>
            {countdown > 0 && <div className="login-timer">Код действителен: {fmtTime(countdown)}</div>}
            {countdown === 0 && step === 'code' && <div className="login-timer">Код истёк. Запросите новый.</div>}
            {codeError && <div className="login-error" style={{ display: 'block' }}>{codeError}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/LoginPage.tsx
git commit -m "feat: React LoginPage with Google OAuth + email magic code"
```

---

### Task 4: Create useAuth Hook

Simple hook that checks `auth.isLoggedIn()` and listens for `bt:unauthorized` event.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/hooks/useAuth.ts`

**Step 1: Write the hook**

```ts
// react/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { auth } from '../../auth.js'

export function useAuth(): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState(auth.isLoggedIn())

  useEffect(() => {
    const handler = () => setIsAuthenticated(false)
    window.addEventListener('bt:unauthorized', handler)
    return () => window.removeEventListener('bt:unauthorized', handler)
  }, [])

  return isAuthenticated
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/hooks/useAuth.ts
git commit -m "feat: useAuth hook bridging auth.ts to React"
```

---

### Task 5: Create Navigation React Component

Port `components/navigation.ts` nav-bar rendering to React. Reads `state.currentPage` via `useAppState`, updates it on click.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/components/Navigation.tsx`

**Step 1: Write the component**

Note: `state.currentPage` is NOT in AppState yet. We need to add it.

First, add `currentPage` to `state.ts`:

In `src/BloodTracker.Api/wwwroot/js/state.ts`, add to `AppState` interface:
```ts
currentPage: string
```

And to `initialState`:
```ts
currentPage: 'dashboard'
```

Then the component:

```tsx
// react/components/Navigation.tsx
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
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/Navigation.tsx src/BloodTracker.Api/wwwroot/js/state.ts
git commit -m "feat: React Navigation component + currentPage in state"
```

---

### Task 6: Create PageRouter Component

Routes `state.currentPage` to the correct React page component.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/components/PageRouter.tsx`

**Step 1: Write the component**

```tsx
// react/components/PageRouter.tsx
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

// ASCII Art Studio stays as vanilla DOM (no React port needed)
function AsciiStudioPage() {
  useEffect(() => {
    const el = document.getElementById('ascii-art-studio-root')
    if (el) {
      import('../../components/asciiArtUI.js').then(({ initAsciiArtUI }) => {
        initAsciiArtUI('ascii-art-studio-root')
      })
    }
  }, [])
  return <div id="ascii-art-studio-root" />
}

const PAGES: Record<string, React.LazyExoticComponent<React.ComponentType> | React.ComponentType> = {
  dashboard: DashboardPage,
  analyses: AnalysesPage,
  compare: ComparePage,
  course: CoursePage,
  workouts: WorkoutsPage,
  encyclopedia: EncyclopediaPage,
  admin: AdminPage,
  'ascii-studio': AsciiStudioPage,
}

export default function PageRouter() {
  const currentPage = useAppState('currentPage')

  // Hash sync: listen for hashchange and update state
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.slice(1)
      if (!hash) return
      // Virtual routes
      if (hash === 'active-workout' || hash === 'workout-diary') {
        state.currentPage = 'workouts'
        state.workoutSubTab = hash === 'workout-diary' ? 'history' : 'training'
      } else if (hash in PAGES) {
        state.currentPage = hash
      }
    }
    window.addEventListener('hashchange', handler)
    // Handle initial hash on mount
    if (window.location.hash) handler()
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const Page = PAGES[currentPage] || DashboardPage

  return (
    <Suspense fallback={<div className="loading">Загрузка...</div>}>
      <Page />
    </Suspense>
  )
}
```

Note: `WorkoutsPage` doesn't exist yet — it's the container with 4 sub-tabs. Create it in Task 7.

Also add `workoutSubTab` to `state.ts` AppState:
```ts
workoutSubTab: string  // 'training' | 'history' | 'programs' | 'analytics'
```
Default: `'training'`

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/PageRouter.tsx src/BloodTracker.Api/wwwroot/js/state.ts
git commit -m "feat: PageRouter with lazy loading + hash sync"
```

---

### Task 7: Create WorkoutsPage (Sub-tab Container)

The workouts page has 4 sub-tabs: Training, History, Programs, Analytics. Currently this is HTML in `index.html` + vanilla JS tab switching. Convert to React.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutsPage.tsx`

**Step 1: Write the component**

```tsx
// react/pages/WorkoutsPage.tsx
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
]

const TAB_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  training: ActiveWorkoutTab,
  history: WorkoutHistoryTab,
  programs: WorkoutProgramsTab,
  analytics: WorkoutAnalyticsTab,
}

export default function WorkoutsPage() {
  const subTab = useAppState('workoutSubTab')
  const activeTab = subTab || 'training'
  const TabComponent = TAB_COMPONENTS[activeTab] || ActiveWorkoutTab

  return (
    <div>
      <div className="workout-hub-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`workout-hub-tab${activeTab === t.id ? ' active' : ''}`}
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
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutsPage.tsx
git commit -m "feat: WorkoutsPage with 4 sub-tabs as React"
```

---

### Task 8: Create RestTimer React Component

Port `components/restTimer.ts` to React. Fixed bottom bar with Web Audio beep.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/components/RestTimer.tsx`

**Step 1: Write the component**

```tsx
// react/components/RestTimer.tsx
import React, { useEffect, useRef, useCallback } from 'react'
import { useAppState } from '../hooks/useAppState.js'
import { state } from '../../state.js'
import { workoutSessionsApi } from '../../api.js'

let audioContext: AudioContext | null = null

function playSound() {
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') return
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  osc.connect(gain); gain.connect(audioContext.destination)
  osc.frequency.value = 800; osc.type = 'sine'
  gain.gain.setValueAtTime(0.3, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
  osc.start(audioContext.currentTime); osc.stop(audioContext.currentTime + 0.3)
}

export async function startRestTimer(durationSeconds?: number): Promise<void> {
  let seconds = durationSeconds
  let playSoundFlag = true, vibrate = true
  if (seconds === undefined) {
    try {
      const settings = await workoutSessionsApi.getRestTimerSettings() as any
      playSoundFlag = settings.playSound; vibrate = settings.vibrate
      if (!settings.autoStartTimer) return
      seconds = settings.defaultRestSeconds
    } catch { seconds = 90 }
  }
  if (seconds === undefined) seconds = 90
  state.restTimerState = {
    isRunning: true, remainingSeconds: seconds, totalSeconds: seconds,
    startTime: Date.now(), pausedAt: undefined, playSound: playSoundFlag, vibrate,
  }
}

export function stopTimer(): void {
  state.restTimerState = { isRunning: false, remainingSeconds: 0, totalSeconds: 90 }
}

export default function RestTimer() {
  const timer = useAppState('restTimerState')
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!timer.isRunning) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      if (!state.restTimerState.isRunning || state.restTimerState.pausedAt) return
      const elapsed = Math.floor((Date.now() - (state.restTimerState.startTime || 0)) / 1000)
      const remaining = Math.max(0, state.restTimerState.totalSeconds - elapsed)
      state.restTimerState = { ...state.restTimerState, remainingSeconds: remaining }
      if (remaining <= 0) {
        if (state.restTimerState.vibrate !== false && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
        if (state.restTimerState.playSound !== false) playSound()
        stopTimer()
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Отдых завершён', { body: 'Время начать следующий подход', icon: '/icon-192.png', tag: 'rest-timer' })
        }
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [timer.isRunning])

  if (!timer.isRunning) return null

  const mins = Math.floor(timer.remainingSeconds / 60)
  const secs = timer.remainingSeconds % 60
  const isAlert = timer.remainingSeconds <= 5

  const toggle = () => {
    if (state.restTimerState.pausedAt) {
      const pausedDuration = Date.now() - state.restTimerState.pausedAt
      state.restTimerState = { ...state.restTimerState, startTime: (state.restTimerState.startTime || 0) + pausedDuration, pausedAt: undefined }
    } else {
      state.restTimerState = { ...state.restTimerState, pausedAt: Date.now() }
    }
  }

  const adjust = (delta: number) => {
    const newR = Math.max(0, timer.remainingSeconds + delta)
    const elapsed = timer.totalSeconds - timer.remainingSeconds
    state.restTimerState = { ...state.restTimerState, totalSeconds: elapsed + newR, remainingSeconds: newR, startTime: Date.now() - (elapsed * 1000) }
  }

  return (
    <div className={`rest-timer-bar active${isAlert ? ' alert' : ''}`}>
      <div className="rest-timer-display">
        <div>
          <div className="rest-timer-label">Отдых</div>
          <div className="rest-timer-time" role="timer" aria-live="polite">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
        </div>
        <div className="rest-timer-label">{timer.remainingSeconds}s / {timer.totalSeconds}s</div>
      </div>
      <div className="rest-timer-controls">
        <button className="rest-timer-btn" onClick={toggle}>
          {timer.pausedAt ? 'ПРОДОЛЖИТЬ' : 'ПАУЗА'}
        </button>
        <button className="rest-timer-btn" onClick={stopTimer}>ПРОПУСТИТЬ</button>
        <button className="rest-timer-btn" onClick={() => adjust(-15)}>-15s</button>
        <button className="rest-timer-btn" onClick={() => adjust(30)}>+30s</button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/RestTimer.tsx
git commit -m "feat: React RestTimer with Web Audio + Notifications"
```

---

### Task 9: Create WorkoutMiniBar React Component

Shows when navigating away from active workout. Displays elapsed time + set count.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/components/WorkoutMiniBar.tsx`

**Step 1: Write the component**

```tsx
// react/components/WorkoutMiniBar.tsx
import React, { useEffect, useState } from 'react'
import { useAppState } from '../hooks/useAppState.js'
import { state } from '../../state.js'

export default function WorkoutMiniBar() {
  const session = useAppState('activeWorkoutSession')
  const currentPage = useAppState('currentPage')
  const subTab = useAppState('workoutSubTab')
  const [, setTick] = useState(0)

  // Tick every second for elapsed time
  useEffect(() => {
    if (!session) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [session])

  // Hide on training tab
  const isOnTraining = currentPage === 'workouts' && (subTab === 'training')
  if (!session || isOnTraining) return null

  const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const totalSets = session.exercises.reduce((s: number, ex: any) => s + ex.sets.length, 0)
  const completedSets = session.exercises.reduce((s: number, ex: any) => s + ex.sets.filter((st: any) => st.completedAt).length, 0)

  const goBack = () => {
    state.currentPage = 'workouts'
    state.workoutSubTab = 'training'
  }

  return (
    <div className="workout-mini-bar active">
      <div className="workout-mini-bar-info">
        <span className="workout-mini-bar-title">{session.title}</span>
        <span className="workout-mini-bar-stats">{timeStr} · {completedSets}/{totalSets} подходов</span>
      </div>
      <button className="btn btn-primary workout-mini-bar-btn" onClick={goBack}>ВЕРНУТЬСЯ</button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/WorkoutMiniBar.tsx
git commit -m "feat: React WorkoutMiniBar with elapsed time display"
```

---

### Task 10: Create PRCelebration React Component

Port `components/prCelebration.ts` — golden glow overlay on new PR.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/components/PRCelebration.tsx`

**Step 1: Write the component**

```tsx
// react/components/PRCelebration.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { PRDetailDto } from '../../types/workouts.js'

const RECORD_TYPE_LABELS: Record<string, string> = {
  MaxWeight: 'Максимальный вес',
  MaxEstimated1RM: 'Расчётный 1RM',
  MaxRepAtWeight: 'Максимум повторений',
}

interface PREvent { prs: PRDetailDto[]; exerciseName: string }

let showPRFn: ((event: PREvent) => void) | null = null

export function showPRCelebration(prs: PRDetailDto[], exerciseName: string): void {
  showPRFn?.({ prs, exerciseName })
  if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 200])
}

export default function PRCelebration() {
  const [event, setEvent] = useState<PREvent | null>(null)
  const [active, setActive] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    showPRFn = (e) => {
      setEvent(e)
      setTimeout(() => setActive(true), 50)
      timerRef.current = setTimeout(dismiss, 5000)
    }
    return () => { showPRFn = null }
  }, [])

  const dismiss = useCallback(() => {
    setActive(false)
    clearTimeout(timerRef.current)
    setTimeout(() => setEvent(null), 300)
  }, [])

  if (!event) return null

  return (
    <div id="pr-celebration-container">
      <div className={`pr-celebration-modal${active ? ' active' : ''}${!active && event ? ' closing' : ''}`}>
        <div className="pr-celebration-content">
          <div className="pr-celebration-title">НОВЫЙ РЕКОРД!</div>
          <div className="pr-celebration-exercise">{event.exerciseName}</div>
          {event.prs.slice(0, 3).map((pr, i) => (
            <div key={i} className="pr-celebration-detail">
              <div className="pr-celebration-detail-label">{RECORD_TYPE_LABELS[pr.recordType] || pr.recordType}</div>
              <div className="pr-celebration-detail-change">
                Было: {pr.previousValue !== null ? pr.previousValue.toFixed(1) : '—'} → Стало: {pr.value.toFixed(1)}
              </div>
              <div className="pr-celebration-detail-improvement">Улучшение: +{pr.improvementPercent.toFixed(1)}%</div>
            </div>
          ))}
          <button className="pr-celebration-btn" onClick={dismiss}>NICE!</button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/PRCelebration.tsx
git commit -m "feat: React PRCelebration overlay component"
```

---

### Task 11: Create AppShell + UserInfo Components

Wraps authenticated app: header, navigation, user info, color picker, effects, page router, and all global components.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/components/AppShell.tsx`

**Step 1: Write the component**

```tsx
// react/components/AppShell.tsx
import React, { useEffect } from 'react'
import Navigation from './Navigation.js'
import PageRouter from './PageRouter.js'
import { Toast } from './Toast.js'
import RestTimer from './RestTimer.js'
import WorkoutMiniBar from './WorkoutMiniBar.js'
import PRCelebration from './PRCelebration.js'
import { ModalProvider } from '../contexts/ModalContext.js'
import { auth } from '../../auth.js'
import { state } from '../../state.js'
import { api, workoutSessionsApi } from '../../api.js'
import { ENDPOINTS } from '../../endpoints.js'
import { loadSavedColor, loadSavedFont } from '../../components/color-picker.js'
import { escapeHtml } from '../../utils.js'

export default function AppShell() {
  // Initialize app on mount
  useEffect(() => {
    loadSavedColor()
    loadSavedFont()

    // Parallel data loading
    Promise.all([
      api(ENDPOINTS.referenceRanges.list).then((r: any) => {
        state.referenceRanges = Object.fromEntries(r.map((x: any) => [x.key, x]))
      }),
      api(ENDPOINTS.analyses.list).then((a: any) => { state.analyses = a }),
      api(ENDPOINTS.drugs.list).then((d: any) => { state.drugs = d }),
      api(ENDPOINTS.intakeLogs.list + '?count=20').then((l: any) => { state.intakeLogs = l }),
      api(ENDPOINTS.courses.dashboard).then((d: any) => {
        state.currentCourse = d.activeCourse
        state.drugs = d.drugs
        state.dashboardStats = { analysesCount: d.analysesCount, lastAnalysisDate: d.lastAnalysisDate ?? null }
      }),
    ]).catch(console.error)

    // Check active workout session
    workoutSessionsApi.getActive().then((s: any) => {
      if (s) state.activeWorkoutSession = s
    }).catch(console.error)

    // Effects
    initEffects()
  }, [])

  const user = auth.getUser()
  const isImpersonating = auth.isImpersonating()

  return (
    <ModalProvider>
      <div className="app crt-text scanline-move">
        <header>
          <div className="header-content">
            <div className="ascii-header-block">
              {/* ASCII header rendered by CSS / existing HTML — keep in index.html */}
              <div id="ascii-skeleton-strip" />
            </div>
            <Navigation />
          </div>
        </header>

        {user && (
          <div className="user-info" style={{ display: 'flex' }}>
            <span className="user-email">{user.displayName || user.email}</span>
            <div className="offline-badge" aria-live="polite">⚡ OFFLINE</div>
            <button className="logout-btn" onClick={() => auth.logout()}>[ ВЫХОД ]</button>
          </div>
        )}

        {isImpersonating && (
          <div className="impersonation-banner">
            <span>Просмотр данных: <strong>{user?.email || 'unknown'}</strong></span>
            <button className="impersonation-exit-btn" onClick={() => auth.stopImpersonation()}>[ ВЫЙТИ ]</button>
          </div>
        )}

        <PageRouter />
        <WorkoutMiniBar />
        <RestTimer />
        <Toast />
        <PRCelebration />
      </div>
    </ModalProvider>
  )
}

function initEffects() {
  // Sparks
  import('../../effects/sparks.js').then(({ startSparkAnimation }) => {
    setTimeout(startSparkAnimation, 500)
  }).catch(console.error)

  // Matrix runes
  import('../../effects/matrix-runes.js').then(({ startMatrixRunes }) => {
    startMatrixRunes()
  }).catch(console.error)

  // Progress bar
  import('../../effects/progress-bar.js').then(({ initProgressBar }) => {
    initProgressBar()
  }).catch(console.error)

  // ASCII skull on dashboard
  const strip = document.getElementById('ascii-skeleton-strip')
  if (strip) {
    import('../../effects/ascii-art.js').then(({ renderAsciiSkull, scaleAsciiSkull }) => {
      strip.insertAdjacentHTML('afterbegin', renderAsciiSkull())
      setTimeout(scaleAsciiSkull, 100)
    }).catch(console.error)
  }

  // ASCIIfy text renderer
  if ((window as any).asciify) {
    (window as any).asciify.init()
  }

  // Decorative runes
  initRunes()
}

function initRunes() {
  const runes = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ']
  const positions = ['rune-top','rune-bottom','rune-left','rune-right','rune-corner-tl','rune-corner-tr','rune-corner-bl','rune-corner-br']
  positions.forEach((pos, i) => {
    const el = document.createElement('div')
    el.className = `rune ${pos}`
    el.textContent = runes[Math.floor(Math.random() * runes.length)]
    el.style.animationDelay = `${i * 0.5 + Math.random() * 2}s`
    document.body.appendChild(el)
  })
  setInterval(() => {
    document.querySelectorAll('.rune').forEach(r => {
      r.textContent = runes[Math.floor(Math.random() * runes.length)]
    })
  }, 8000)
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/components/AppShell.tsx
git commit -m "feat: AppShell — authenticated app wrapper with effects + data loading"
```

---

### Task 12: Create App.tsx Root Component

The single React root. Auth gate: shows `LoginPage` or `AppShell`.

**Files:**
- Create: `src/BloodTracker.Api/wwwroot/js/react/App.tsx`

**Step 1: Write the component**

```tsx
// react/App.tsx
import React from 'react'
import { useAuth } from './hooks/useAuth.js'
import LoginPage from './pages/LoginPage.js'
import AppShell from './components/AppShell.js'

export default function App() {
  const isAuthenticated = useAuth()

  if (!isAuthenticated) return <LoginPage />
  return <AppShell />
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/App.tsx
git commit -m "feat: App.tsx root component with auth gate"
```

---

## Phase 2: Wire Up + Simplify

### Task 13: Rewrite main.ts to Mount React Root

Replace the 600-line main.ts with a minimal React mount. Keep CSS imports, ASCII engine imports, and SW registration.

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/main.ts`

**Step 1: Replace main.ts**

```ts
// ── CSS bundle (Vite extracts into dist/css/style.css) ──
import '../css/variables.css'
import '../css/base.css'
import '../css/animations.css'
import '../css/layout.css'
import '../css/ascii-art.css'
import '../css/effects.css'
import '../css/components.css'
import '../css/tables.css'
import '../css/modals.css'
import '../css/toast.css'
import '../css/skeleton.css'
import '../css/ascii-engine.css'
import '../css/asciify.css'
import '../css/auth.css'
import '../css/admin.css'
import '../css/catalog.css'
import '../css/mobile.css'
import '../css/offline.css'
import '../css/workout-diary.css'

// ASCII engines (init before React mount)
import './components/asciiEngine.js'
import './components/asciifyEngine.js'

// Color picker (framework-agnostic, stays as utility)
import { loadSavedColor } from './components/color-picker.js'

// Mount React app
import { createRoot } from 'react-dom/client'
import App from './react/App.js'

// Pre-load color before React renders (prevents flash)
loadSavedColor()

const container = document.getElementById('app')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}

// ── Service Worker ──
import { toast } from './react/components/Toast.js'

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            toast.info('Доступно обновление!', 30000, {
              label: '[ ОБНОВИТЬ ]',
              onClick: () => { reg.waiting?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload() }
            })
          }
        })
      })
    })
    .catch(err => console.error('[SW] Registration failed:', err))
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_COMPLETE') {
      toast.success(`Синхронизировано: ${event.data.processed} действий`)
    }
  })
}

// Online/Offline
window.addEventListener('online', () => {
  document.body.classList.remove('offline')
  toast.success('Подключение восстановлено')
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(reg => (reg as any).sync?.register('sync-mutations').catch(() => {}))
  }
})
window.addEventListener('offline', () => {
  document.body.classList.add('offline')
  toast.warning('Вы офлайн. Данные могут быть устаревшими.')
})
if (!navigator.onLine) document.body.classList.add('offline')

registerServiceWorker()
```

**Step 2: Verify Vite builds**

Run: `cd src/BloodTracker.Api/wwwroot && npx vite build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/main.ts
git commit -m "feat: simplify main.ts — mount React root, keep CSS + SW"
```

---

### Task 14: Simplify index.html

Remove all `<div class="page">` containers, all `<div class="modal-overlay">` modals, navigation HTML, user-info HTML, workout mini-bar HTML, and quick-set-logger container. Keep: `<div id="app">`, effects overlays, anti-reload-loop script, Google GSI script, ApexCharts CDN.

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/index.html`

**Step 1: Rewrite index.html**

The new index.html should contain:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BloodTracker</title>
    <meta name="google-client-id" content="118121261230-dtj72qp42r44mgpdbng83a1bju3oj87t.apps.googleusercontent.com">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#00ff00">
    <link rel="apple-touch-icon" href="/icons/icon-192.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="stylesheet" href="dist/css/style.css?v=20260217a">
</head>
<body class="crt">
<div class="flicker-overlay"></div>
<div class="vignette-overlay"></div>
<div class="noise-overlay"></div>
<div class="ascii-progress-bar" id="ascii-progress-bar">
    <div class="progress-bar-content">
        <div class="progress-bar-frame">
            <div class="progress-bar-fill" id="progress-bar-fill"></div>
            <div class="progress-bar-text" id="progress-bar-text">0%</div>
        </div>
    </div>
</div>
<div class="torch torch-left">
    <!-- keep existing torch ASCII art -->
</div>
<div class="torch torch-right">
    <!-- keep existing torch ASCII art -->
</div>

<!-- React app root -->
<div id="app"></div>

<!-- Rest Timer container (rendered by React, needs bottom-level DOM node) -->
<div id="rest-timer-container"></div>

<!-- Anti-reload-loop guard -->
<script>
(function() {
    var key = '_bt_rl', now = Date.now();
    var last = parseInt(sessionStorage.getItem(key) || '0');
    if (now - last < 3000) {
        localStorage.removeItem('bt_token');
        localStorage.removeItem('bt_user');
        sessionStorage.removeItem(key);
        return;
    }
    sessionStorage.setItem(key, String(now));
    setTimeout(function() { sessionStorage.removeItem(key); }, 5000);
})();
</script>

<!-- Google Sign-In -->
<script>
    window.initGoogleSignIn = function() {
        const clientId = document.querySelector('meta[name="google-client-id"]')?.content;
        if (clientId && window.google?.accounts?.id) {
            google.accounts.id.initialize({ client_id: clientId, callback: window.handleGoogleCredential });
        }
    };
</script>
<script src="https://accounts.google.com/gsi/client" async defer onload="initGoogleSignIn()"></script>

<!-- ApexCharts -->
<script src="https://cdn.jsdelivr.net/npm/apexcharts@3.45.1/dist/apexcharts.min.js"></script>

<!-- JavaScript Module -->
<script type="module" src="dist/js/main.js?v=20260217a"></script>
</body>
</html>
```

**Key changes:**
- Removed ~500 lines of static HTML (all page divs, all modals, nav buttons, user-info, color-picker inline HTML, workout hub tabs, mini-bar, research modal, quick-set-logger container)
- Kept: effect overlays, torches, `<div id="app">`, inline scripts, CDN scripts
- The ASCII header block moves into `AppShell.tsx` (or stays minimal in index.html)

**Important:** The color picker HTML was inline in index.html. It either needs to become a React component or remain as a utility that appends to DOM. For now, keep the color-picker as a vanilla utility (`color-picker.ts` stays) — it appends its own DOM. The `toggleColorPicker`, `setColor`, `setFont` functions are exposed via `window` by `color-picker.ts`.

**Step 2: Verify the app loads in browser**

Run: `cd src/BloodTracker.Api && dotnet run`
Navigate to `http://localhost:5000`
Expected: Login page renders (or app if already logged in)

**Step 3: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/index.html
git commit -m "feat: simplify index.html — React renders all UI"
```

---

## Phase 3: Update Existing React Pages

### Task 15: Remove `window.*` Modal Bridges from React Pages

Existing React pages call vanilla modals via `(window as any).openDrugModal()`, etc. These need to either:
1. Use React modals via `useModal()` context, OR
2. Keep calling vanilla modals temporarily until Phase 4 ports them

**Strategy:** For Phase 3, add inline React modals directly in each page component that needs them (simple form modals). Complex modals (DrugModal with catalog dropdown) can use inline state first and be extracted to shared components later.

**This is the largest phase and should be broken into sub-tasks per page.**

For now, the existing React pages will continue working because:
- They import from `../../api.js`, `../../state.js`, etc. — unchanged
- Modal calls via `window.*` will break since vanilla modals are removed from HTML
- **Fix:** Add `useModal()` + inline modal JSX to each page that opens modals

**Files to modify:**
- `react/pages/DashboardPage.tsx` — calls `openAnalysisModal`, `openPdfImportModal`
- `react/pages/CoursePage.tsx` — calls `openDrugModal`, `openLogModal`, `openPurchaseModal`
- `react/pages/AnalysesPage.tsx` — calls `openAnalysisModal`, `openPdfImportModal`
- `react/pages/EncyclopediaPage.tsx` — calls `openResearchModal`
- `react/pages/WorkoutProgramsTab.tsx` — calls workout CRUD modals
- `react/pages/ActiveWorkoutTab.tsx` — calls `startRestTimer`, `showPRCelebration`

**For each page, the pattern is:**
1. Remove `(window as any).openXxxModal()` calls
2. Add local `const [showModal, setShowModal] = useState(false)` + inline modal JSX
3. Or use `useModal()` context if shared modal component exists

**This task is intentionally left high-level.** Each page conversion is 1 sub-task, estimated at 15-30 min each. The engineer should read the existing page code, identify all `window.*` calls, and replace them with React equivalents.

**Step 1: Update ActiveWorkoutTab.tsx imports**

Replace:
```ts
import { startRestTimer } from '../../components/restTimer.js'
import { showPRCelebration } from '../../components/prCelebration.js'
```
With:
```ts
import { startRestTimer } from '../components/RestTimer.js'
import { showPRCelebration } from '../components/PRCelebration.js'
```

**Step 2: Commit per page**

Each page gets its own commit: `refactor: DashboardPage — use React modals instead of window.*`

---

### Task 16: Create Shared React Modal Components

For modals used by multiple pages, create shared components:

**Files to create:**
- `react/modals/AnalysisModal.tsx` — create/edit analysis (used by Dashboard + Analyses pages)
- `react/modals/DrugModal.tsx` — create/edit drug with catalog dropdown (used by Course page)
- `react/modals/IntakeLogModal.tsx` — create/edit intake log (used by Course page)
- `react/modals/PurchaseModal.tsx` — create/edit purchase (used by Course page)
- `react/modals/PdfImportModal.tsx` — PDF file upload + Gemini OCR (used by Dashboard + Analyses)
- `react/modals/ResearchModal.tsx` — PubMed + Gemini research (used by Encyclopedia)
- `react/modals/WorkoutProgramModal.tsx` — create/edit workout program
- `react/modals/WorkoutDayModal.tsx` — create/edit workout day
- `react/modals/WorkoutExerciseModal.tsx` — create/edit workout exercise
- `react/modals/WorkoutSetModal.tsx` — create/edit workout set

**Each modal follows this pattern:**

```tsx
interface XxxModalProps {
  editId?: string | null  // null = create, string = edit
  onSave: () => void
  onClose: () => void
}

function XxxModal({ editId, onSave, onClose }: XxxModalProps) {
  // Load existing data if editId
  // Form state with useState
  // Submit via api.ts
  // Call onSave + onClose on success
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-header">...</div>
      <div className="modal-body">...</div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn" onClick={handleSave}>[ СОХРАНИТЬ ]</button>
      </div>
    </div>
  )
}
```

**DrugModal is the most complex** — has catalog substance dropdown with category grouping, keyboard navigation, manufacturer dropdown. Port the logic from `modals.ts` lines 48-200.

**This task creates the modal files.** Task 15 wires them into pages.

**Order:** Create simple modals first (WorkoutProgramModal, WorkoutDayModal, WorkoutSetModal), then medium (IntakeLogModal, PurchaseModal), then complex (DrugModal, AnalysisModal, PdfImportModal, ResearchModal).

---

## Phase 4: Cleanup

### Task 17: Delete Old Vanilla JS Files

After all pages render via React and all modals are React components:

**Files to delete:**
```
js/pages/dashboard.ts         → DashboardPage.tsx (already gone, was commented out)
js/pages/analyses.ts          → AnalysesPage.tsx (already gone)
js/pages/compare.ts           → ComparePage.tsx (already gone)
js/pages/course.ts            → CoursePage.tsx
js/pages/courseTabs.ts        → CoursePage.tsx (already gone)
js/pages/workouts.ts          → WorkoutProgramsTab.tsx (already gone)
js/pages/workoutDiary.ts      → WorkoutHistoryTab.tsx (already gone)
js/pages/activeWorkout.ts     → ActiveWorkoutTab.tsx (already gone)
js/pages/analytics.ts         → WorkoutAnalyticsTab.tsx (already gone, if exists)
js/pages/encyclopedia.ts      → EncyclopediaPage.tsx (already gone)
js/pages/admin.ts             → AdminPage.tsx
js/pages/login.ts             → LoginPage.tsx
js/components/navigation.ts   → Navigation.tsx
js/components/modals.ts       → React modals
js/components/purchaseModals.ts → PurchaseModal.tsx
js/components/workoutModals.ts → Workout modal components
js/components/researchModal.ts → ResearchModal.tsx
js/components/toast.ts        → Toast.tsx
js/components/restTimer.ts    → RestTimer.tsx
js/components/prCelebration.ts → PRCelebration.tsx
js/components/quickSetLogger.ts → inline in ActiveWorkoutTab
js/components/dashboardWorkout.ts → inline in DashboardPage (already gone)
js/components/skeleton.ts     → CSS-only skeletons in React
js/react/mountReactPages.tsx   → App.tsx handles all mounting
```

**Step 1: Verify no imports reference deleted files**

Run: `cd src/BloodTracker.Api/wwwroot && grep -r "from '.*/(navigation|modals|purchaseModals|workoutModals|researchModal|toast|restTimer|prCelebration|quickSetLogger|skeleton|login|mountReactPages)" js/ --include='*.ts' --include='*.tsx' | grep -v '__tests__' | grep -v 'node_modules'`

Expected: No results (all imports should point to React versions)

**Step 2: Delete files**

```bash
rm src/BloodTracker.Api/wwwroot/js/pages/login.ts
rm src/BloodTracker.Api/wwwroot/js/pages/course.ts
rm src/BloodTracker.Api/wwwroot/js/pages/admin.ts  # if still exists
rm src/BloodTracker.Api/wwwroot/js/components/navigation.ts
rm src/BloodTracker.Api/wwwroot/js/components/modals.ts
rm src/BloodTracker.Api/wwwroot/js/components/purchaseModals.ts
rm src/BloodTracker.Api/wwwroot/js/components/workoutModals.ts
rm src/BloodTracker.Api/wwwroot/js/components/toast.ts
rm src/BloodTracker.Api/wwwroot/js/components/restTimer.ts
rm src/BloodTracker.Api/wwwroot/js/components/prCelebration.ts
rm src/BloodTracker.Api/wwwroot/js/components/quickSetLogger.ts
rm src/BloodTracker.Api/wwwroot/js/components/skeleton.ts
rm src/BloodTracker.Api/wwwroot/js/react/mountReactPages.tsx
```

**Step 3: Verify build**

Run: `cd src/BloodTracker.Api/wwwroot && npx vite build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete 15+ vanilla JS files replaced by React components"
```

---

### Task 18: Run Full Test Suite

**Step 1: Vitest unit tests**

Run: `cd src/BloodTracker.Api/wwwroot && npx vitest run`
Expected: All tests pass

**Step 2: Vite build**

Run: `cd src/BloodTracker.Api/wwwroot && npx vite build`
Expected: Build succeeds, no TypeScript errors

**Step 3: Manual smoke test**

Run: `cd src/BloodTracker.Api && dotnet run`
Navigate to `http://localhost:5000` and verify:
- [ ] Login page renders
- [ ] After login, dashboard loads
- [ ] All 7 nav buttons work
- [ ] Workout sub-tabs switch correctly
- [ ] Modals open/close
- [ ] Toast notifications show
- [ ] Rest timer works
- [ ] Workout mini-bar appears when navigating away from active workout
- [ ] PR celebration shows on new record
- [ ] Effects (sparks, runes, CRT) work
- [ ] Color picker changes theme
- [ ] Logout works

**Step 4: Commit final state**

```bash
git add -A
git commit -m "chore: full React conversion complete — verify all features"
```

---

## Summary

| Phase | Tasks | Key deliverables |
|-------|-------|-----------------|
| 1: React Shell | Tasks 1-12 | ModalContext, Toast, LoginPage, useAuth, Navigation, PageRouter, WorkoutsPage, RestTimer, MiniBar, PRCelebration, AppShell, App.tsx |
| 2: Wire Up | Tasks 13-14 | Simplified main.ts, simplified index.html |
| 3: React Modals | Tasks 15-16 | 10 React modal components, pages updated to use them |
| 4: Cleanup | Tasks 17-18 | ~15 vanilla files deleted, all tests pass |

**Files kept unchanged:** `state.ts`, `reactive.ts`, `api.ts`, `endpoints.ts`, `auth.ts`, `config.ts`, `utils.ts`, `types/*.ts`, `hooks/useAppState.ts`, `hooks/useApi.ts`, all CSS files, all 10 existing React page/tab components, `DungeonTabs.tsx`, `EmptyState.tsx`, `color-picker.ts`, all effect files.
