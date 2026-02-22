# Workout UI Redesign — Design Document

**Date:** 2026-02-21
**Branch:** feature/workout-diary
**Scope:** ASCII art containers, workout history cards, analytics visualizations

---

## Problem Statement

Three issues block productive mobile use of the workout tracker:

1. **ASCII muscle art jumps** — 12 muscle groups render at different sizes, causing layout shifts when swiping the exercise carousel.
2. **Mobile breakage** — CSS `.muscle-ascii` responsive rules exist but are dead code (components use `.ex-muscle-hero`). Imperative JS scale logic uses fragile `setTimeout(10ms)`.
3. **Sparse history/analytics** — History cards are flat text. Analytics lacks muscle balance visualization and rich comparisons.

---

## Section 1: ASCII Art Fixed Container

### Current State
- `muscleAscii.ts` renders 12 different ASCII arts (varying dimensions)
- `ActiveWorkoutTab.tsx` lines 706-720: imperative DOM scale calculation in `useEffect` with `setTimeout`
- CSS class mismatch: `.muscle-ascii` has responsive rules, `.ex-muscle-hero` (used in JSX) has none

### Design

**Fixed-size container with CSS-only scaling:**

```
.ex-muscle-hero {
  aspect-ratio: 5 / 3;        /* consistent across all muscle groups */
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 280px;           /* desktop cap */
}

.ex-muscle-hero pre {
  transform: scale(var(--muscle-scale, 0.8));
  transform-origin: center center;
  white-space: pre;
  line-height: 1;
}
```

**Scale calculation:** Replace `setTimeout` with a `ResizeObserver` hook that sets `--muscle-scale` CSS variable on the container. Runs once on mount, re-runs on resize. No imperative DOM manipulation.

**Responsive cascade:**

| Breakpoint | aspect-ratio | font-size | max-height |
|-----------|-------------|-----------|------------|
| Desktop   | 5/3         | 7px       | 280px      |
| Tablet <768px | 3/2     | 5px       | 200px      |
| Mobile <480px | 2/1     | 4px       | 120px      |
| Tiny <360px   | 16/9    | 3px       | 80px       |

**Files changed:**
- `js/react/pages/ActiveWorkoutTab.tsx` — replace imperative scale with `useMuscleScale()` hook
- `css/workout-diary.css` — fix `.ex-muscle-hero` responsive cascade, remove dead `.muscle-ascii` rules or alias them

---

## Section 2: History Cards Enrichment

### Current State
- `WorkoutHistoryTab.tsx` renders flat cards: title, date, 4 stats, comparison deltas
- No visual muscle group breakdown
- Comparison shows raw text with emoji arrows

### Design

**Enhanced card layout:**

```
Desktop:
┌──────────────────────────────────────┐
│ [ASCII]  │ Push Day                  │
│ [mini ]  │ 20 февр. 23:06 · 56 мин  │
│ [body ]  │ [Грудь] [Плечи] [Трицепс]│
│──────────┼───────────────────────────│
│ 5720 кг  │ 130 повт │ 13 подходов   │
│ ▓▓▓▓▓▓░░ vs прошлая (+12%)          │
└──────────────────────────────────────┘

Mobile (<480px):
┌──────────────────────────────┐
│ Push Day · 56 мин            │
│ [Грудь] [Плечи] [Трицепс]   │
│ 5720 кг · 130 повт · 13 сет │
│ ▓▓▓▓▓▓░░ +12% vs прошлая    │
└──────────────────────────────┘
```

**New components:**

1. **`MiniMuscleMap`** — 30-char-wide ASCII silhouette showing which muscles were hit. Hidden on mobile (<480px).

2. **Muscle group tags** — colored badges extracted from session exercises. Color mapped per muscle group via CSS custom properties.

3. **Comparison progress bar** — replaces emoji text. Green bar for improvement, red for regression, with percentage overlay.

4. **SVG sparkline** (optional, phase 2) — tiny tonnage trend for last 5 sessions, inline on card.

**Files changed:**
- `js/react/pages/WorkoutHistoryTab.tsx` — new card layout, MiniMuscleMap, tags, progress bars
- `css/workout-diary.css` — new `.history-card-*` styles, muscle tag colors

---

## Section 3: Analytics Visualizations

### Current State
- 3 sub-tabs: Exercises (line+bar charts), Records (PR cards), Stats (6-stat grid + calendar + weekly trend + muscle frequency bars)
- ApexCharts with dark theme
- Calendar heatmap is basic (binary: trained/not)

### New Visualizations

#### 3a. ASCII Muscle Heatmap (Stats tab)

Full ASCII body silhouette where each muscle group is colored by training intensity over selected period.

- Data source: `WeeklyMuscleVolume` API endpoint (already exists)
- Color scale: gray (untrained) → green (moderate) → gold (heavy)
- Implementation: reuse `muscleAscii.ts` body template, apply per-group CSS color classes
- Responsive: same fixed container approach as Section 1

#### 3b. Radar Chart — Muscle Balance (Stats tab)

ApexCharts radar/polar chart with 12 axes (one per muscle group).

- Normalized volume: each axis = % of max across all groups
- Period selector: this week / 30d / 90d
- Immediately shows imbalances (e.g., skipping legs)
- Config: `type: 'radar'`, dark theme, green fill with 30% opacity

#### 3c. Stacked Area — Tonnage by Muscle Group (Stats tab)

ApexCharts stacked area showing weekly tonnage broken down by muscle group.

- X-axis: weeks
- Y-axis: tonnage (kg)
- Each muscle group = colored area
- Shows both total growth and composition shift over time
- Config: `type: 'area'`, stacked, dark theme

#### 3d. Enhanced Calendar Heatmap (Stats tab)

Upgrade existing binary calendar to intensity-based:

- Cell color intensity = total tonnage that day (normalized to max in range)
- 4 levels: none, light, medium, heavy
- Color: `var(--bg-secondary)` → `var(--primary-color)` with opacity steps
- Tooltip on hover: "Пн 15 февр. — 3200 кг, 2 тренировки"

**Files changed:**
- `js/react/pages/WorkoutAnalyticsTab.tsx` — add radar chart, stacked area, enhance calendar
- `js/components/muscleAscii.ts` — add `renderHeatmapBody(muscleIntensities)` function
- `css/workout-diary.css` — heatmap colors, radar chart container

---

## Data Dependencies

All required data already exists in the API:

| Visualization | API Endpoint | Status |
|--------------|-------------|--------|
| Muscle tags on cards | Session exercises (included in history) | Ready |
| Muscle heatmap | `GET /workout-sessions/analytics/stats` → WeeklyMuscleVolume | Ready |
| Radar chart | Same as above | Ready |
| Stacked area | Same as above, aggregate by week | Ready |
| Calendar intensity | Session list with tonnage per day | Ready |
| Comparison bars | Already computed in WorkoutHistoryTab | Ready |

No new API endpoints needed.

---

## Non-Goals

- No canvas/WebGL rendering — ASCII stays as text
- No new npm dependencies (ApexCharts already included)
- No changes to workout session data model
- No changes to the exercise carousel swipe mechanics (scroll-snap stays)

---

## Testing

- Visual regression: screenshot comparison at 1280px, 768px, 480px, 360px viewports
- Carousel swipe: verify zero layout shift between all 12 muscle groups
- Analytics: verify charts render with 0 data, 1 session, and 50+ sessions
- Mobile: test on iPhone SE (375px) and iPad (768px) viewports
