# Full React Conversion — Design
> BloodTracker Frontend Migration
> Date: 2026-02-17
> Status: Approved

## Goal

Convert BloodTracker frontend from "React Islands in vanilla JS shell" to a fully React-driven SPA. Remove all vanilla JS pages, modals, and navigation. Keep working infrastructure (Proxy state, API client, auth).

## What We Keep (don't touch)

| File | Reason |
|------|--------|
| `state.ts` + `reactive.ts` | Proxy-based reactive state works perfectly with `useAppState` hook |
| `api.ts` + `endpoints.ts` | Framework-agnostic fetch wrapper, no reason to rewrite |
| `auth.ts` | Auth logic is framework-agnostic |
| `utils.ts` | Pure utility functions |
| `types/*.ts` | TypeScript types |
| `hooks/useAppState.ts` | React bridge to Proxy state — already battle-tested |
| `hooks/useApi.ts` | API hook |
| All 10 React page components | Already fully implemented |
| `DungeonTabs.tsx`, `EmptyState.tsx` | Shared React components |
| All CSS files | Styles are component-agnostic |

## What We Build

### 1. App.tsx — Root Component

Single React root replaces the entire vanilla shell:

```tsx
function App() {
  const isAuthenticated = useAuth()
  if (!isAuthenticated) return <LoginPage />

  return (
    <AppShell>
      <Navigation />
      <PageRouter />
      <WorkoutMiniBar />
      <RestTimer />
      <Toast />
      <ModalManager />
    </AppShell>
  )
}
```

### 2. Navigation — Custom Hash Router

No react-router-dom. 8 pages with hash-based navigation:

```tsx
// PageRouter reads state.currentPage and renders the correct component
function PageRouter() {
  const currentPage = useAppState('currentPage')
  switch (currentPage) {
    case 'dashboard': return <DashboardPage />
    case 'analyses': return <AnalysesPage />
    case 'compare': return <ComparePage />
    case 'course': return <CoursePage />
    case 'workouts': return <WorkoutsPage /> // contains 4 sub-tabs
    case 'encyclopedia': return <EncyclopediaPage />
    case 'admin': return <AdminPage />
    default: return <DashboardPage />
  }
}
```

Navigation state stays in `state.currentPage`. Hash sync via `useEffect`.

### 3. Modals — React Portals + Context

```tsx
// Modal context provides open/close functions
const { openModal, closeModal } = useModal()

// Usage in any component:
openModal(<DrugModal drugId={id} onSave={handleSave} />)
```

10 modals to convert:
- AnalysisModal (create/edit)
- DrugModal (create/edit with catalog dropdown)
- IntakeLogModal (create/edit)
- PurchaseModal (create/edit)
- PdfImportModal (file upload + Gemini OCR)
- ResearchModal (PubMed + Gemini research)
- WorkoutProgramModal (create/edit)
- WorkoutDayModal (create/edit)
- WorkoutExerciseModal (create/edit)
- WorkoutSetModal (create/edit)

### 4. Global Components

| Component | Replaces | Notes |
|-----------|----------|-------|
| `Toast.tsx` | `toast.ts` | Keep `toast.success()` API via module-level functions |
| `RestTimer.tsx` | `restTimer.ts` | Fixed bottom bar, Web Audio beep, notifications |
| `PRCelebration.tsx` | `prCelebration.ts` | Golden glow overlay on new PR |
| `WorkoutMiniBar.tsx` | mini-bar in `navigation.ts` | Shows when navigating away from active workout |
| `LoginPage.tsx` | `login.ts` | Auth form with token handling |

### 5. Effects (keep as-is)

ASCII effects (`sparks.ts`, `matrix-runes.ts`, `asciifyEngine.ts`, `asciiEngine.ts`) operate on DOM directly and don't conflict with React. They'll be initialized in `useEffect` inside `App.tsx` or `AppShell`.

Similarly `asciiDonut.ts`, `muscleAscii.ts`, `trendChart.ts` are used as utility imports by React components — no change needed.

### 6. main.ts Simplification

Before: 60 lines of imports, data loading, navigation init, modal imports.
After:

```ts
// CSS imports
import '../css/...'

// Init effects
import './components/asciiEngine.js'
import './components/asciifyEngine.js'

// Mount React app
import { createRoot } from 'react-dom/client'
import App from './react/App.js'

const root = createRoot(document.getElementById('app')!)
root.render(<App />)
```

### 7. index.html Simplification

Remove all `<div class="page" id="dashboard">...</div>` static HTML.
Keep only:
```html
<div id="app"></div>
```

Plus: effects canvases, meta tags, SW registration.

## What We Delete

| Files | Count | Reason |
|-------|-------|--------|
| `pages/dashboard.ts` | 1 | → DashboardPage.tsx |
| `pages/analyses.ts` | 1 | → AnalysesPage.tsx |
| `pages/compare.ts` | 1 | → ComparePage.tsx |
| `pages/course.ts` + `courseTabs.ts` | 2 | → CoursePage.tsx |
| `pages/workouts.ts` | 1 | → WorkoutProgramsTab.tsx |
| `pages/workoutDiary.ts` | 1 | → WorkoutHistoryTab.tsx |
| `pages/activeWorkout.ts` | 1 | → ActiveWorkoutTab.tsx |
| `pages/analytics.ts` | 1 | → WorkoutAnalyticsTab.tsx |
| `pages/encyclopedia.ts` | 1 | → EncyclopediaPage.tsx |
| `pages/admin.ts` | 1 | → AdminPage.tsx |
| `pages/login.ts` | 1 | → LoginPage.tsx |
| `components/navigation.ts` | 1 | → Navigation.tsx |
| `components/modals.ts` | 1 | → React modals |
| `components/purchaseModals.ts` | 1 | → PurchaseModal.tsx |
| `components/workoutModals.ts` | 1 | → Workout CRUD modals |
| `components/researchModal.ts` | 1 | → ResearchModal.tsx |
| `components/toast.ts` | 1 | → Toast.tsx |
| `components/restTimer.ts` | 1 | → RestTimer.tsx |
| `components/prCelebration.ts` | 1 | → PRCelebration.tsx |
| `components/quickSetLogger.ts` | 1 | → inline in ActiveWorkoutTab |
| `components/dashboardWorkout.ts` | 1 | → inline in DashboardPage |
| `components/skeleton.ts` | 1 | → CSS-only skeletons in React |
| `react/mountReactPages.tsx` | 1 | → App.tsx handles all mounting |
| **Total** | **~23 files** | |

## Architecture After Migration

```
index.html
  └── <div id="app">
        └── App.tsx (React root)
              ├── LoginPage (if !authenticated)
              └── AppShell (if authenticated)
                    ├── Navigation.tsx (top nav bar)
                    ├── PageRouter (renders active page)
                    │     ├── DashboardPage
                    │     ├── AnalysesPage
                    │     ├── ComparePage
                    │     ├── CoursePage
                    │     ├── WorkoutsPage (4 sub-tabs)
                    │     ├── EncyclopediaPage
                    │     └── AdminPage
                    ├── WorkoutMiniBar (floating, when active session)
                    ├── RestTimer (fixed bottom)
                    ├── Toast (fixed top-right)
                    ├── PRCelebration (overlay portal)
                    └── ModalManager (portal for current modal)

State: state.ts (Proxy) ←→ useAppState() hook
API: api.ts + endpoints.ts (unchanged)
Auth: auth.ts (unchanged)
```

## Risks

1. **index.html inline scripts** — anti-reload-loop guard, SW registration, asciify init. Must preserve in index.html or move to App.tsx useEffect.
2. **Effects (sparks, matrix-runes)** — operate on canvas elements. Need canvas refs in AppShell.
3. **Modal complexity** — DrugModal has catalog dropdown with keyboard nav. Needs careful port.
4. **PdfImportModal** — file upload + progress. Test thoroughly.
5. **color-picker.ts** — persists theme color. Can stay as utility import.
