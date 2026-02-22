# Workout UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix ASCII art layout jumping in exercise carousel, make workout UI mobile-ready, enrich history cards and analytics with muscle heatmap/radar/stacked area charts.

**Architecture:** Replace imperative DOM scale logic with CSS-driven fixed containers + ResizeObserver hook. Add muscle group tags and comparison bars to history cards. Add radar chart, stacked area, and enhanced calendar heatmap to analytics using existing ApexCharts setup.

**Tech Stack:** React 18, TypeScript, ApexCharts (already included), CSS custom properties, no new dependencies.

---

### Task 1: Fix ASCII Art Container — CSS Foundation

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/css/workout-diary.css:760-778`

**Step 1: Replace `.ex-muscle-hero` rules**

Replace lines 760-778 with fixed-size container:

```css
.ex-muscle-hero {
    text-align: center;
    margin-bottom: var(--space-md);
    font-family: var(--ascii-font-family);
    font-size: 7px;
    line-height: 1.05;
    white-space: pre;
    aspect-ratio: 5 / 3;
    max-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    max-width: 100%;
    background: var(--bg-panel-inner);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
    position: relative;
}

.ex-muscle-hero .muscle-ascii-highlight {
    transform: scale(var(--muscle-scale, 0.75));
    transform-origin: center center;
    transition: transform 0.15s ease;
}
```

**Step 2: Add responsive breakpoints**

Add after the existing mobile rules around line 1151:

```css
@media (max-width: 768px) {
    .ex-muscle-hero {
        aspect-ratio: 3 / 2;
        max-height: 200px;
        font-size: 5px;
    }
}

@media (max-width: 480px) {
    .ex-muscle-hero {
        aspect-ratio: 2 / 1;
        max-height: 120px;
        font-size: 4px;
    }
}

@media (max-width: 360px) {
    .ex-muscle-hero {
        aspect-ratio: 16 / 9;
        max-height: 80px;
        font-size: 3px;
    }
}
```

**Step 3: Rebuild frontend and verify**

Run: `cd src/BloodTracker.Api/wwwroot && npx vite build`

**Step 4: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/css/workout-diary.css
git commit -m "fix: stable ASCII art container with aspect-ratio and responsive cascade"
```

---

### Task 2: Replace Imperative Scale with useMuscleScale Hook

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/ActiveWorkoutTab.tsx:694-721, 742`

**Step 1: Create `useMuscleScale` hook inline**

Add this hook before `ExerciseSlide` component (around line 690):

```typescript
function useMuscleScale(
  heroRef: React.RefObject<HTMLDivElement>,
  isCurrent: boolean,
  muscleGroup: number | undefined,
  muscleAscii: any
) {
  useEffect(() => {
    const el = heroRef.current
    if (!isCurrent || !el || !muscleAscii || muscleGroup == null) return
    if (el.querySelector('.muscle-ascii-highlight')) return

    const asciiHtml = muscleAscii.renderMuscleAscii(muscleGroup)
    const range = document.createRange()
    const frag = range.createContextualFragment(asciiHtml)
    el.textContent = ''
    el.appendChild(frag)

    const recalc = () => {
      const highlight = el.querySelector('.muscle-ascii-highlight') as HTMLElement | null
      if (!highlight) return
      highlight.style.transform = ''
      const cw = el.clientWidth - 16
      const ch = el.clientHeight - 16
      if (cw <= 0 || ch <= 0) return
      const nw = highlight.scrollWidth
      const nh = highlight.scrollHeight
      const scale = Math.min(cw / nw, ch / nh, 1)
      el.style.setProperty('--muscle-scale', String(scale))
    }

    recalc()

    const ro = new ResizeObserver(recalc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isCurrent, muscleAscii, muscleGroup])
}
```

**Step 2: Replace old useEffect in ExerciseSlide**

Delete lines 694-721 (the old `useEffect` with `setTimeout`).

Replace with call to the new hook at the top of `ExerciseSlide`:

```typescript
useMuscleScale(heroRef, isCurrent, exercise.muscleGroup, muscleAscii)
```

**Step 3: Build and test**

Run: `cd src/BloodTracker.Api/wwwroot && npx vite build`

Open browser, navigate to active workout, swipe between exercises — verify:
- No page jumping between different muscle groups
- ASCII art scales to fit container
- Works at 480px viewport width

**Step 4: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/ActiveWorkoutTab.tsx
git commit -m "refactor: replace setTimeout scale logic with ResizeObserver hook"
```

---

### Task 3: Muscle Group Tags for History Cards

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutHistoryTab.tsx:132-174`
- Modify: `src/BloodTracker.Api/wwwroot/css/workout-diary.css`

**Step 1: Add MUSCLE_GROUP_LABELS constant**

At top of WorkoutHistoryTab.tsx:

```typescript
const MUSCLE_GROUP_LABELS: Record<number, string> = {
  0: 'Все тело', 1: 'Грудь', 2: 'Спина', 3: 'Плечи', 4: 'Бицепс',
  5: 'Трицепс', 6: 'Предплечья', 7: 'Пресс', 8: 'Ягодицы',
  9: 'Квадрицепс', 10: 'Бицепс бедра', 11: 'Икры',
}

const MUSCLE_GROUP_COLORS: Record<number, string> = {
  0: '#4AF626', 1: '#FF6B6B', 2: '#4A90D9', 3: '#FBB954', 4: '#E57CD8',
  5: '#FF9F43', 6: '#A29BFE', 7: '#FFEAA7', 8: '#55E6C1',
  9: '#74B9FF', 10: '#FD79A8', 11: '#81ECEC',
}
```

**Step 2: Extract unique muscle groups from session**

Inside `SessionCard` component, before the return:

```typescript
const muscleGroups = [...new Set(
  session.exercises?.map(e => e.muscleGroup).filter(g => g != null) ?? []
)]
```

**Step 3: Add muscle tags to card JSX**

After `workout-history-card-date` div, add:

```tsx
{muscleGroups.length > 0 && (
  <div className="workout-history-card-tags">
    {muscleGroups.map(g => (
      <span key={g} className="muscle-tag" style={{ borderColor: MUSCLE_GROUP_COLORS[g] || '#4AF626' }}>
        {MUSCLE_GROUP_LABELS[g] || '?'}
      </span>
    ))}
  </div>
)}
```

**Step 4: Add CSS for muscle tags**

In `workout-diary.css`:

```css
.workout-history-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
}

.muscle-tag {
    font-size: 10px;
    padding: 1px 6px;
    border: 1px solid;
    border-radius: 3px;
    color: var(--text-secondary);
    background: rgba(0, 0, 0, 0.3);
    white-space: nowrap;
}
```

**Step 5: Build and verify**

Run: `cd src/BloodTracker.Api/wwwroot && npx vite build`

**Step 6: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutHistoryTab.tsx src/BloodTracker.Api/wwwroot/css/workout-diary.css
git commit -m "feat: muscle group tags on workout history cards"
```

---

### Task 4: Comparison Progress Bars

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutHistoryTab.tsx` — `ComparisonRow` component
- Modify: `src/BloodTracker.Api/wwwroot/css/workout-diary.css`

**Step 1: Replace ComparisonRow text with visual bars**

Find the `ComparisonRow` component (around line 86) and replace with:

```typescript
function ComparisonRow({ current, previous }: { current: WorkoutSessionDto; previous: WorkoutSessionDto }) {
  const metrics = [
    { label: 'Тоннаж', current: current.totalTonnage, prev: previous.totalTonnage, unit: 'кг' },
    { label: 'Объём', current: current.totalVolume, prev: previous.totalVolume, unit: 'повт' },
    { label: 'Время', current: current.durationSeconds / 60, prev: previous.durationSeconds / 60, unit: 'мин' },
  ]

  return (
    <div className="workout-comparison">
      <div className="workout-comparison-title">vs предыдущая</div>
      {metrics.map(m => {
        const delta = m.current - m.prev
        const pct = m.prev > 0 ? Math.round((delta / m.prev) * 100) : 0
        const isUp = delta > 0
        const barWidth = Math.min(Math.abs(pct), 100)
        return (
          <div key={m.label} className="comparison-bar-row">
            <span className="comparison-bar-label">{m.label}</span>
            <div className="comparison-bar-track">
              <div
                className={`comparison-bar-fill ${isUp ? 'positive' : 'negative'}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className={`comparison-bar-value ${isUp ? 'positive' : 'negative'}`}>
              {isUp ? '+' : ''}{delta.toFixed(0)}{m.unit} ({isUp ? '+' : ''}{pct}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Add CSS for comparison bars**

```css
.comparison-bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    margin-bottom: 2px;
}

.comparison-bar-label {
    width: 60px;
    color: var(--text-secondary);
    flex-shrink: 0;
}

.comparison-bar-track {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    overflow: hidden;
}

.comparison-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
}

.comparison-bar-fill.positive { background: var(--green, #4AF626); }
.comparison-bar-fill.negative { background: #FF6B6B; }

.comparison-bar-value {
    width: 100px;
    text-align: right;
    flex-shrink: 0;
    font-family: var(--ascii-font-family);
}

.comparison-bar-value.positive { color: var(--green, #4AF626); }
.comparison-bar-value.negative { color: #FF6B6B; }
```

**Step 3: Build and commit**

```bash
npx vite build
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutHistoryTab.tsx src/BloodTracker.Api/wwwroot/css/workout-diary.css
git commit -m "feat: visual comparison progress bars in history cards"
```

---

### Task 5: Radar Chart — Muscle Balance (Analytics)

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx`

**Step 1: Add radar chart to StatsTab**

Find `StatsTab` component (around line 495). After the muscle frequency bars section (around line 606), add:

```typescript
{/* Radar chart - muscle balance */}
{(() => {
  const radarData = Object.entries(muscleFreq).map(([mg, count]) => ({
    group: MUSCLE_LABELS[Number(mg)] || mg,
    value: count,
  }))
  if (radarData.length === 0) return null

  const maxVal = Math.max(...radarData.map(d => d.value))
  const normalized = radarData.map(d => ({
    ...d,
    pct: maxVal > 0 ? Math.round((d.value / maxVal) * 100) : 0,
  }))

  return (
    <div className="analytics-section">
      <h4>Мышечный баланс</h4>
      <div ref={el => {
        if (!el || el.dataset.rendered) return
        el.dataset.rendered = '1'
        new ApexCharts(el, baseChartOptions({
          chart: { type: 'radar', height: 350 },
          series: [{ name: 'Подходы', data: normalized.map(d => d.pct) }],
          xaxis: { categories: normalized.map(d => d.group) },
          yaxis: { show: false },
          fill: { opacity: 0.25, colors: ['#4AF626'] },
          stroke: { colors: ['#4AF626'], width: 2 },
          markers: { size: 3, colors: ['#4AF626'] },
          plotOptions: { radar: { polygons: { strokeColors: 'rgba(74, 246, 38, 0.15)', connectorColors: 'rgba(74, 246, 38, 0.15)' } } },
        })).render()
      }} />
    </div>
  )
})()}
```

**Step 2: Build and verify**

Run: `npx vite build`

Navigate to АНАЛИТИКА → Stats tab, verify radar chart renders with muscle groups on axes.

**Step 3: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx
git commit -m "feat: radar chart for muscle balance in analytics"
```

---

### Task 6: Stacked Area — Tonnage by Muscle Group (Analytics)

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx`

**Step 1: Add stacked area chart after radar chart**

Inside the same StatsTab, after the radar chart section:

```typescript
{/* Stacked area — tonnage by muscle group over time */}
{(() => {
  if (!weeklyTrend || weeklyTrend.length === 0) return null

  // Group by muscle from muscleVolume data
  const muscleNames = [...new Set(Object.keys(muscleFreq).map(Number))]
  if (muscleNames.length === 0) return null

  // Build series: one per muscle group with weekly tonnage
  const series = muscleNames.map(mg => ({
    name: MUSCLE_LABELS[mg] || `Группа ${mg}`,
    data: weeklyTrend.map(w => {
      const mv = w.muscleVolumes?.find((v: any) => v.muscleGroup === mg)
      return mv?.totalTonnage ?? 0
    }),
  })).filter(s => s.data.some(v => v > 0))

  const categories = weeklyTrend.map(w => `Нед ${w.weekNumber}`)

  return (
    <div className="analytics-section">
      <h4>Тоннаж по группам мышц</h4>
      <div ref={el => {
        if (!el || el.dataset.rendered) return
        el.dataset.rendered = '1'
        new ApexCharts(el, baseChartOptions({
          chart: { type: 'area', height: 300, stacked: true },
          series,
          xaxis: { categories },
          yaxis: { title: { text: 'кг' } },
          fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
          dataLabels: { enabled: false },
          legend: { position: 'top', fontSize: '10px' },
        })).render()
      }} />
    </div>
  )
})()}
```

**Step 2: Build and commit**

```bash
npx vite build
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx
git commit -m "feat: stacked area chart — tonnage by muscle group"
```

---

### Task 7: Enhanced Calendar Heatmap — Intensity Colors

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx` — `CalendarHeatmap` component
- Modify: `src/BloodTracker.Api/wwwroot/css/workout-diary.css`

**Step 1: Update CalendarHeatmap to use intensity levels**

Find `CalendarHeatmap` component. Update the cell rendering to use 4 intensity levels based on tonnage:

```typescript
// Inside CalendarHeatmap cell rendering
const dayData = workoutDates.find(d => d.date === dateStr)
const tonnage = dayData?.tonnage ?? 0
const maxTonnage = Math.max(...workoutDates.map(d => d.tonnage ?? 0), 1)
const intensity = tonnage === 0 ? 0 : tonnage < maxTonnage * 0.25 ? 1 : tonnage < maxTonnage * 0.5 ? 2 : tonnage < maxTonnage * 0.75 ? 3 : 4

// Cell className:
className={`heatmap-cell heatmap-level-${intensity}`}
title={tonnage > 0 ? `${dateStr}: ${tonnage.toFixed(0)} кг` : dateStr}
```

**Step 2: Add intensity CSS**

```css
.heatmap-level-0 { background: rgba(255, 255, 255, 0.03); }
.heatmap-level-1 { background: rgba(74, 246, 38, 0.15); }
.heatmap-level-2 { background: rgba(74, 246, 38, 0.35); }
.heatmap-level-3 { background: rgba(74, 246, 38, 0.6); }
.heatmap-level-4 { background: rgba(74, 246, 38, 0.85); box-shadow: 0 0 4px rgba(74, 246, 38, 0.3); }
```

**Step 3: Build and commit**

```bash
npx vite build
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx src/BloodTracker.Api/wwwroot/css/workout-diary.css
git commit -m "feat: intensity-based calendar heatmap"
```

---

### Task 8: Final Build + Visual Test

**Step 1: Full rebuild**

```bash
cd src/BloodTracker.Api/wwwroot && npx vite build
```

**Step 2: Test at 4 viewports**

Open browser, test at: 1280px (desktop), 768px (tablet), 480px (mobile), 360px (tiny).

Verify:
- Exercise carousel: zero layout jumps between all muscle groups
- ASCII art fits container at all viewports
- History cards show muscle tags and comparison bars
- Analytics: radar chart, stacked area, intensity calendar all render
- No console errors (except known `previousExercise` 404)

**Step 3: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: workout UI redesign — responsive ASCII, rich history cards, analytics charts"
```
