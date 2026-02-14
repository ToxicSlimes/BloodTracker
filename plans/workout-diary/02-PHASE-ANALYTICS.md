# Phase 2: Analytics & History
> BloodTracker — Workout Diary
> Estimated effort: 2-3 дня
> Dependencies: Phase 1 (Core)
> Status: 📋 Planning

---

## Что входит в Phase 2

| # | Задача | Effort | Приоритет |
|---|--------|--------|-----------|
| 1 | PersonalRecord entity + detection logic | 0.5 дня | P0 |
| 2 | ExerciseHistory entity + update logic | 0.5 дня | P0 |
| 3 | WorkoutStatistics aggregation | 0.5 дня | P1 |
| 4 | "What to beat" + progressive overload hints | 0.5 дня | P0 |
| 5 | Workout comparison (vs previous, vs average) | 0.5 дня | P0 |
| 6 | Analytics Screen (charts) | 1 день | P1 |
| 7 | Workout Diary (History) Screen | 0.5 дня | P0 |
| 8 | Past Workout Details Screen | 0.5 дня | P1 |

---

## 1. Personal Record Detection

### Entities

```csharp
public class PersonalRecord
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string ExerciseName { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public PersonalRecordType RecordType { get; set; }
    
    public decimal? Weight { get; set; }
    public int? Repetitions { get; set; }
    public decimal? Tonnage { get; set; }
    public decimal? Estimated1RM { get; set; }
    
    public Guid SessionId { get; set; }
    public Guid SetId { get; set; }
    public DateTime AchievedAt { get; set; }
    
    public decimal? PreviousValue { get; set; }
    public DateTime? PreviousRecordDate { get; set; }
}

public enum PersonalRecordType
{
    MaxWeight = 0,
    MaxReps = 1,           // Max reps at any weight
    MaxEstimated1RM = 2,   // Epley formula
    MaxTonnage = 3,        // Max tonnage in single exercise session
    MaxVolume = 4          // Max total reps in single exercise session
}
```

### Detection Logic (CheckPersonalRecordsCommand)

```csharp
public async Task Handle(CheckPersonalRecordsCommand request, CancellationToken ct)
{
    var records = _db.GetCollection<PersonalRecord>("personalRecords");
    var session = _db.GetCollection<WorkoutSession>("workoutSessions").FindById(request.SessionId);
    var exercise = session.Exercises.First(e => e.Sets.Any(s => s.Id == request.SetId));
    var set = exercise.Sets.First(s => s.Id == request.SetId);
    
    if (set.IsWarmup) return; // Warmup sets don't count for PRs
    
    var newPRs = new List<PersonalRecord>();
    
    // Check MaxWeight
    var currentMaxWeight = records.Query()
        .Where(r => r.UserId == request.UserId 
            && r.ExerciseName == exercise.Name 
            && r.RecordType == PersonalRecordType.MaxWeight)
        .FirstOrDefault();
    
    if (currentMaxWeight == null || (set.ActualWeight ?? 0) > (currentMaxWeight.Weight ?? 0))
    {
        newPRs.Add(new PersonalRecord
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            ExerciseName = exercise.Name,
            MuscleGroup = exercise.MuscleGroup,
            RecordType = PersonalRecordType.MaxWeight,
            Weight = set.ActualWeight,
            Repetitions = set.ActualRepetitions,
            SessionId = session.Id,
            SetId = set.Id,
            AchievedAt = DateTime.UtcNow,
            PreviousValue = currentMaxWeight?.Weight,
            PreviousRecordDate = currentMaxWeight?.AchievedAt
        });
    }
    
    // Check MaxEstimated1RM (Epley)
    if (set.Estimated1RM > 0)
    {
        var current1RM = records.Query()
            .Where(r => r.UserId == request.UserId 
                && r.ExerciseName == exercise.Name 
                && r.RecordType == PersonalRecordType.MaxEstimated1RM)
            .FirstOrDefault();
        
        if (current1RM == null || set.Estimated1RM > (current1RM.Estimated1RM ?? 0))
        {
            newPRs.Add(new PersonalRecord
            {
                /* ... similar to above with RecordType.MaxEstimated1RM ... */
                Estimated1RM = set.Estimated1RM,
                PreviousValue = current1RM?.Estimated1RM
            });
        }
    }
    
    // Check MaxReps (at same or higher weight)
    // ... similar pattern ...
    
    // Save PRs and mark set
    foreach (var pr in newPRs)
    {
        // Remove old record of same type
        records.DeleteMany(r => r.UserId == pr.UserId 
            && r.ExerciseName == pr.ExerciseName 
            && r.RecordType == pr.RecordType);
        records.Insert(pr);
    }
    
    // Return PR info for UI celebration
    if (newPRs.Any())
    {
        await _mediator.Publish(new PersonalRecordAchievedNotification
        {
            Records = newPRs,
            ExerciseName = exercise.Name
        });
    }
}
```

### PR Response in CompleteSet

Phase 1 returned `IsNewPR: false`. Now we check:
```csharp
// In CompleteSetCommand handler, after saving set:
var prResult = await _mediator.Send(new CheckPersonalRecordsCommand { ... });

return new CompleteSetResultDto
{
    Set = MapSetToDto(set),
    RestTimerSeconds = restSeconds,
    IsNewPR = prResult.NewRecords.Any(),
    PRMessage = prResult.NewRecords.Any() 
        ? $"🏆 NEW PR: {prResult.NewRecords.First().RecordType}" 
        : null,
    PRDetails = prResult.NewRecords.Select(r => new PRDetailDto
    {
        Type = r.RecordType.ToString(),
        Value = GetPRValue(r),
        PreviousValue = r.PreviousValue,
        Improvement = CalculateImprovement(r)
    }).ToList()
};
```

### PR Celebration UI

```
┌──────────────────────────────────────────┐
│                                          │
│   ⚔️  NEW RECORD FORGED!  ⚔️             │
│                                          │
│   Жим гантелей лёжа                      │
│   35kg × 10 reps                         │
│                                          │
│   Previous best: 32.5kg × 10             │
│   Improvement: +2.5kg (+7.7%)            │
│                                          │
│   Est. 1RM: 46.7kg (new PR!)            │
│                                          │
│   "A weapon of legend has been           │
│    forged in the dungeon depths"         │
│                                          │
│              [NICE!]                     │
│                                          │
└──────────────────────────────────────────┘
```

Animation: border glow pulse (CSS keyframe, gold color #ffd700), 3 seconds, then auto-dismiss.

---

## 2. ExerciseHistory

### Entity & Update Logic

```csharp
public class ExerciseHistory
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string ExerciseName { get; set; }
    
    public DateTime? LastPerformedAt { get; set; }
    public List<HistoricalSet> RecentSets { get; set; } = new(); // Last 5 sessions
    
    public decimal? BestWeight { get; set; }
    public int? BestReps { get; set; }
    public decimal? BestEstimated1RM { get; set; }
    public decimal? BestTonnage { get; set; }
    
    public decimal? AvgWeight { get; set; }    // Last 10 sessions
    public decimal? TrendPercent { get; set; } // % change over last month
}

public class HistoricalSet
{
    public DateTime Date { get; set; }
    public Guid SessionId { get; set; }
    public decimal? Weight { get; set; }
    public int? Reps { get; set; }
    public int? RPE { get; set; }
}
```

**Updated after each CompleteSession** (or CompleteSet for live "What to beat"):
```csharp
public async Task Handle(UpdateExerciseHistoryCommand request, CancellationToken ct)
{
    var history = _db.GetCollection<ExerciseHistory>("exerciseHistory");
    var entry = history.Query()
        .Where(h => h.UserId == request.UserId && h.ExerciseName == request.ExerciseName)
        .FirstOrDefault() ?? new ExerciseHistory
    {
        Id = Guid.NewGuid(),
        UserId = request.UserId,
        ExerciseName = request.ExerciseName
    };
    
    // Get all completed sessions with this exercise (last 10)
    var sessions = _db.GetCollection<WorkoutSession>("workoutSessions");
    var relevant = sessions.Query()
        .Where(s => s.UserId == request.UserId && s.Status == WorkoutSessionStatus.Completed)
        .OrderByDescending(s => s.StartedAt)
        .ToList()
        .Where(s => s.Exercises.Any(e => e.Name == request.ExerciseName))
        .Take(10)
        .ToList();
    
    if (relevant.Any())
    {
        entry.LastPerformedAt = relevant.First().StartedAt;
        
        // Recent sets (last 5 sessions, best set from each)
        entry.RecentSets = relevant.Take(5).Select(s =>
        {
            var ex = s.Exercises.First(e => e.Name == request.ExerciseName);
            var bestSet = ex.Sets.Where(st => st.CompletedAt != null && !st.IsWarmup)
                .OrderByDescending(st => st.ActualWeight).First();
            return new HistoricalSet
            {
                Date = s.StartedAt,
                SessionId = s.Id,
                Weight = bestSet.ActualWeight,
                Reps = bestSet.ActualRepetitions,
                RPE = bestSet.RPE
            };
        }).ToList();
        
        // Bests
        var allSets = relevant.SelectMany(s => 
            s.Exercises.Where(e => e.Name == request.ExerciseName)
            .SelectMany(e => e.Sets.Where(st => st.CompletedAt != null && !st.IsWarmup)));
        
        entry.BestWeight = allSets.Max(s => s.ActualWeight);
        entry.BestReps = allSets.Max(s => s.ActualRepetitions);
        entry.BestEstimated1RM = allSets.Max(s => s.Estimated1RM);
        entry.AvgWeight = allSets.Average(s => s.ActualWeight ?? 0);
        
        // Trend: compare first vs last in window
        if (relevant.Count >= 2)
        {
            var oldest = relevant.Last();
            var newest = relevant.First();
            var oldMax = oldest.Exercises.First(e => e.Name == request.ExerciseName)
                .Sets.Where(s => !s.IsWarmup).Max(s => s.ActualWeight ?? 0);
            var newMax = newest.Exercises.First(e => e.Name == request.ExerciseName)
                .Sets.Where(s => !s.IsWarmup).Max(s => s.ActualWeight ?? 0);
            entry.TrendPercent = oldMax > 0 ? (newMax - oldMax) / oldMax * 100 : null;
        }
    }
    
    history.Upsert(entry);
}
```

---

## 3. "What to Beat" — Progressive Overload Hints

### Where it shows

In the Quick Set Logger (bottom sheet), above the input fields:

```
┌────────────────────────────────────────────────────────┐
│  PLANNED:    60kg × 10                                 │
│  LAST TIME:  60kg × 10  (Feb 7) ← tap to autofill     │
│  BEAT IT:    62.5kg×8  or  60kg×12      ← two options  │
└────────────────────────────────────────────────────────┘
```

### Logic

```typescript
function getProgressiveOverloadHint(
  exerciseName: string,
  history: ExerciseHistory,
  weightIncrement: number = 2.5
): { weightOption: string; repsOption: string } | null {
  if (!history?.recentSets?.length) return null;
  
  const lastBest = history.recentSets[0];
  if (!lastBest.weight || !lastBest.reps) return null;
  
  // Option 1: More weight, fewer reps (strength focus)
  const moreWeight = lastBest.weight + weightIncrement;
  const fewerReps = Math.max(1, lastBest.reps - 2);
  
  // Option 2: Same weight, more reps (volume focus)
  const sameWeight = lastBest.weight;
  const moreReps = lastBest.reps + 2;
  
  return {
    weightOption: `${moreWeight}kg×${fewerReps}`,
    repsOption: `${sameWeight}kg×${moreReps}`
  };
}
```

### Display Rules
- Show only if ExerciseHistory exists for this exercise
- "LAST TIME" tappable → auto-fills weight/reps fields
- "BEAT IT" is informational only (not tappable into fields)
- If last time was > 14 days ago, show "(14 days ago)" in yellow

---

## 4. Workout Comparison

### In Workout Summary Screen

```
┌─────── COMPARISON ───────────────────────────────────────┐
│                                                          │
│  vs PREVIOUS (Feb 7, same program day):                  │
│    Tonnage:  1,680 → 1,820 kg  (+140kg, +8.3%) 📈       │
│    Volume:   172 → 184 reps    (+12, +7.0%) 📈           │
│    Duration: 43m → 45m         (+2m)                     │
│    Density:  39.1 → 40.1 kg/min (+2.6%) 📈              │
│                                                          │
│  vs AVERAGE (last 10 workouts):                          │
│    Tonnage:  avg 1,720 → 1,820 (+5.8%) 📈               │
│    Volume:   avg 178 → 184     (+3.4%)                   │
│                                                          │
│  EXERCISE HIGHLIGHTS:                                    │
│    Жим гантелей:  35kg×10 vs prev 32.5kg×10 (+7.7%)🏆   │
│    Жим наклонный: 65kg×8 = prev 65kg×8 (same)           │
│    Разведение:    15kg×12 vs prev 12.5kg×12 (+20%)🏆    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Comparison indicators
```
📈 = improved > 5%
📉 = declined > 5%
🏆 = new PR
→  = neutral (±5%)
```

---

## 5. Analytics Screen

### Tab: By Exercise

**Charts (Chart.js, dark theme):**

1. **Max Weight Progression** — line chart
```
  kg
  40│                              ●──
  35│                    ●────●───●
  30│         ●────●────●
  25│●───●───●
    └──┬──┬──┬──┬──┬──┬──┬──┬──┬──
     Nov Dec Jan Jan Feb Feb Feb Mar
```

2. **Volume per Workout** — bar chart
```
  reps
  45│         ██
  40│      ██ ██ ██    ██ ██
  35│   ██ ██ ██ ██ ██ ██ ██ ██
  30│██ ██ ██ ██ ██ ██ ██ ██ ██
    └─────────────────────────────
     Nov Dec Jan Jan Feb Feb Feb
```

3. **Estimated 1RM** — line chart (same format as max weight)
4. **Set Weight Distribution** — scatter plot (weight vs reps, colored by session)

### Tab: By Muscle Group

1. **Tonnage Timeline** — stacked area chart (exercises stacked)
2. **Frequency Heatmap** — calendar grid (like GitHub contributions)
3. **Exercise Breakdown** — horizontal bar chart (% of total tonnage per exercise)

### Tab: Personal Records

```
╔══════════════════════════════════════════════════════════════╗
║  PERSONAL RECORDS                                    [BACK] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Filter: [All Exercises ▼]  [All Types ▼]                   ║
║                                                              ║
║  ┌── Жим гантелей лёжа ─────────────────────────────────┐  ║
║  │  🏆 Max Weight:    35kg × 10      Feb 14  (+7.7%)     │  ║
║  │  🏆 Max Est. 1RM:  46.7kg         Feb 14  (+5.4%)     │  ║
║  │  🏆 Max Volume:    45 reps        Jan 24  (+12.5%)    │  ║
║  │  🏆 Max Tonnage:   1,350kg        Feb 14  (+6.3%)     │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── Жим на наклонной ──────────────────────────────────┐  ║
║  │  🏆 Max Weight:    65kg × 8       Feb 14              │  ║
║  │  🏆 Max Est. 1RM:  82.3kg         Feb 14              │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── PR Timeline ───────────────────────────────────────┐  ║
║  │  Feb 14  🏆 Жим гантелей: 35kg (was 32.5kg)          │  ║
║  │  Feb 14  🏆 Жим наклонный: 1RM 82.3kg (was 78kg)     │  ║
║  │  Feb 7   🏆 Разведение: 15kg×12 (was 12.5kg×12)      │  ║
║  │  Jan 24  🏆 Жим гантелей: 32.5kg (was 30kg)          │  ║
║  │  ...                                                   │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Tab: Stats

```
╔══════════════════════════════════════════════════════════════╗
║  STATS — Last 30 days                               [BACK] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌── OVERVIEW ──────────────────────────────────────────┐  ║
║  │                                                       │  ║
║  │  Total Workouts:    12          Avg/week: 3.0        │  ║
║  │  Total Tonnage:     21,840 kg   Avg: 1,820 kg/wo    │  ║
║  │  Total Volume:      2,208 reps  Avg: 184 reps/wo    │  ║
║  │  Total Duration:    9h 15m      Avg: 46m/wo          │  ║
║  │  Avg Rest Time:     92s                               │  ║
║  │  Personal Records:  8                                 │  ║
║  │                                                       │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── MUSCLE FREQUENCY (workouts/week) ──────────────────┐  ║
║  │                                                       │  ║
║  │  Chest      ████████████████░░░░  2.0/wk             │  ║
║  │  Back       ████████████████░░░░  2.0/wk             │  ║
║  │  Shoulders  ████████░░░░░░░░░░░░  1.0/wk             │  ║
║  │  Legs       ████████░░░░░░░░░░░░  1.0/wk             │  ║
║  │  Biceps     ████████░░░░░░░░░░░░  1.0/wk             │  ║
║  │  Triceps    ████████████░░░░░░░░  1.5/wk             │  ║
║  │  Abs        ████░░░░░░░░░░░░░░░░  0.5/wk             │  ║
║  │                                                       │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── WORKOUT CALENDAR ──────────────────────────────────┐  ║
║  │        Jan              Feb                          │  ║
║  │  Mon │ ░ █ ░ █   █ ░ █ ░                             │  ║
║  │  Tue │ ░ ░ ░ ░   ░ ░ ░ ░                             │  ║
║  │  Wed │ █ ░ █ ░   ░ █ ░ █                             │  ║
║  │  Thu │ ░ ░ ░ ░   ░ ░ ░ ░                             │  ║
║  │  Fri │ ░ █ ░ █   █ ░ █ ░                             │  ║
║  │  Sat │ ░ ░ ░ ░   ░ ░ ░ ░                             │  ║
║  │  Sun │ ░ ░ ░ ░   ░ ░ ░ ░                             │  ║
║  │                                                       │  ║
║  │  ░ = no workout  █ = workout day                     │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 6. Chart.js Configuration (Dark Theme)

```typescript
const chartDefaults: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#a0a0a0', font: { family: "'Courier New', monospace" } }
    },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#00ff41',
      bodyColor: '#ccc',
      borderColor: '#333',
      borderWidth: 1,
      titleFont: { family: "'Courier New', monospace" },
      bodyFont: { family: "'Courier New', monospace" }
    }
  },
  scales: {
    x: {
      ticks: { color: '#666', font: { family: "'Courier New', monospace", size: 10 } },
      grid: { color: '#222' }
    },
    y: {
      ticks: { color: '#666', font: { family: "'Courier New', monospace", size: 10 } },
      grid: { color: '#222' }
    }
  }
};

// Color palette (dungeon theme)
const colors = {
  primary: '#00ff41',    // matrix green
  secondary: '#ff6b35',  // orange
  accent: '#ffd700',     // gold (PRs)
  danger: '#ff3333',     // red
  muted: '#666',
  bg: '#0a0a1a',
  surface: '#1a1a2e',
  border: '#333'
};
```

---

## 7. Метрики и формулы (reference)

| Метрика | Формула | Пример |
|---------|---------|--------|
| Tonnage | weight × reps per set, sum | 30×10 + 32.5×10 = 625kg |
| Volume | sum of all reps | 10+10+10+10 = 40 |
| Intensity | tonnage / volume | 625/40 = 15.6 kg/rep |
| Est. 1RM (Epley) | weight × (1 + reps/30) | 35×(1+10/30) = 46.7kg |
| Est. 1RM (Brzycki) | weight × 36 / (37 − reps) | 35×36/(37-10) = 46.7kg |
| Est. 1RM (Mayhew) | 100 × weight / (52.2 + 41.9 × e^(-0.055 × reps)) | ~46.5kg |
| Est. 1RM (Wathen) | 100 × weight / (48.8 + 53.8 × e^(-0.075 × reps)) | ~46.6kg |
| **BEST e1RM** | **weighted avg(Epley, Brzycki) for 2-10 reps** | **(46.7+46.7)/2** |
| Avg Rest | avg(rest_seconds) | (90+95+100)/3 = 95s |
| Training Density | tonnage / duration_min | 1820/45 = 40.4 kg/min |
| Progress % | (new-old)/old × 100 | (35-32.5)/32.5 = +7.7% |
| Fatigue Index | last_RPE - first_RPE | 9-7 = 2 (moderate) |
| **INOL** | **reps / (100 − intensity%)** | **10/(100-85) = 0.67** |

### e1RM Formula Selection (NEW)

```csharp
public static decimal CalculateWeightedE1RM(decimal weight, int reps, string? exerciseCategory = null)
{
    if (reps <= 0 || weight <= 0) return 0;
    if (reps == 1) return weight;
    if (reps > 12) return 0; // Too inaccurate, show warning

    var epley = weight * (1 + (decimal)reps / 30m);
    var brzycki = weight * 36m / (37m - (decimal)reps);
    
    // For reps > 10, Epley tends to overestimate
    // For reps < 5, Brzycki tends to underestimate
    // Default: simple average
    // Exercise-type-specific weighting for better accuracy:
    return exerciseCategory switch
    {
        "squat" or "deadlift" => epley * 0.6m + brzycki * 0.4m,     // Epley better for legs
        "bench" or "press"    => epley * 0.4m + brzycki * 0.6m,     // Brzycki better for upper
        _                     => (epley + brzycki) / 2m              // Default: equal weight
    };
}
```

### INOL (Intensity Number of Lifts) — Overtraining Warning

```csharp
public static decimal CalculateINOL(int reps, decimal intensityPercent)
{
    if (intensityPercent >= 100) return 99; // Max effort
    return (decimal)reps / (100m - intensityPercent);
}

// Per-exercise per-session: optimal = 0.8, warning > 1.5, danger > 2.0
// Per-exercise per-week: optimal = 2.0, warning > 3.0, danger > 4.0
```

---

## 7a. Rep-PR Tracking (NEW — StrengthLog pattern)

PR не только по весу, но и по **повторениям для данного веса**.

**Пример:** Юзер обычно делает 80кг × 8. Сегодня сделал 80кг × 10 = **Rep PR!**

```csharp
// В CheckPersonalRecordsCommand, после check weight/e1RM:

// Check Rep-PR: best reps at this weight (±2.5kg bracket)
var weightBracket = Math.Round(set.ActualWeightKg.Value / 2.5m) * 2.5m;
var bracketKey = weightBracket.ToString("F1");

var exercisePR = prCache.FindOne(p => p.UserExerciseKey == $"{userId}_{exerciseName}");
if (exercisePR != null && exercisePR.RepPRsByWeight.TryGetValue(bracketKey, out var repPR))
{
    if (set.ActualRepetitions > repPR.Reps)
    {
        // NEW REP PR!
        exercisePR.RepPRsByWeight[bracketKey] = new RepPREntry
        {
            Reps = set.ActualRepetitions.Value,
            Date = DateTime.UtcNow
        };
        newPRs.Add(/* RepPR notification */);
    }
}
```

**UI hint перед подходом:**
```
┌─────────────────────────────────┐
│  Жим лёжа — 80kg               │
│  Your best: 10 reps (2 дня)    │  ← Rep-PR reference
│  Beat it? Go for 11!           │
└─────────────────────────────────┘
```

---

## 7b. Period Comparison (NEW)

Сравнение двух произвольных периодов:

```
┌──────────────────────────────────────────┐
│  PERIOD COMPARISON                        │
│                                           │
│  Period A: Jan 1-31    Period B: Feb 1-14 │
│  ───────────────────   ─────────────────  │
│  Sessions: 12          Sessions: 8        │
│  Volume: 24,500kg      Volume: 18,200kg   │
│  Avg e1RM: 95kg        Avg e1RM: 98kg ▲  │
│  Frequency: 3.0/wk     Frequency: 4.0/wk │
│                                           │
│  🟢 Strength: +3.2%                      │
│  🟢 Frequency: +33%                      │
│  🟡 Total volume: on track               │
└──────────────────────────────────────────┘
```

---

## 7c. e1RM Chart Rep-Range Filter (NEW — FitNotes pattern)

>12 повторений дают неточные e1RM оценки. Добавить фильтр:

```
┌─────────────────────────────────┐
│  e1RM Graph: Bench Press        │
│                                 │
│  Filter: [All] [3-5] [6-10]    │  ← Rep range filter
│          [Only heavy singles]   │
│                                 │
│  ⚠️ Points from 15+ reps are   │
│  shown faded (low accuracy)     │
└─────────────────────────────────┘
```

---

## 7d. "Almost PR!" Prediction (NEW)

Во время тренировки, если текущий вес within 5% от PR:

```
┌─────────────────────────────────┐
│  ⚡ So close to a PR!           │
│  Current: 77.5kg × 8           │
│  PR: 80kg × 8 (Jan 28)        │
│  Just 2.5kg away!              │
└─────────────────────────────────┘
```

Мотивирует попробовать на следующем подходе.

---

## 8. Checklist для Phase 2

```
Backend:
  □ PersonalRecord entity
  □ ExerciseHistory entity
  □ WorkoutStatistics entity
  □ CheckPersonalRecordsCommand (called from CompleteSet)
  □ UpdateExerciseHistoryCommand (called from CompleteSession)
  □ GetExerciseProgressQuery
  □ GetMuscleGroupProgressQuery
  □ GetPersonalRecordsQuery
  □ GetWorkoutComparisonQuery (update CompleteSession to return it)
  □ GetWorkoutStatisticsQuery
  □ Analytics endpoints (exercise, muscle-group, personal-records, statistics)

Frontend:
  □ PR celebration modal (gold border, dungeon message)
  □ "What to beat" in Quick Set Logger
  □ "LAST TIME" tap-to-autofill
  □ Comparison section in Workout Summary
  □ Workout Diary (History) Screen with filters
  □ Past Workout Details Screen
  □ Analytics Screen with 4 tabs
  □ Chart.js integration (dark theme)
  □ Exercise progress charts (max weight, volume, 1RM)
  □ Muscle group charts (tonnage, frequency)
  □ PR timeline
  □ Stats overview (totals, averages)
  □ Workout calendar heatmap
  □ Muscle frequency bar chart
```

---

## 9. Strength Standards — "How Strong Am I?" (NEW)

> **Источник:** Strength Level (48.3M lifts analyzed). Hardcoded tables, no network needed.

Показать юзеру его уровень силы в сравнении с нормами популяции.

### Data Table (Bench Press, Male, kg)

```typescript
// Bodyweight Ratio standards (multiplier of BW)
const BENCH_STANDARDS_MALE: Record<string, number[]> = {
    // [Beginner, Novice, Intermediate, Advanced, Elite]
    'bench_press': [0.50, 0.75, 1.25, 1.75, 2.00],
    'squat':       [0.75, 1.25, 1.50, 2.25, 2.75],
    'deadlift':    [1.00, 1.50, 2.00, 2.50, 3.00],
    'ohp':         [0.35, 0.55, 0.80, 1.10, 1.40],
    'row':         [0.50, 0.75, 1.00, 1.50, 1.75],
};

const BENCH_STANDARDS_FEMALE: Record<string, number[]> = {
    'bench_press': [0.25, 0.50, 0.75, 1.00, 1.50],
    'squat':       [0.50, 0.75, 1.25, 1.50, 2.00],
    'deadlift':    [0.50, 1.00, 1.25, 1.75, 2.50],
    'ohp':         [0.20, 0.35, 0.50, 0.75, 1.00],
    'row':         [0.30, 0.50, 0.75, 1.00, 1.25],
};

type StrengthLevel = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite';

function getStrengthLevel(
    exercise: string,
    e1rm: number,
    bodyweight: number,
    gender: 'male' | 'female'
): { level: StrengthLevel; ratio: number; percentile: number; nextLevel: string; nextTarget: number } {
    const standards = gender === 'male' 
        ? BENCH_STANDARDS_MALE[exercise] 
        : BENCH_STANDARDS_FEMALE[exercise];
    
    if (!standards || !bodyweight) return null;
    
    const ratio = e1rm / bodyweight;
    const levels: StrengthLevel[] = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
    const percentiles = [5, 20, 50, 80, 95];
    
    let level = 0;
    for (let i = standards.length - 1; i >= 0; i--) {
        if (ratio >= standards[i]) { level = i; break; }
    }
    
    const nextIdx = Math.min(level + 1, 4);
    return {
        level: levels[level],
        ratio: Math.round(ratio * 100) / 100,
        percentile: percentiles[level],
        nextLevel: levels[nextIdx],
        nextTarget: Math.ceil(standards[nextIdx] * bodyweight)
    };
}
```

### UI: Strength Level Badge (in Exercise Analytics)

```
┌──────────────────────────────────────────────────┐
│  BENCH PRESS — Your Strength Level               │
│                                                   │
│  e1RM: 100kg @ 80kg BW (1.25x)                  │
│                                                   │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░ INTERMEDIATE              │
│   Beg    Nov    INT    Adv    Elite               │
│   40kg   60kg   100kg  140kg  160kg               │
│                                                   │
│  Top 50% of lifters at your weight               │
│  Next: Advanced (140kg, +40kg to go)             │
│                                                   │
│  "A worthy challenger has entered the dungeon"   │
└──────────────────────────────────────────────────┘
```

---

## 10. Exercise Catalog Seed — free-exercise-db (NEW)

> 800+ exercises, Public Domain, JSON + images.
> Source: https://github.com/yuhonas/free-exercise-db

### Import strategy

```csharp
// Seed on first run (or via admin endpoint)
public async Task SeedExerciseCatalog()
{
    var json = await File.ReadAllTextAsync("seed/exercises.json");
    var exercises = JsonSerializer.Deserialize<List<FreeExerciseEntry>>(json);
    
    foreach (var ex in exercises)
    {
        var catalogEntry = new ExerciseCatalogEntry
        {
            Id = Guid.NewGuid(),
            Name = ex.Name,
            PrimaryMuscles = MapToMuscleGroups(ex.PrimaryMuscles),
            SecondaryMuscles = MapToMuscleGroups(ex.SecondaryMuscles),
            Equipment = ex.Equipment,
            Level = ex.Level,
            Force = ex.Force,
            Mechanic = ex.Mechanic,
            Category = ex.Category,
            Instructions = string.Join("\n", ex.Instructions),
            ImageUrls = ex.Images.Select(i => 
                $"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{i}"
            ).ToList(),
            IsBuiltIn = true
        };
        
        _catalogDb.Upsert(catalogEntry);
    }
}

// Mapping free-exercise-db muscle names → our MuscleGroup enum
private MuscleGroup MapToMuscleGroup(string muscle) => muscle.ToLower() switch
{
    "chest" => MuscleGroup.Chest,
    "shoulders" or "front delts" or "side delts" or "rear delts" => MuscleGroup.Shoulders,
    "biceps" => MuscleGroup.Biceps,
    "triceps" => MuscleGroup.Triceps,
    "forearms" => MuscleGroup.Forearms,
    "abdominals" or "abs" => MuscleGroup.Abs,
    "quadriceps" or "quads" => MuscleGroup.Quads,
    "hamstrings" => MuscleGroup.Hamstrings,
    "glutes" => MuscleGroup.Glutes,
    "calves" => MuscleGroup.Calves,
    "lats" or "middle back" or "lower back" or "traps" or "neck" => MuscleGroup.Back,
    _ => MuscleGroup.FullBody
};
```

### Benefits
- 800+ exercises for free (Public Domain)
- Images hosted on GitHub CDN (no storage cost)
- Structured data: force, mechanic, level, equipment
- Instructions in English (can add RU translations later)

---

---

## 11. UX Flow Redesign — Workout Navigation & Quick Actions (NEW — P0!)

> **Проблема:** Текущий UI flow для старта тренировки неочевиден и фрагментирован.
> Страницы `#workout-diary` и `#active-workout` — скрытые (нет табов в навигации).
> Нет кнопки "+ подход" если нужен 5-й сет. Слишком много кликов для простых действий.

### 11.1. Unified Workout Tab

Заменить текущий таб `[ ТРЕНИРОВКИ ]` (который показывает только конфигуратор программ) на **цельный Workout Hub** с внутренними под-табами:

```
┌─────────────────────────────────────────────────────────────────┐
│  [ ДАШБОРД ] [ КУРС ] [ АНАЛИЗЫ ] [ ТРЕНИРОВКИ ] [ ... ]       │
│                                      ^^^^^^^^^ ← выбран        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┬───────────────┬───────────────┐               │
│  │  ТРЕНИРОВКА │   ИСТОРИЯ     │  ПРОГРАММЫ    │               │
│  │  (active)   │  (diary)      │  (templates)  │               │
│  └─────────────┴───────────────┴───────────────┘               │
│                                                                 │
│  ... содержимое зависит от под-таба ...                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Под-таб "ТРЕНИРОВКА"** — главный при входе:
- Если есть активная тренировка → показываем её (текущий `#active-workout` встроен)
- Если нет → Smart Day Suggestion (раздел 11.2)

**Под-таб "ИСТОРИЯ"** — текущий `#workout-diary` встроен сюда

**Под-таб "ПРОГРАММЫ"** — текущий конфигуратор (Программы → Дни → Упражнения → Подходы)

### 11.2. Smart Day Suggestion — "Начать тренировку"

Когда нет активной тренировки, таб "ТРЕНИРОВКА" показывает:

```
┌──────────────────────────────────────────────┐
│                                              │
│      Сегодня: Пятница, 14 февраля            │
│                                              │
│  ┌─── Рекомендация ────────────────────────┐│
│  │                                          ││
│  │  🏋️ Пятница — Грудь + Трицепс           ││
│  │                                          ││
│  │  5 упражнений · ~45 мин · 20 подходов   ││
│  │                                          ││
│  │  [ ▶ НАЧАТЬ ТРЕНИРОВКУ ]                 ││
│  │                                          ││
│  └──────────────────────────────────────────┘│
│                                              │
│  Другие дни:                                 │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ Пн — Спина   │ │ Ср — Ноги   │          │
│  │ [ НАЧАТЬ ]   │ │ [ НАЧАТЬ ]   │          │
│  └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ Пт — Грудь ✓ │ │ Вс — Руки   │          │
│  │ (проведена)  │ │ [ НАЧАТЬ ]   │          │
│  └──────────────┘ └──────────────┘          │
│                                              │
│  [ + Пустая тренировка ]                     │
│                                              │
└──────────────────────────────────────────────┘
```

**Логика Smart Day Suggestion:**

1. Получить текущий день недели
2. Найти WorkoutDay с matching DayOfWeek в активной программе
3. Проверить, была ли уже тренировка на этот день НА ЭТОЙ НЕДЕЛЕ
4. Если сегодняшний день уже проведён → предлагать следующий непроведённый
5. Если нет программ → показать "Создайте программу в ПРОГРАММЫ" + кнопка "Пустая тренировка"

**Порядок приоритетов:**
```
Сегодня (если не проведена) → Следующий ближайший непроведённый → Любой
```

### 11.3. Quick Actions в Active Workout

#### "+ ПОДХОД" кнопка (критично!)

Внизу каждого упражнения — кнопка добавления нового подхода:

```
┌── Жим гантелей лёжа ─── 3/4 подходов ──────▼──┐
│                                                  │
│  Сет 1   30кг × 10  RPE 6  ✓  🟢               │
│  Сет 2   32.5кг × 8  RPE 7  ✓  🟢              │
│  Сет 3   35кг × 8  RPE 8  ✓  🟢                │
│  Сет 4   35кг × ─  RPE ─  [ ПОДХОД ]           │
│                                                  │
│  [ + ЕЩЁ ПОДХОД ]                               │
│                                                  │
└──────────────────────────────────────────────────┘
```

**При клике "+ ЕЩЁ ПОДХОД":**
- Вызвать `POST /api/v1/workout-sessions/{id}/exercises/{exId}/sets`
- Новый сет копирует плановый вес/повторения из предыдущего сета
- Перерендерить упражнение
- Вибрация feedback

#### "+ УПРАЖНЕНИЕ" кнопка

Внизу списка упражнений:

```
  ...exercises...

  ┌──────────────────────────────────────────┐
  │  [ + ДОБАВИТЬ УПРАЖНЕНИЕ ]               │
  └──────────────────────────────────────────┘
```

**При клике:**
- Открыть модалку поиска упражнений из каталога (реюзать workoutModals.ts exercise search)
- При выборе → `POST /api/v1/workout-sessions/{id}/exercises` с 3 пустыми подходами
- Перерендерить тренировку

#### "Same as Last Set" Quick Button

Рядом с кнопкой "ПОДХОД" — быстрое завершение с теми же значениями что предыдущий:

```
│  Сет 3   35кг × 8  RPE 8  ✓  🟢                │
│  Сет 4   35кг × ─  RPE ─  [ ПОДХОД ] [ = ]     │
```

Кнопка `[ = ]`:
- Копирует вес + повторения из предыдущего ЗАВЕРШЁННОГО сета в этом упражнении
- Сразу завершает подход (без открытия Quick Set Logger)
- 1 тап = залогировано!
- Toast: "35кг × 8 (как прошлый)" + UNDO

#### Swipe на сете = Quick Complete

На мобилке — свайп сета вправо = завершить с запланированным/предыдущим значением.
На десктопе — тот же `[ = ]` button.

### 11.4. Переработка навигации

**Текущее:**
```
[ ДАШБОРД ] [ КУРС ] [ АНАЛИЗЫ ] [ СРАВНЕНИЕ ] [ ТРЕНИРОВКИ ] [ ЭНЦИКЛОПЕДИЯ ] [ ASCII ART ]
```

**Предлагаемое:**
```
[ ДАШБОРД ] [ КУРС ] [ АНАЛИЗЫ ] [ СРАВНЕНИЕ ] [ ТРЕНИРОВКИ ] [ ЭНЦИКЛОПЕДИЯ ]
```
- `[ ТРЕНИРОВКИ ]` = Workout Hub (3 под-таба: ТРЕНИРОВКА / ИСТОРИЯ / ПРОГРАММЫ)
- `#active-workout` и `#workout-diary` больше не отдельные hidden pages — встроены в таб
- `[ ASCII ART ]` — опционально убрать или оставить

### 11.5. Чеклист для реализации

```
Frontend:
  □ Workout Hub с 3 под-табами (ТРЕНИРОВКА / ИСТОРИЯ / ПРОГРАММЫ)
  □ Smart Day Suggestion (ближайший непроведённый день)
  □ Логика определения проведённых дней на текущей неделе
  □ Кнопка "НАЧАТЬ ТРЕНИРОВКУ" одним тапом
  □ Карточки всех дней программы с статусом (проведена/не проведена)
  □ "+ ЕЩЁ ПОДХОД" кнопка в каждом упражнении
  □ "+ ДОБАВИТЬ УПРАЖНЕНИЕ" кнопка внизу тренировки
  □ "Same as Last Set" quick button [ = ]
  □ 1-tap complete (без модалки Quick Set Logger)
  □ "Пустая тренировка" без привязки к программе
  □ Убрать hidden pages (#workout-diary, #active-workout) → встроить в Workout Hub
  □ Responsive: thumb zone для всех кнопок (44px+ touch targets)
  □ Haptic feedback на все quick actions

Backend:
  □ GET /api/v1/workout-sessions/week-status — какие дни уже проведены на текущей неделе
  □ (опционально) POST /api/v1/workout-sessions/start-by-day — старт по DayOfWeek без указания dayId
```

### 11.6. Приоритеты внутри Phase 2B

| # | Задача | Effort | Приоритет |
|---|--------|--------|-----------|
| 1 | Workout Hub (3 под-таба) | 0.5 дня | P0 |
| 2 | Smart Day Suggestion | 0.5 дня | P0 |
| 3 | "+ подход" / "+ упражнение" | 0.5 дня | P0 |
| 4 | "Same as Last Set" quick button | 0.25 дня | P0 |
| 5 | Analytics Screen (charts) | 1 день | P1 |
| 6 | Calendar Heatmap | 0.5 дня | P1 |
| 7 | Stats Overview | 0.5 дня | P1 |

**P0 = UX flow fix (делаем первым!), P1 = analytics/charts (потом)**

---

*Next: [03-PHASE-ADVANCED.md](./03-PHASE-ADVANCED.md) — Per-exercise timer, bodyweight, plate calc, supersets*
