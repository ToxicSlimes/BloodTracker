# Analytics ASCII Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ApexCharts in УПРАЖНЕНИЯ and МЫШЦЫ analytics tabs with ASCII tables, progress bars, and inline SVG sparklines.

**Architecture:** New backend endpoint for aggregated muscle group data. Frontend rewrites ExercisesTab (metric cards 2x2 + history table) and MusclesTab (ASCII leaderboard). Shared components: SvgSparkline, AsciiTable, AsciiBar.

**Tech Stack:** .NET 8 / MediatR (backend), React / TypeScript (frontend), CSS custom properties

---

### Task 1: Backend — AllMuscleGroups Query + Handler + Controller

**Files:**
- Modify: `src/BloodTracker.Application/WorkoutDiary/Queries/AnalyticsQueries.cs`
- Modify: `src/BloodTracker.Application/WorkoutDiary/Handlers/AnalyticsHandlers.cs`
- Modify: `src/BloodTracker.Application/WorkoutDiary/Dto/AnalyticsDtos.cs`
- Modify: `src/BloodTracker.Api/Controllers/ApiControllers.cs`

**Step 1: Add DTOs**

In `AnalyticsDtos.cs`, add:

```csharp
public sealed class MuscleGroupSummaryDto
{
    public string MuscleGroup { get; init; } = "";
    public double TotalTonnage { get; init; }
    public int TotalSets { get; init; }
    public int TotalReps { get; init; }
    public double AvgTonnagePerWorkout { get; init; }
    public double AvgSetsPerWorkout { get; init; }
}

public sealed class AllMuscleGroupsStatsDto
{
    public List<MuscleGroupSummaryDto> Groups { get; init; } = new();
    public double TotalTonnage { get; init; }
    public int TotalSets { get; init; }
    public int TotalReps { get; init; }
}
```

**Step 2: Add Query**

In `AnalyticsQueries.cs`, add:

```csharp
public sealed record GetAllMuscleGroupStatsQuery(
    string UserId, DateTime? From, DateTime? To) : IRequest<AllMuscleGroupsStatsDto>;
```

**Step 3: Add Handler**

In `AnalyticsHandlers.cs`, add:

```csharp
public sealed class GetAllMuscleGroupStatsHandler(
    IWorkoutStatsRepository statsRepository,
    IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<GetAllMuscleGroupStatsQuery, AllMuscleGroupsStatsDto>
{
    public async Task<AllMuscleGroupsStatsDto> Handle(GetAllMuscleGroupStatsQuery request, CancellationToken ct)
    {
        var sessions = await sessionRepository.GetHistoryAsync(
            request.UserId, request.From, request.To, 0, 10000, ct);

        var completedSessions = sessions.Where(s => s.Status == WorkoutSessionStatus.Completed).ToList();
        var totalWorkouts = completedSessions.Count;

        var groupMap = new Dictionary<string, (double tonnage, int sets, int reps)>();

        foreach (var session in completedSessions)
        {
            foreach (var exercise in session.Exercises)
            {
                var key = exercise.MuscleGroup.ToString();
                var existing = groupMap.GetValueOrDefault(key);

                var exTonnage = exercise.Sets
                    .Where(s => s.ActualWeight.HasValue && s.ActualRepetitions.HasValue)
                    .Sum(s => (double)s.ActualWeight!.Value * s.ActualRepetitions!.Value);
                var exSets = exercise.Sets.Count(s => s.CompletedAt.HasValue);
                var exReps = exercise.Sets
                    .Where(s => s.ActualRepetitions.HasValue)
                    .Sum(s => s.ActualRepetitions!.Value);

                groupMap[key] = (existing.tonnage + exTonnage, existing.sets + exSets, existing.reps + exReps);
            }
        }

        var groups = groupMap
            .Select(kv => new MuscleGroupSummaryDto
            {
                MuscleGroup = kv.Key,
                TotalTonnage = Math.Round(kv.Value.tonnage, 1),
                TotalSets = kv.Value.sets,
                TotalReps = kv.Value.reps,
                AvgTonnagePerWorkout = totalWorkouts > 0 ? Math.Round(kv.Value.tonnage / totalWorkouts, 1) : 0,
                AvgSetsPerWorkout = totalWorkouts > 0 ? Math.Round((double)kv.Value.sets / totalWorkouts, 1) : 0,
            })
            .OrderByDescending(g => g.TotalTonnage)
            .ToList();

        return new AllMuscleGroupsStatsDto
        {
            Groups = groups,
            TotalTonnage = Math.Round(groups.Sum(g => g.TotalTonnage), 1),
            TotalSets = groups.Sum(g => g.TotalSets),
            TotalReps = groups.Sum(g => g.TotalReps),
        };
    }
}
```

**Step 4: Add Controller endpoint**

In `ApiControllers.cs`, add to `AnalyticsController`:

```csharp
[HttpGet("all-muscle-groups")]
[ProducesResponseType(typeof(AllMuscleGroupsStatsDto), StatusCodes.Status200OK)]
public async Task<ActionResult<AllMuscleGroupsStatsDto>> GetAllMuscleGroupStats(
    [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct = default)
    => Ok(await mediator.Send(new GetAllMuscleGroupStatsQuery(UserId, from, to), ct));
```

**Step 5: Verify**

```bash
cd src/BloodTracker.Api && dotnet build
```
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add src/BloodTracker.Application/ src/BloodTracker.Api/Controllers/
git commit -m "feat(api): add GET /analytics/all-muscle-groups endpoint"
```

---

### Task 2: Frontend Types + Endpoint Registration

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/types/workouts.ts`
- Modify: `src/BloodTracker.Api/wwwroot/js/endpoints.ts`

**Step 1: Add TypeScript types**

In `workouts.ts`, add after `MuscleGroupProgressDto`:

```typescript
export interface MuscleGroupSummaryDto {
  muscleGroup: string
  totalTonnage: number
  totalSets: number
  totalReps: number
  avgTonnagePerWorkout: number
  avgSetsPerWorkout: number
}

export interface AllMuscleGroupsStatsDto {
  groups: MuscleGroupSummaryDto[]
  totalTonnage: number
  totalSets: number
  totalReps: number
}
```

**Step 2: Register endpoint**

In `endpoints.ts`, add to `analytics` object:

```typescript
allMuscleGroups: (from?: string, to?: string) => {
    let url = '/analytics/all-muscle-groups'
    const params: string[] = []
    if (from) params.push(`from=${from}`)
    if (to) params.push(`to=${to}`)
    return params.length ? `${url}?${params.join('&')}` : url
},
```

**Step 3: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/types/ src/BloodTracker.Api/wwwroot/js/endpoints.ts
git commit -m "feat: add AllMuscleGroupsStatsDto type + endpoint registration"
```

---

### Task 3: Shared Components — SvgSparkline + AsciiBar

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx`

**Step 1: Add SvgSparkline component**

Add after the `ApexChart` component (keep ApexChart — it's used by StatsTab):

```typescript
function SvgSparkline({ data, width = 120, height = 30 }: { data: number[]; width?: number; height?: number }) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--phosphor-green)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--phosphor-green)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkFill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--phosphor-green)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
```

**Step 2: Add AsciiBar component**

```typescript
function AsciiBar({ value, max, width = 20 }: { value: number; max: number; width?: number }) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0
  const empty = width - filled
  return (
    <span className="ascii-bar">
      <span className="ascii-bar-filled">{'█'.repeat(filled)}</span>
      <span className="ascii-bar-empty">{'░'.repeat(empty)}</span>
    </span>
  )
}
```

**Step 3: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx
git commit -m "feat: add SvgSparkline + AsciiBar shared components"
```

---

### Task 4: Rewrite ExercisesTab — Metric Cards + History Table

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx`

**Step 1: Replace the entire ExercisesTab function**

Replace from `function ExercisesTab()` to the closing `}` before `// RECORDS TAB` with:

```typescript
function ExercisesTab() {
  const [exerciseNames, setExerciseNames] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [selectedRange, setSelectedRange] = useState('90d')
  const [data, setData] = useState<ExerciseProgressDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<UserExercisePRDto[]>(ENDPOINTS.analytics.exercisePRs)
      .then(prs => {
        const names = prs.map(p => p.exerciseName)
        setExerciseNames(names)
        if (names.length > 0) setSelectedExercise(names[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedExercise) return
    setLoading(true)
    const { from, to } = getDateRange(selectedRange)
    api<ExerciseProgressDto>(ENDPOINTS.analytics.exerciseProgress(selectedExercise, from, to))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selectedExercise, selectedRange])

  if (loading && exerciseNames.length === 0) {
    return <div className="loading">Загрузка...</div>
  }
  if (exerciseNames.length === 0) {
    return <div className="analytics-empty">Нет данных об упражнениях. Завершите хотя бы одну тренировку.</div>
  }

  const pts = data?.dataPoints || []
  const last = pts.length > 0 ? pts[pts.length - 1] : null
  const prev = pts.length > 1 ? pts[pts.length - 2] : null

  function delta(cur: number | undefined, prv: number | undefined) {
    if (cur == null || prv == null || prv === 0) return null
    const pct = Math.round(((cur - prv) / prv) * 100)
    if (pct === 0) return null
    return pct
  }

  function DeltaBadge({ d }: { d: number | null }) {
    if (d == null) return null
    const cls = d > 0 ? 'delta-up' : 'delta-down'
    return <span className={`metric-delta ${cls}`}>{d > 0 ? `▲+${d}%` : `▼${d}%`}</span>
  }

  function MetricCard({ title, value, unit, d, maxVal, avgVal, sparkData }: {
    title: string; value: string; unit: string; d: number | null
    maxVal: string; avgVal: string; sparkData: number[]
  }) {
    return (
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-card-title">{title}</span>
          <DeltaBadge d={d} />
        </div>
        <div className="metric-card-value">{value} <span className="metric-card-unit">{unit}</span></div>
        <div className="metric-card-stats">max: {maxVal}  avg: {avgVal}</div>
        <SvgSparkline data={sparkData} width={100} height={24} />
      </div>
    )
  }

  const weights = pts.map(p => p.maxWeight)
  const e1rms = pts.map(p => p.bestEstimated1RM)
  const reps = pts.map(p => p.totalReps)
  const tonnages = pts.map(p => p.totalTonnage)

  const maxOf = (arr: number[]) => arr.length ? Math.max(...arr) : 0
  const avgOf = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0

  return (
    <>
      <div className="analytics-controls">
        <select className="analytics-select" value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
          {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <DateRangeSelector value={selectedRange} onChange={setSelectedRange} />
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : !pts.length ? (
        <div className="analytics-empty">Нет данных за выбранный период.</div>
      ) : (
        <>
          <div className="metric-cards-grid">
            <MetricCard title="МАКС. ВЕС" value={last ? String(last.maxWeight) : '—'}
              unit="кг" d={delta(last?.maxWeight, prev?.maxWeight)}
              maxVal={String(maxOf(weights))} avgVal={String(avgOf(weights))} sparkData={weights} />
            <MetricCard title="РАСЧ. 1RM" value={last ? last.bestEstimated1RM.toFixed(1) : '—'}
              unit="кг" d={delta(last?.bestEstimated1RM, prev?.bestEstimated1RM)}
              maxVal={maxOf(e1rms).toFixed(1)} avgVal={avgOf(e1rms).toFixed(1)} sparkData={e1rms} />
            <MetricCard title="ОБЪЁМ" value={last ? String(last.totalReps) : '—'}
              unit="повт" d={delta(last?.totalReps, prev?.totalReps)}
              maxVal={String(maxOf(reps))} avgVal={String(avgOf(reps))} sparkData={reps} />
            <MetricCard title="ТОННАЖ" value={last ? formatNumber(Math.round(last.totalTonnage)) : '—'}
              unit="кг" d={delta(last?.totalTonnage, prev?.totalTonnage)}
              maxVal={formatNumber(maxOf(tonnages))} avgVal={formatNumber(avgOf(tonnages))} sparkData={tonnages} />
          </div>

          {pts.length > 0 && (
            <div className="ascii-table-wrap">
              <table className="ascii-table">
                <thead>
                  <tr>
                    <th>Дата</th><th>Вес</th><th>1RM</th><th>Повт</th><th>Тоннаж</th>
                    {pts[0].averageRPE != null && <th>RPE</th>}
                  </tr>
                </thead>
                <tbody>
                  {pts.map((p, i) => {
                    const pr = i > 0 && p.maxWeight > pts[i - 1].maxWeight
                    return (
                      <tr key={p.date} className={pr ? 'ascii-table-pr' : ''}>
                        <td>{formatShortDate(p.date)}</td>
                        <td>{p.maxWeight}{pr ? ' ▲' : ''}</td>
                        <td>{p.bestEstimated1RM.toFixed(1)}</td>
                        <td>{p.totalReps}</td>
                        <td>{formatNumber(Math.round(p.totalTonnage))}</td>
                        {p.averageRPE != null && <td>{p.averageRPE.toFixed(1)}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data?.currentPR != null && (() => {
            const pr = data.currentPR
            const weight = typeof pr === 'object' && pr !== null ? (pr as any).bestWeight : pr
            if (weight == null || typeof weight === 'object') return null
            return (
              <div className="analytics-pr-card">
                <span className="analytics-pr-icon">{'\uD83C\uDFC6'}</span>
                <span className="analytics-pr-text">Текущий PR: <strong>{String(weight)} кг</strong></span>
              </div>
            )
          })()}
        </>
      )}
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx
git commit -m "feat: rewrite ExercisesTab with metric cards + ASCII history table"
```

---

### Task 5: Rewrite MusclesTab — ASCII Leaderboard

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx`

**Step 1: Add import for new type** (at top of file, in the import block)

Add `AllMuscleGroupsStatsDto` to the imports from `workouts.js`.

**Step 2: Replace the entire MusclesTab function**

Replace from `function MusclesTab()` to its closing `}` before the Error Boundary:

```typescript
function MusclesTab() {
  const [selectedRange, setSelectedRange] = useState('90d')
  const [data, setData] = useState<AllMuscleGroupsStatsDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const { from, to } = getDateRange(selectedRange)
    api<AllMuscleGroupsStatsDto>(ENDPOINTS.analytics.allMuscleGroups(from, to))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selectedRange])

  if (loading) return <div className="loading">Загрузка...</div>
  if (!data || data.groups.length === 0) {
    return (
      <>
        <div className="analytics-controls">
          <DateRangeSelector value={selectedRange} onChange={setSelectedRange} />
        </div>
        <div className="analytics-empty">Нет данных по мышечным группам.</div>
      </>
    )
  }

  const maxTonnage = Math.max(...data.groups.map(g => g.totalTonnage), 1)

  return (
    <>
      <div className="analytics-controls">
        <DateRangeSelector value={selectedRange} onChange={setSelectedRange} />
      </div>

      <div className="ascii-section-title">{'\u2694'} МЫШЕЧНЫЙ БАЛАНС</div>

      <div className="ascii-table-wrap">
        <table className="ascii-table">
          <thead>
            <tr>
              <th>Мышца</th><th>Тоннаж</th><th>Avg/тр</th><th>Подх</th><th style={{minWidth: '140px'}}></th>
            </tr>
          </thead>
          <tbody>
            {data.groups.map(g => (
              <tr key={g.muscleGroup}>
                <td>{MUSCLE_GROUP_LABELS[g.muscleGroup] || g.muscleGroup}</td>
                <td>{formatNumber(Math.round(g.totalTonnage))} кг</td>
                <td>{formatNumber(Math.round(g.avgTonnagePerWorkout))}</td>
                <td>{g.totalSets}</td>
                <td><AsciiBar value={g.totalTonnage} max={maxTonnage} width={18} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="ascii-table-total">
              <td>ИТОГО</td>
              <td>{formatNumber(Math.round(data.totalTonnage))} кг</td>
              <td></td>
              <td>{data.totalSets}</td>
              <td>{data.totalReps} повт</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
```

**Step 3: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/js/react/pages/WorkoutAnalyticsTab.tsx
git commit -m "feat: rewrite MusclesTab with ASCII leaderboard"
```

---

### Task 6: CSS — Metric Cards + ASCII Table Styles

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/css/workout-diary.css`

**Step 1: Add styles** at the end of the analytics section:

```css
/* ─── Metric Cards Grid ─── */
.metric-cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
}

.metric-card {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    font-family: var(--ascii-font-family);
}

.metric-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xs);
}

.metric-card-title {
    font-size: var(--font-size-2xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
}

.metric-delta {
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
}

.metric-delta.delta-up { color: var(--phosphor-green); }
.metric-delta.delta-down { color: #ff4444; }

.metric-card-value {
    font-size: var(--font-size-xl);
    color: var(--primary-color);
    font-weight: var(--font-weight-bold);
    line-height: 1.2;
}

.metric-card-unit {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: var(--font-weight-normal);
}

.metric-card-stats {
    font-size: var(--font-size-2xs);
    color: var(--text-tertiary);
    margin-top: var(--space-xs);
    margin-bottom: var(--space-xs);
}

.sparkline-svg {
    display: block;
    width: 100%;
    max-width: 120px;
}

/* ─── ASCII Table ─── */
.ascii-table-wrap {
    overflow-x: auto;
    margin-bottom: var(--space-lg);
    -webkit-overflow-scrolling: touch;
}

.ascii-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--ascii-font-family);
    font-size: var(--font-size-xs);
    color: var(--text-primary);
}

.ascii-table th {
    text-align: left;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--primary-color);
    color: var(--text-secondary);
    text-transform: uppercase;
    font-size: var(--font-size-2xs);
    letter-spacing: var(--letter-spacing-normal);
    white-space: nowrap;
}

.ascii-table td {
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid rgba(74, 246, 38, 0.1);
    white-space: nowrap;
}

.ascii-table tbody tr:hover {
    background: rgba(74, 246, 38, 0.03);
}

.ascii-table-pr td {
    color: var(--torch-gold);
}

.ascii-table-total td {
    border-top: 1px solid var(--primary-color);
    font-weight: var(--font-weight-bold);
    color: var(--primary-color);
}

.ascii-section-title {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
    margin-bottom: var(--space-md);
    font-family: var(--ascii-font-family);
}

/* ─── ASCII Bar ─── */
.ascii-bar {
    font-family: var(--ascii-font-family);
    font-size: var(--font-size-xs);
    line-height: 1;
}

.ascii-bar-filled { color: var(--phosphor-green); }
.ascii-bar-empty { color: rgba(74, 246, 38, 0.15); }

/* ─── Responsive ─── */
@media (max-width: 480px) {
    .metric-cards-grid {
        grid-template-columns: 1fr;
    }
}
```

**Step 2: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/css/workout-diary.css
git commit -m "feat: add CSS for metric cards, ASCII tables, and progress bars"
```

---

### Task 7: Build + SW Cache Bump + Verify

**Files:**
- Modify: `src/BloodTracker.Api/wwwroot/sw.js`

**Step 1: Bump SW cache version**

In `sw.js`, change:
```javascript
const CACHE_STATIC = 'bt-static-v14'
```
to:
```javascript
const CACHE_STATIC = 'bt-static-v15'
```

**Step 2: Build**

```bash
cd src/BloodTracker.Api/wwwroot && npx vite build
```

**Step 3: Verify in browser**

1. Navigate to `http://localhost:5000`
2. Reload twice (SW activation cycle)
3. Go to ТРЕНИРОВКИ → АНАЛИТИКА → УПРАЖНЕНИЯ — should show 2x2 metric cards + history table
4. Click МЫШЦЫ — should show ASCII leaderboard with all muscle groups
5. Check console for errors — should be 0 React errors

**Step 4: Commit**

```bash
git add src/BloodTracker.Api/wwwroot/sw.js src/BloodTracker.Api/wwwroot/dist/
git commit -m "feat: analytics ASCII redesign — build + SW v15"
```
