# Analytics Tabs ASCII Redesign — Design Document

**Goal:** Replace ApexCharts in УПРАЖНЕНИЯ and МЫШЦЫ analytics tabs with ASCII-first UI (tables, progress bars, inline SVG sparklines) for better readability, information density, and retro terminal theme consistency.

**Architecture:** Frontend-only for УПРАЖНЕНИЯ, frontend + new backend endpoint for МЫШЦЫ.

---

## УПРАЖНЕНИЯ Tab Redesign

### Current State
- 3 ApexCharts (line for weight, line for 1RM, bar for volume)
- With 1 data point: empty boxes with a single dot — useless
- PR card at bottom

### New Design: Metric Cards Grid (2x2) + History Table

**4 Metric Cards** in a 2x2 grid:

| Card | Data Source |
|------|-----------|
| МАКС. ВЕС | `dataPoints[last].maxWeight` |
| РАСЧ. 1RM | `dataPoints[last].bestEstimated1RM` |
| ОБЪЁМ (повт) | `dataPoints[last].totalReps` |
| ТОННАЖ (кг) | `dataPoints[last].totalTonnage` |

Each card shows:
- Current value (last dataPoint)
- Delta vs previous (`▲+25%` / `▼-20%`) in green/red
- `max: X  avg: Y` computed from all dataPoints
- Inline SVG sparkline (~120x30px polyline)

**ASCII History Table** below cards — all dataPoints in a box-drawing table:
```
┌──────────┬───────┬───────┬──────┬───────┐
│ Дата     │ Вес   │ 1RM   │ Повт │ Тонн  │
├──────────┼───────┼───────┼──────┼───────┤
│ 20 фев   │ 80    │ 107   │  30  │ 3200  │
│ 21 фев   │ 100 ▲ │ 125 ▲ │  24  │ 2400  │
└──────────┴───────┴───────┴──────┴───────┘
```

**PR card** remains at bottom (existing design works).

**ApexCharts**: Removed entirely from this tab.

---

## МЫШЦЫ Tab Redesign

### Current State
- Dropdown to select ONE muscle group
- 1 ApexCharts area chart (weekly tonnage)
- 3 stat cards (total tonnage, sets, reps)
- Bottom half empty

### New Design: ASCII Muscle Leaderboard

Remove dropdown. Show ALL muscle groups in a ranked ASCII table:

```
⚔ МЫШЕЧНЫЙ БАЛАНС  [90 дней]

┌─────────────┬───────┬──────┬──────┬───────────────────┐
│ Мышца       │ Тонн  │ Avg  │ Подх │                   │
├─────────────┼───────┼──────┼──────┼───────────────────┤
│ Грудь       │ 4200  │  700 │  18  │ ███████████████████ │
│ Квадрицепс  │ 2400  │  600 │  12  │ ███████████░░░░░░░░ │
│ Плечи       │ 1200  │  400 │   9  │ █████░░░░░░░░░░░░░░ │
│ Трицепс     │  900  │  300 │   6  │ ████░░░░░░░░░░░░░░░ │
└─────────────┴───────┴──────┴──────┴───────────────────┘
Итого: 8700 кг │ Avg: 580/тр │ 45 подходов
```

- Sorted by totalTonnage descending
- ASCII bar width proportional to max group
- `█` filled, `░` empty, ~20 chars wide
- Summary row at bottom
- DateRangeSelector preserved

**ApexCharts**: Removed entirely from this tab.

---

## New Backend Endpoint

`GET /api/v1/analytics/all-muscle-groups?from=&to=`

### Response Type
```typescript
interface MuscleGroupSummaryDto {
  muscleGroup: string
  totalTonnage: number
  totalSets: number
  totalReps: number
  avgTonnagePerWorkout: number
  avgSetsPerWorkout: number
}

interface AllMuscleGroupsStatsDto {
  groups: MuscleGroupSummaryDto[]
  totalTonnage: number
  totalSets: number
  totalReps: number
}
```

### Implementation
- Query all completed workout sessions in date range
- Group exercises by muscleGroup
- Sum tonnage, sets, reps per group
- Calculate averages (÷ total workouts in range)
- Sort by totalTonnage descending

---

## Shared Components

### SVG Sparkline
- Simple `<svg>` element, ~120x30px
- `<polyline>` from data array mapped to x/y
- Stroke: `var(--phosphor-green)` with subtle gradient fill
- No library dependency — pure JSX

### ASCII Table Renderer
- React component rendering `<pre>` or `<div>` with monospace
- Box-drawing characters: `┌─┬┐│├─┼┤└─┴┘`
- CSS: `font-family: var(--ascii-font-family)`, `color: var(--phosphor-green)`

### ASCII Progress Bar
- `█` for filled, `░` for empty
- Width: 20 characters
- Color: `var(--phosphor-green)` via CSS

---

## Files to Modify

| File | Changes |
|------|---------|
| `WorkoutAnalyticsTab.tsx` | Rewrite ExercisesTab + MusclesTab, add Sparkline/AsciiTable components |
| `endpoints.ts` | Add `allMuscleGroups` endpoint |
| `workouts.ts` | Add `AllMuscleGroupsStatsDto` type |
| `ApiControllers.cs` | Add `GetAllMuscleGroupStats` action |
| `Interfaces.cs` | Add query interface if needed |
| `Handlers/` | Add `GetAllMuscleGroupStatsQuery` + handler |
| `workout-diary.css` | Add ASCII table/card styles |
| `sw.js` | Bump cache version |
