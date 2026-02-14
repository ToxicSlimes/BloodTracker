# UX Design Guide
> BloodTracker — Workout Diary
> Design system, components, accessibility, UX patterns

---

## Design Philosophy

```
"Ты в зале. Руки потные. Телефон одной рукой. Между подходами 90 секунд.
 Всё должно работать за 3 тапа. Без раздумий. Без ошибок."
```

### Принципы

1. **One-handed use** — все ключевые действия в thumb zone (нижние 60% экрана)
2. **3-tap maximum** — логирование подхода за max 3 тапа
3. **Zero-think UI** — все значения pre-filled, нужно только подтвердить
4. **Offline-first** — сеть упала → ничего не изменилось для юзера
5. **Save always** — любое прерывание = безопасно (NNGroup: mobile sessions = 72 сек)
6. **Minimal chrome** — контент > навигация (NNGroup: high content-to-chrome ratio)
7. **Dark only** — dungeon theme, комфортно для глаз в тёмном зале

---

## Color Palette (Dark Dungeon Terminal)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  BACKGROUNDS                                            │
│  ████  --bg-deep:     #050510   (deepest background)    │
│  ████  --bg-base:     #0a0a1a   (main background)       │
│  ████  --bg-surface:  #1a1a2e   (cards, modals)         │
│  ████  --bg-elevated: #2a2a4a   (buttons, inputs)       │
│                                                         │
│  TEXT                                                   │
│  ████  --text-primary:   #e0e0e0  (main text)           │
│  ████  --text-secondary: #a0a0a0  (secondary)           │
│  ████  --text-muted:     #666666  (disabled, hints)     │
│  ████  --text-inverse:   #0a0a1a  (on bright bg)        │
│                                                         │
│  ACCENT                                                 │
│  ████  --green:     #00ff41   (matrix green — primary)  │
│  ████  --green-dim: #00cc33   (hover/active)            │
│  ████  --gold:      #ffd700   (PRs, achievements)       │
│  ████  --orange:    #ff6b35   (warnings, progress)      │
│  ████  --red:       #ff3333   (errors, timer alert)     │
│  ████  --blue:      #4a9eff   (links, info)             │
│                                                         │
│  BORDERS                                                │
│  ████  --border:    #333333   (default)                  │
│  ████  --border-focus: #00ff41 (focused input)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Typography

```css
:root {
  --font-mono: 'Courier New', 'Lucida Console', monospace;
  --font-size-xs:  11px;
  --font-size-sm:  13px;
  --font-size-md:  15px;
  --font-size-lg:  18px;
  --font-size-xl:  24px;
  --font-size-2xl: 32px;
  
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
}

/* All text is monospace (terminal theme) */
body {
  font-family: var(--font-mono);
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);
  color: var(--text-primary);
  background: var(--bg-base);
}

/* Hierarchy */
h1 { font-size: var(--font-size-xl); color: var(--green); text-transform: uppercase; letter-spacing: 2px; }
h2 { font-size: var(--font-size-lg); color: var(--text-primary); }
h3 { font-size: var(--font-size-md); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }
.hint { font-size: var(--font-size-sm); color: var(--text-muted); }
.label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
```

---

## Spacing System

```
--space-xs:  4px
--space-sm:  8px
--space-md:  12px
--space-lg:  16px
--space-xl:  24px
--space-2xl: 32px
```

---

## Touch Targets

### Minimum sizes (потные руки в зале!)

```
CRITICAL (primary actions):    min 48×48px  (Apple HIG: 44pt)
IMPORTANT (secondary actions): min 44×44px
TERTIARY (non-essential):      min 36×36px

Spacing between targets: min 8px
```

### Thumb Zone Map

```
┌──────────────────────────────┐
│                              │  ← Hard to reach (navigation, title)
│    STRETCH ZONE              │
│                              │
│──────────────────────────────│
│                              │
│    NATURAL ZONE              │  ← Easy reach (content, info)
│    (comfortable)             │
│                              │
│──────────────────────────────│
│                              │
│    PRIMARY ZONE              │  ← Easiest (CTA buttons, quick actions)
│    (thumb-friendly)          │
│                              │
│  [LOG SET]   [FINISH]   ⏱   │  ← Bottom fixed actions
│                              │
└──────────────────────────────┘

Rules:
- CTA buttons → bottom 40% of screen
- Bottom sheets > modal dialogs (closer to thumb)
- Rest timer bar → fixed bottom (always accessible)
- Navigation → top (acceptable, less frequent)
```

---

## Component Library

### 1. Button

```css
.btn {
  font-family: var(--font-mono);
  font-size: var(--font-size-md);
  padding: 12px 24px;
  min-height: 48px;
  min-width: 48px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--green);
  color: var(--text-inverse);
  border-color: var(--green);
}
.btn-primary:active { background: var(--green-dim); transform: scale(0.97); }

.btn-secondary {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--border);
}

.btn-danger {
  background: transparent;
  color: var(--red);
  border-color: var(--red);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
}

.btn-icon {
  padding: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Wireframe:**
```
[  ✓  COMPLETE SET  ]   ← btn-primary (green, filled)
[  CANCEL  ]             ← btn-secondary (grey border)
[  ABANDON  ]            ← btn-danger (red border)
[  +2.5  ]               ← btn-icon (small increment)
```

### 2. Input (Numeric)

```css
.input-numeric {
  font-family: var(--font-mono);
  font-size: var(--font-size-xl);  /* Large for easy reading */
  text-align: center;
  padding: 12px 16px;
  min-height: 48px;
  width: 100%;
  background: var(--bg-elevated);
  color: var(--green);
  border: 1px solid var(--border);
  border-radius: 4px;
  -webkit-appearance: none;
}

.input-numeric:focus {
  border-color: var(--green);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 65, 0.2);
}

/* Select all on focus (easy overwrite) */
.input-numeric:focus { user-select: all; }
```

**Wireframe:**
```
Weight (kg)
┌──────────────────────────────────────┐
│  [-5]  [-2.5]  [  60.0  ]  [+2.5]  [+5]  │
└──────────────────────────────────────┘
                  ↑ input-numeric (green text, centered)
       ↑ btn-icon (increment buttons around)
```

**Key behavior:**
- `inputmode="decimal"` → numeric keyboard with decimal
- On focus → select all text
- Tab order: weight → reps → RPE (no keyboard switch)

### 3. Card

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-md);
}

.card-completed {
  opacity: 0.7;
  border-color: var(--green-dim);
}

.card-active {
  border-color: var(--green);
  box-shadow: 0 0 0 1px var(--green);
}
```

### 4. Bottom Sheet

```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  padding: var(--space-lg);
  padding-bottom: calc(var(--space-xl) + env(safe-area-inset-bottom)); /* iPhone notch */
  z-index: 150;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 85vh;
  overflow-y: auto;
}

.bottom-sheet.open {
  transform: translateY(0);
}

/* Drag handle */
.bottom-sheet::before {
  content: '';
  display: block;
  width: 40px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto var(--space-lg);
}

/* Backdrop */
.bottom-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 149;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.bottom-sheet-backdrop.visible {
  opacity: 1;
  pointer-events: auto;
}
```

**Why bottom sheet > modal:**
- Closer to thumb zone
- Can be swiped down to dismiss
- Feels native on mobile
- Partial background context visible

### 5. Progress Bar

```css
.progress-bar {
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar .fill {
  height: 100%;
  background: var(--green);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar .fill.warning { background: var(--orange); }
.progress-bar .fill.danger { background: var(--red); }
```

### 6. RPE Slider

```
RPE (1-10)
┌────────────────────────────────────────────┐
│  1   2   3   4   5  [6]  7   8   9   10  │
│  ░░░░░░░░░░░░░░░░░░░████░░░░░░░░░░░░░░░  │
└────────────────────────────────────────────┘
```

```css
.rpe-slider {
  display: flex;
  gap: 2px;
}

.rpe-option {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.rpe-option.selected {
  background: var(--green);
  color: var(--text-inverse);
  border-color: var(--green);
}

.rpe-option:active {
  transform: scale(0.95);
}
```

### 7. Toast / Notification

```css
.toast {
  position: fixed;
  bottom: 80px; /* above bottom nav + timer */
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 24px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  z-index: 250;
  animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s;
}

.toast.success { border-color: var(--green); }
.toast.error { border-color: var(--red); color: var(--red); }
.toast.pr { border-color: var(--gold); color: var(--gold); }

@keyframes toastIn {
  from { transform: translateX(-50%) translateY(20px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}
```

---

## Interaction Patterns

### 1. Swipe to Delete

```
Normal state:
┌──────────────────────────────────────────────┐
│  Set 3:  60kg × 10  ✓  RPE: 8  Rest: 100s   │
└──────────────────────────────────────────────┘

Swiped left:
┌──────────────────────────────────────┬───────┐
│  Set 3:  60kg × 10  ✓  RPE: 8  Res  │ DELETE│
└──────────────────────────────────────┴───────┘
                                       (red bg)
```

Implementation: CSS transform + touch events, threshold 80px.

### 2. Long Press to Reorder

Exercises can be reordered via long press + drag:
```
Normal:
  1. Жим гантелей лёжа
  2. Жим на наклонной        ← long press here
  3. Разведение гантелей

Dragging:
  1. Жим гантелей лёжа
  ┌─────────────────────────┐ ← floating, slight scale up
  │ 2. Жим на наклонной     │
  └─────────────────────────┘
  ← drop zone indicator ─────
  3. Разведение гантелей
```

Haptic: `navigator.vibrate(50)` on long press start.

### 3. Pull to Refresh

On History screen:
```
  ↓ pulling...
  ┌──────────────────┐
  │  ⟳ Refreshing... │
  └──────────────────┘
  
  Workout history items...
```

### 4. Skeleton Loading

While data loads:
```
┌────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░  ← shimmer animation                  │
│  ░░░░░░░░░░ ░░░░░░░                                   │
│  ░░░░  ░░░░  ░░░░                                     │
└────────────────────────────────────────────────────────┘
```

```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Empty States (Dungeon Theme)

### No Workouts Yet
```
┌───────────────────────────────────────────┐
│                                           │
│     📜  THE SCROLL IS BLANK               │
│                                           │
│     No workouts recorded yet.             │
│     Every legend starts with              │
│     a single rep.                         │
│                                           │
│     [⚔️ BEGIN YOUR QUEST]                 │
│                                           │
└───────────────────────────────────────────┘
```

### No Analytics Data
```
┌───────────────────────────────────────────┐
│                                           │
│     📊  THE ORACLE NEEDS DATA             │
│                                           │
│     Complete at least 3 workouts          │
│     to unlock analytics.                  │
│                                           │
│     Progress: 1/3 ████░░░░░░░░           │
│                                           │
└───────────────────────────────────────────┘
```

### No PRs
```
┌───────────────────────────────────────────┐
│                                           │
│     🏆  NO RECORDS... YET                 │
│                                           │
│     Complete your first workout           │
│     and the records will follow.          │
│                                           │
│     "The strongest steel is              │
│      forged in the hottest fire."        │
│                                           │
└───────────────────────────────────────────┘
```

### Offline
```
┌───────────────────────────────────────────┐
│  ⚡ DUNGEON MODE — no signal detected     │
│  Training continues. Data saved locally.  │
│  Will sync upon return to civilization.   │
└───────────────────────────────────────────┘
```

---

## Haptic Feedback Patterns

```typescript
const haptics = {
  light:    () => navigator.vibrate?.(10),     // Button tap
  medium:   () => navigator.vibrate?.(25),     // Set completed
  heavy:    () => navigator.vibrate?.(50),     // Long press start
  success:  () => navigator.vibrate?.([50, 30, 50]),  // Workout complete
  alert:    () => navigator.vibrate?.([200, 100, 200]), // Timer done
  pr:       () => navigator.vibrate?.([100, 50, 100, 50, 200]), // PR achieved!
  error:    () => navigator.vibrate?.([300]),   // Error
};
```

When to use:
- `light` — increment buttons (+2.5, +1)
- `medium` — complete set ✓
- `heavy` — long press to reorder
- `success` — finish workout
- `alert` — rest timer done
- `pr` — new personal record
- `error` — server error toast

---

## Sound Design

```
/sounds/
├── timer-tick.mp3    (subtle tick, last 5 seconds)
├── timer-done.mp3    (bell/chime, timer completed)
├── set-complete.mp3  (short confirmation beep)
├── pr-achieved.mp3   (triumphant fanfare, 2 seconds)
└── milestone.mp3     (achievement unlock sound, 2 seconds)
```

Requirements:
- All sounds < 50KB each
- Timer-done must be audible in noisy gym (mid-frequency, not high-pitched)
- Respect system silent mode (check `AudioContext` state)
- Volume follows system volume

```typescript
class SoundManager {
  private audioContext: AudioContext | null = null;
  
  async play(name: string) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    
    // Don't play if audio context is suspended (silent mode)
    if (this.audioContext.state === 'suspended') return;
    
    const audio = new Audio(`/sounds/${name}.mp3`);
    await audio.play().catch(() => {}); // Ignore autoplay blocks
  }
}
```

---

## Accessibility

### ARIA Labels
```html
<button aria-label="Complete set 3 of 4" class="btn-primary">✓ COMPLETE SET</button>
<button aria-label="Add 2.5 kg to weight" class="btn-icon">+2.5</button>
<div role="timer" aria-live="polite" aria-label="Rest timer: 42 seconds remaining">00:42</div>
<div role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100">8/16 sets</div>
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  
  .skeleton { animation: none; background: var(--bg-elevated); }
  .pr-card { animation: none; }
}
```

### Color Contrast
All text meets WCAG AA (4.5:1 ratio):
- `#e0e0e0` on `#0a0a1a` = 15.1:1 ✓
- `#a0a0a0` on `#0a0a1a` = 8.6:1 ✓
- `#00ff41` on `#0a0a1a` = 12.4:1 ✓
- `#666666` on `#0a0a1a` = 4.6:1 ✓ (barely, used only for non-essential hints)

### Focus Indicators
```css
:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}
```

---

## Navigation Structure

```
Bottom Tab Bar (4 tabs, fixed):
┌──────────────────────────────────────────────┐
│  [Programs]  [Diary]  [Analytics]  [Settings] │
└──────────────────────────────────────────────┘
```

During active workout → bottom tab bar HIDDEN, replaced by:
```
┌──────────────────────────────────────────────┐
│  REST TIMER BAR (when running)               │
├──────────────────────────────────────────────┤
│  [FINISH WORKOUT]        [ABANDON]           │
└──────────────────────────────────────────────┘
```

### Persistent Workout Bar

If user navigates away during active workout (e.g., to check blood results), show mini bar:

```
┌──────────────────────────────────────────────────────┐
│  ⏱ 00:34:12 — Chest Day — 8/16 sets  [↗ RETURN]    │
└──────────────────────────────────────────────────────┘
```

Like a music player mini-bar. Tapping returns to Active Workout Screen.

---

## Performance Guidelines

1. **No layout shift** — reserve space for dynamic content (timer bar, bottom sheet)
2. **Debounce scroll** — exercise list can be long, debounce scroll event handlers
3. **Lazy render** — collapsed exercises don't render set details
4. **Reuse DOM** — exercise cards are reused, not recreated
5. **requestAnimationFrame** — timer display uses rAF, not setInterval for rendering
6. **Hardware acceleration** — `will-change: transform` on bottom sheet and timer bar

---

## Testing Checklist (UX-focused)

```
□ Can complete a set in ≤ 3 taps
□ Can use entire UI with one hand (right-handed)
□ Can use entire UI with one hand (left-handed)
□ Weight/reps input: numpad stays open between fields
□ Bottom sheet doesn't jump when keyboard opens
□ Timer visible when app in background (notification API)
□ Timer sound audible in noisy environment
□ Haptic feedback works (iOS Safari, Android Chrome)
□ Offline mode: all core functions work without network
□ Slow network: UI doesn't hang (optimistic updates)
□ Session recovery: close browser → reopen → workout restored
□ Large exercise list (20+ exercises): no scroll jank
□ Dark theme: all text readable, sufficient contrast
□ Safe area insets respected (iPhone notch, Android cutout)
```

---

*This design guide applies across all phases. Reference it during implementation.*
