# Phase 3: Advanced Features
> BloodTracker — Workout Diary
> Estimated effort: 2-3 дня
> Dependencies: Phase 1-2
> Status: 📋 Planning

---

## Что входит в Phase 3

| # | Задача | Effort | Приоритет |
|---|--------|--------|-----------|
| 1 | Per-exercise rest timer overrides | 0.5 дня | P0 |
| 2 | Bodyweight exercise support | 0.5 дня | P1 |
| 3 | Set types: warmup exclusion from stats | 0.25 дня | P0 |
| 4 | Plate Calculator | 0.5 дня | P1 |
| 5 | Superset visual grouping | 0.5 дня | P2 |
| 6 | RPE/RIR toggle in settings | 0.25 дня | P2 |
| 7 | Workout mood, rating, sleep | 0.25 дня | P1 |
| 8 | Training density + fatigue index | 0.25 дня | P1 |
| 9 | Stall detection + deload suggestions | 0.5 дня | P2 |
| 10 | Warmup calculator | 0.25 дня | P2 |

---

## 1. Per-Exercise Rest Timer

### Проблема
Глобальный таймер 90с — плохо. Базовые упражнения (жим, присед) нуждаются в 2-3 мин отдыха, изоляция (бицепс, трицепс) — 45-90 сек.

### Решение — Каскадный приоритет

```
Exercise.RestTimerOverrideSeconds → 150s  (highest priority)
   ↓ (null)
RestTimerSettings.RestByExerciseName["Приседания"] → 180s
   ↓ (not found)
RestTimerSettings.RestByMuscleGroup[Chest] → 120s
   ↓ (not found)
RestTimerSettings.DefaultRestSeconds → 90s  (lowest priority)
```

### Frontend: Per-exercise override

В Active Workout Screen, рядом с названием упражнения — иконка таймера:

```
┌ Жим на наклонной ──── Chest ── 2/4 ──── ⏱ 120s [✏️] ──┐
```

Тап по `[✏️]` → bottom sheet:
```
┌───────────────────────────────────────────┐
│  REST TIMER — Жим на наклонной            │
│                                           │
│  ○ Use default (Chest: 120s)              │
│  ● Custom: [  150  ] seconds              │
│                                           │
│  [SAVE]              [CANCEL]             │
└───────────────────────────────────────────┘
```

Сохраняется в `WorkoutSessionExercise.RestTimerOverrideSeconds` (per-session) и опционально в `RestTimerSettings.RestByExerciseName` (permanent).

---

## 2. Bodyweight Exercises

### Проблема
Подтягивания, отжимания, dips — вес = вес тела + дополнительный. Нельзя просто писать "0kg".

### Модель

```csharp
// WorkoutSessionExercise
public bool IsBodyweight { get; set; }

// WorkoutSessionSet
public decimal? BodyweightAtTime { get; set; }   // Вес тела
public decimal? AdditionalWeight { get; set; }   // Утяжелитель (+) или резинка (-)

// ActualWeight для bodyweight = BodyweightAtTime + AdditionalWeight
```

### User Profile: Bodyweight

```csharp
// WorkoutPreferences (или UserProfile)
public decimal? CurrentBodyweight { get; set; }  // Обновляется вручную
public DateTime? BodyweightUpdatedAt { get; set; }
```

### UX: Quick Set Logger для bodyweight

```
┌───────────────────────────────────────────────────┐
│  LOG SET — Подтягивания                Set 2/4    │
│                                                   │
│  ☑ BODYWEIGHT EXERCISE                            │
│                                                   │
│  Body weight:     [  80.0  ] kg  (from profile)   │
│  Additional:      [  +10.0 ] kg  [+2.5] [+5]     │
│  ───────────────────────────────                  │
│  Total weight:     90.0 kg                        │
│                                                   │
│  Reps:            [   8    ]     [+1] [+2] [-1]   │
│  RPE:             [●●●●●●●●○○]  (8)              │
│                                                   │
│  LAST TIME: BW(80)+10kg × 8 reps                  │
│  BEAT IT:   BW+12.5kg×6  or  BW+10kg×10          │
│                                                   │
│  [✓ COMPLETE SET]                    [CANCEL]     │
└───────────────────────────────────────────────────┘
```

### Отображение в истории
```
Подтягивания: BW+10kg × 8  (not "90kg × 8")
Assisted Pull-ups: BW-15kg × 10  (резинка 15кг)
```

### Формулы для bodyweight
```
Tonnage = (Bodyweight + AdditionalWeight) × Reps
  = (80 + 10) × 8 = 720kg

Estimated1RM = TotalWeight × (1 + Reps/30)
  = 90 × (1 + 8/30) = 114kg
```

---

## 3. Set Types — Warmup Exclusion

### Правила
- `IsWarmup = true` → НЕ учитывается в:
  - TotalTonnage (рабочий тоннаж)
  - TotalVolume (рабочий объём)
  - PR detection
  - "What to beat" history
- УЧИТЫВАЕТСЯ в:
  - Общем счётчике подходов (для информации)
  - Времени тренировки

### Visual distinction
```
┌ Жим штанги лёжа ──── Chest ── 6/6 ✓ ───────────────┐
│                                                      │
│  #   WEIGHT    REPS   RPE   TYPE      REST           │
│  ─────────────────────────────────────────            │
│  1   20kg×10   ✓      —     WARMUP    30s   (grey)   │
│  2   40kg×5    ✓      —     WARMUP    45s   (grey)   │
│  ─── working sets ────────────────────────            │
│  3   60kg×10   ✓      7     WORK      120s  (white)  │
│  4   60kg×10   ✓      7     WORK      115s           │
│  5   65kg×8    ✓      8     WORK      120s           │
│  6   65kg×7    ✓      9     FAILURE   —              │
│                                                      │
│  Working tonnage: 2,505kg (excl. warmup)             │
└──────────────────────────────────────────────────────┘
```

CSS: warmup rows get `opacity: 0.5` and `font-style: italic`.

---

## 4. Plate Calculator

### Логика

```typescript
type PlateConfig = {
  barWeight: number;          // 20kg олимпийский, 10kg EZ-bar
  availablePlates: number[];  // [25, 20, 15, 10, 5, 2.5, 1.25]
};

function calculatePlates(targetWeight: number, config: PlateConfig): number[] {
  let perSide = (targetWeight - config.barWeight) / 2;
  if (perSide <= 0) return [];
  
  const plates: number[] = [];
  const sorted = [...config.availablePlates].sort((a, b) => b - a);
  
  for (const plate of sorted) {
    while (perSide >= plate) {
      plates.push(plate);
      perSide -= plate;
    }
  }
  
  return plates; // Per side
}

// Example: targetWeight=100, bar=20
// perSide = 40
// plates = [25, 10, 5] per side
```

### UI — Plate Calculator Button

В Quick Set Logger, рядом с полем Weight:

```
Weight (kg)
┌────────────────────────────────────────────┐
│  [-5]  [-2.5]   [  100  ]  [+2.5]  [+5]   │
│                             [🏋️ PLATES]    │
└────────────────────────────────────────────┘
```

Тап по `[🏋️ PLATES]`:
```
┌───────────────────────────────────────────┐
│  PLATE CALCULATOR — 100kg                 │
│                                           │
│  Bar: 20kg (Olympic)                      │
│  Per side: 40kg                           │
│                                           │
│   ┌──┐                         ┌──┐      │
│   │25│ ║══════════════════════║│25│      │
│   │  │ ║   20kg OLYMPIC BAR  ║│  │      │
│   └──┘ ║══════════════════════║└──┘      │
│  ┌─┐                             ┌─┐    │
│  │10│                            │10│    │
│  └─┘                             └─┘    │
│  ┌┐                               ┌┐    │
│  │5│                              │5│    │
│  └┘                               └┘    │
│                                           │
│  = 25 + 10 + 5 = 40kg × 2 + 20kg = 100kg│
│                                           │
│  [CLOSE]                                  │
└───────────────────────────────────────────┘
```

### Settings — Plate Config

В Settings → Workout Preferences:
```
┌── PLATE CALCULATOR ──────────────────────┐
│                                          │
│  Bar type:  ○ Olympic (20kg)             │
│             ○ EZ-bar (10kg)              │
│             ○ Dumbbell (varies)          │
│             ○ Custom: [    ] kg          │
│                                          │
│  Available plates:                       │
│  [✓] 25kg  [✓] 20kg  [✓] 15kg          │
│  [✓] 10kg  [✓] 5kg   [✓] 2.5kg         │
│  [✓] 1.25kg                             │
│                                          │
└──────────────────────────────────────────┘
```

---

## 5. Superset Visual Grouping

### Модель

```csharp
// WorkoutSessionExercise
public Guid? SupersetGroupId { get; set; }  // Exercises with same GroupId = superset
public int? SupersetOrder { get; set; }     // Order within superset
```

### UI

Суперсеты соединяются вертикальной линией слева:

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║  ┃ ┌ Жим гантелей лёжа ──── Chest ── 4/4 ✓ ──────┐ ║
║  ┃ │  1: 30×10 ✓  2: 30×10 ✓  3: 32.5×10 ✓        │ ║
║  S │  4: 35×10 ✓                                    │ ║
║  U └────────────────────────────────────────────────┘ ║
║  P                                                    ║
║  E ┌ Разводка гантелей ──── Chest ── 3/3 ✓ ────────┐ ║
║  R │  1: 12×12 ✓  2: 12×12 ✓  3: 12×10 ✓           │ ║
║  ┃ └────────────────────────────────────────────────┘ ║
║                                                      ║
║  (rest timer starts only AFTER both exercises done)  ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

### Timer Logic for Supersets
```typescript
function shouldStartTimer(exerciseId: string): boolean {
  const exercise = getExercise(exerciseId);
  
  if (!exercise.supersetGroupId) return true; // Normal exercise
  
  // Check if all exercises in superset have completed their current set
  const groupExercises = getExercisesInSuperset(exercise.supersetGroupId);
  const currentRound = getCurrentSupersetRound(groupExercises);
  
  return groupExercises.every(e => {
    const set = e.sets[currentRound];
    return set?.completedAt != null;
  });
}
```

---

## 6. RPE/RIR Toggle

### Mapping
```
RPE 10 = RIR 0 (failure)
RPE 9  = RIR 1
RPE 8  = RIR 2
RPE 7  = RIR 3
RPE 6  = RIR 4
```

### Settings
```csharp
public enum EffortTrackingMode { RPE = 0, RIR = 1, None = 2 }

// In WorkoutPreferences
public EffortTrackingMode EffortMode { get; set; } = EffortTrackingMode.RPE;
```

### UI Change
When RIR mode:
```
RIR (Reps In Reserve)
┌─────────────────────────────────┐
│  0  1  [2]  3  4  5+           │
│  ██░░░░████░░░░░░░░            │
└─────────────────────────────────┘
```

When None mode: effort slider hidden entirely.

---

## 7. Workout Mood, Rating, Sleep

### Where it appears

**Pre-workout** (after tapping START):
```
┌───────────────────────────────────────────┐
│  How are you feeling?                     │
│                                           │
│  😫  😐  😊  💪  🔥                       │
│  1   2   3   4   5                        │
│                                           │
│  Sleep last night: [  7.5  ] hours        │
│                                           │
│  [START WORKOUT]        [SKIP]            │
└───────────────────────────────────────────┘
```

`[SKIP]` → sets mood/sleep to null, starts workout immediately.

**Post-workout** (in Summary Screen):
```
Rate this workout:
☆ ☆ ☆ ★ ★  → ★ ★ ★ ☆ ☆  (3/5)
```

### Analytics Correlation (Phase 4+)

В Analytics → Stats можно будет увидеть:
```
Mood vs Performance:
  Mood 5 (🔥): avg tonnage +12% vs baseline
  Mood 1 (😫): avg tonnage -8% vs baseline

Sleep vs Performance:
  8+ hours:  avg tonnage +9%
  6-8 hours: baseline
  <6 hours:  avg tonnage -14%
```

---

## 8. Training Density + Fatigue Index

### Training Density
```
Density = TotalTonnage / DurationMinutes (kg/min)

Example: 1,820kg in 45min = 40.4 kg/min
```

Показывается в Workout Summary и в Analytics → Stats.

### Fatigue Index
```
FatigueIndex = Last_RPE - First_RPE (per exercise)

Example:
  Set 1: RPE 6
  Set 4: RPE 9
  Fatigue = 9 - 6 = 3 (HIGH)

Interpretation:
  0-1: Low fatigue (could do more)
  2:   Moderate
  3+:  High fatigue (possibly overtrained for this exercise)
```

Показывается в Past Workout Details → per exercise.

---

## 9. Stall Detection + Deload (Enhanced with RPE-Sensitive Detection)

> **Источник:** Market research — "ни одно из исследованных приложений не реализует
> полноценный RPE-чувствительный алгоритм обнаружения скрытого плато."
> Это наш **ДИФФЕРЕНЦИАТОР**.

### Четыре метода обнаружения

#### Method 1: Simple Counter (базовый)
Нет PR за ≥3 сессии для данного упражнения.

#### Method 2: SMA Comparison (средний)
Сравнение SMA e1RM за последние 4 тренировки vs предыдущие 4.

#### Method 3: Linear Regression (продвинутый)
Slope e1RM за 6 недель, нормализованный в %/неделя.

#### Method 4: RPE Drift Detection (уникальный — наш киллер-фичер!)
Рост RPE при стабильном весе = СКРЫТОЕ плато из-за накопления усталости.

```csharp
public class AdvancedStallDetector
{
    /// <summary>
    /// Multi-method stall detection with RPE sensitivity.
    /// Returns the most severe finding across all methods.
    /// </summary>
    public StallResult Detect(string exerciseName, List<DailyExerciseStats> history)
    {
        if (history.Count < 6) return StallResult.NotEnoughData;
        
        var results = new List<StallResult>();
        
        // Method 1: Simple counter (3 sessions without new PR)
        results.Add(CheckSimpleStall(history, window: 3));
        
        // Method 2: SMA comparison (4 vs 4)
        results.Add(CheckSMAStall(history));
        
        // Method 3: Linear regression (6 weeks slope)
        results.Add(CheckRegressionStall(history));
        
        // Method 4: RPE Drift (UNIQUE — our differentiator!)
        results.Add(CheckRPEDrift(history));
        
        // Return most severe
        return results
            .Where(r => r.Status != StallStatus.NotEnoughData)
            .OrderByDescending(r => r.Severity)
            .FirstOrDefault() ?? StallResult.NoStall;
    }
    
    private StallResult CheckSimpleStall(List<DailyExerciseStats> history, int window)
    {
        var recent = history.OrderByDescending(h => h.Date).Take(window).ToList();
        if (recent.Count < window) return StallResult.NotEnoughData;
        
        var maxE1RMs = recent.Select(h => h.BestE1RM).ToList();
        bool isStalled = maxE1RMs.All(e => e <= maxE1RMs.First());
        
        if (!isStalled) return StallResult.NoStall;
        return new StallResult
        {
            Status = StallStatus.Stalled,
            Method = StallMethod.SimpleCounter,
            Severity = 1,
            Message = $"No progress in last {window} sessions"
        };
    }
    
    private StallResult CheckSMAStall(List<DailyExerciseStats> history)
    {
        var ordered = history.OrderByDescending(h => h.Date).ToList();
        if (ordered.Count < 8) return StallResult.NotEnoughData;
        
        var recentSMA = ordered.Take(4).Average(h => (double)h.BestE1RM);
        var previousSMA = ordered.Skip(4).Take(4).Average(h => (double)h.BestE1RM);
        
        if (previousSMA == 0) return StallResult.NotEnoughData;
        
        var changePercent = (recentSMA - previousSMA) / previousSMA * 100;
        
        return changePercent switch
        {
            > 1.0  => new StallResult { Status = StallStatus.Progressing, Color = "green" },
            > -1.0 => new StallResult { Status = StallStatus.Plateau, Severity = 2, Color = "yellow",
                       Message = $"Plateau: {changePercent:+0.0;-0.0}% over last 8 sessions" },
            _      => new StallResult { Status = StallStatus.Regressing, Severity = 3, Color = "red",
                       Message = $"Regression: {changePercent:+0.0;-0.0}% over last 8 sessions" }
        };
    }
    
    private StallResult CheckRegressionStall(List<DailyExerciseStats> history)
    {
        // 6-week linear regression of e1RM
        var sixWeeks = history
            .Where(h => h.Date >= DateTime.UtcNow.AddDays(-42))
            .OrderBy(h => h.Date)
            .ToList();
        
        if (sixWeeks.Count < 4) return StallResult.NotEnoughData;
        
        // Simple linear regression: y = mx + b
        var n = sixWeeks.Count;
        var xs = sixWeeks.Select((h, i) => (double)i).ToArray();
        var ys = sixWeeks.Select(h => (double)h.BestE1RM).ToArray();
        
        var avgX = xs.Average();
        var avgY = ys.Average();
        var slope = xs.Zip(ys, (x, y) => (x - avgX) * (y - avgY)).Sum()
                  / xs.Select(x => Math.Pow(x - avgX, 2)).Sum();
        
        // Normalize to %/week
        var weeklyChangePercent = (slope * 7 / avgY) * 100; // rough normalization
        
        if (weeklyChangePercent < -0.5)
        {
            return new StallResult
            {
                Status = StallStatus.Regressing,
                Severity = 3,
                Method = StallMethod.LinearRegression,
                Message = $"Declining {weeklyChangePercent:F1}%/week over 6 weeks"
            };
        }
        
        return StallResult.NoStall;
    }
    
    /// <summary>
    /// RPE Drift Detection — UNIQUE FEATURE
    /// Detects hidden plateau: RPE rising while weight stays constant.
    /// This means accumulated fatigue is eroding performance even though
    /// the weight on the bar hasn't dropped.
    /// NO competitor implements this.
    /// </summary>
    private StallResult CheckRPEDrift(List<DailyExerciseStats> history)
    {
        var withRPE = history
            .Where(h => h.AverageRPE.HasValue && h.AverageRPE > 0)
            .OrderByDescending(h => h.Date)
            .Take(6)
            .ToList();
        
        if (withRPE.Count < 4) return StallResult.NotEnoughData;
        
        // Weight is stable (±5%)
        var weights = withRPE.Select(h => h.MaxWeight).ToList();
        var avgWeight = weights.Average();
        var weightStable = weights.All(w => Math.Abs((double)(w - avgWeight) / (double)avgWeight) < 0.05);
        
        if (!weightStable) return StallResult.NoStall;
        
        // But RPE is trending UP
        var rpes = withRPE.OrderBy(h => h.Date).Select(h => h.AverageRPE!.Value).ToList();
        var rpeFirst = rpes.Take(2).Average();
        var rpeLast = rpes.Skip(rpes.Count - 2).Average();
        var rpeDrift = rpeLast - rpeFirst;
        
        if (rpeDrift >= 1.0m) // RPE increased by 1+ point
        {
            return new StallResult
            {
                Status = StallStatus.HiddenPlateau,
                Severity = 4,  // HIGHEST severity
                Method = StallMethod.RPEDrift,
                Message = $"Hidden plateau: RPE rising ({rpeFirst:F1}→{rpeLast:F1}) " +
                          $"at stable weight ({avgWeight:F1}kg). Fatigue accumulating!",
                SuggestDeload = true
            };
        }
        
        return StallResult.NoStall;
    }
}

public enum StallStatus { NotEnoughData, Progressing, Plateau, Stalled, Regressing, HiddenPlateau }
public enum StallMethod { SimpleCounter, SMAComparison, LinearRegression, RPEDrift }
```

### Deload Recommendations (научные данные)

```
Средний цикл между deload: 5.6 ± 2.3 недели (исследования)

Триггеры deload:
1. Запланированный: каждые 6 недель (если не сделан раньше)
2. Stall: ≥3 недели без прогресса при ≥3 тренировках
3. Regression: e1RM падает
4. RPE Drift: hidden plateau (severity 4)

Рекомендация:
- Объём: -50% (сократить подходы вдвое)
- Интенсивность: -10% веса
- Длительность: 7 дней (1 неделя)
- Потом: вернуться к предыдущему рабочему весу
```

```csharp
public DeloadRecommendation CalculateDeload(decimal currentWeight, int currentSets)
{
    return new DeloadRecommendation
    {
        SuggestedWeight = Math.Round(currentWeight * 0.9m / 2.5m) * 2.5m,  // -10%, rounded to 2.5
        SuggestedSets = Math.Max(currentSets / 2, 2),                       // -50% volume, min 2
        DurationDays = 7,
        Message = "Deload week: reduce volume 50%, intensity 10%. Return to full load after 7 days."
    };
}
```

### UI Warning (Enhanced)
```
┌────────────────────────────────────────────────────────┐
│  ⚠️ HIDDEN PLATEAU DETECTED                            │
│                                                        │
│  Bench Press: weight stable at 80kg                    │
│  But RPE rising: 7.5 → 9.0 over 4 sessions            │
│                                                        │
│  🧠 Your body is accumulating fatigue.                 │
│  Same weight feels harder = time for deload.           │
│                                                        │
│  Recommended deload week:                              │
│  Weight: 80kg → 72.5kg (-10%)                          │
│  Sets: 4 → 2 per exercise (-50% volume)                │
│  Duration: 7 days                                      │
│                                                        │
│  [APPLY DELOAD]  [REMIND LATER]  [DISMISS]             │
└────────────────────────────────────────────────────────┘
```

### Progress Indicator Colors
```
🟢 Progressing: >+1% SMA change (green glow)
🟡 Plateau: -1% to +1% SMA (yellow/amber)
🔴 Regressing: <-1% SMA (red pulse)
💀 Hidden Plateau: RPE drift detected (skull icon, purple glow)
```

---

## 10. Warmup Calculator

### Auto-generate warmup sets based on working weight

```typescript
function generateWarmupSets(workingWeight: number, barWeight: number = 20): WarmupSet[] {
  if (workingWeight <= barWeight) return [];
  
  const warmups = [
    { pct: 0, reps: 10, label: 'Empty bar' },    // Just the bar
    { pct: 0.4, reps: 8, label: '40%' },
    { pct: 0.6, reps: 5, label: '60%' },
    { pct: 0.8, reps: 3, label: '80%' },
  ];
  
  return warmups
    .map(w => ({
      weight: w.pct === 0 ? barWeight : roundToNearest(workingWeight * w.pct, 2.5),
      reps: w.reps,
      label: w.label,
      isWarmup: true
    }))
    .filter(w => w.weight >= barWeight && w.weight < workingWeight);
}

// Example: workingWeight = 100kg
// → [20kg×10, 40kg×8, 60kg×5, 80kg×3]
```

### UI: Auto-add warmup button

В Active Workout Screen, на каждом упражнении:
```
┌ Жим штанги лёжа ──── Chest ── 0/4 ─────────────────────┐
│                                                          │
│  [+ ADD WARMUP SETS]  (auto-generates based on 60kg×10) │
│                                                          │
│  1   60kg×10  [LOG SET]                                  │
│  2   60kg×10                                             │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

Тап → добавляет warmup sets ПЕРЕД рабочими:
```
│  W1  20kg×10  [LOG SET]  (warmup)                        │
│  W2  40kg×8              (warmup)                        │
│  W3  50kg×5              (warmup)                        │
│  ─── working sets ────────────────                       │
│  1   60kg×10                                             │
│  2   60kg×10                                             │
```

### Setting: Auto-warmup toggle

```csharp
// In WorkoutPreferences
public bool AutoAddWarmupSets { get; set; } = false;  // Default OFF
```

When ON → warmup sets added automatically at session start.

---

## 11. User Settings — WorkoutPreferences

### Full Model

```csharp
public class WorkoutPreferences
{
    public string UserId { get; set; }
    
    // Units
    public WeightUnit DefaultWeightUnit { get; set; } = WeightUnit.Kg;
    public decimal WeightIncrement { get; set; } = 2.5m;
    
    // Effort
    public EffortTrackingMode EffortMode { get; set; } = EffortTrackingMode.RPE;
    
    // Timer (additional to RestTimerSettings)
    public bool AutoStartRestTimer { get; set; } = true;
    public string RestTimerSoundType { get; set; } = "bell";
    
    // Warmup
    public bool AutoAddWarmupSets { get; set; } = false;
    
    // Plate calc
    public decimal BarWeight { get; set; } = 20m;
    public List<decimal> AvailablePlates { get; set; } = new() { 25, 20, 15, 10, 5, 2.5, 1.25 };
    
    // Body
    public decimal? CurrentBodyweight { get; set; }
    
    // Goals (Phase 4)
    public int WeeklyWorkoutGoal { get; set; } = 3;
    
    // Progressive overload
    public bool ShowOverloadHints { get; set; } = true;
    public bool ShowStallWarnings { get; set; } = true;
}
```

### Settings Screen Wireframe

```
╔══════════════════════════════════════════════════════════════╗
║  WORKOUT SETTINGS                                   [BACK]  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌── UNITS ──────────────────────────────────────────────┐  ║
║  │  Weight unit:      (●) kg  ( ) lbs                    │  ║
║  │  Weight increment:  [ 2.5 ] kg                        │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── EFFORT TRACKING ────────────────────────────────────┐  ║
║  │  Mode:  (●) RPE  ( ) RIR  ( ) None                   │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── BODY ───────────────────────────────────────────────┐  ║
║  │  Current bodyweight:  [ 80.0 ] kg                     │  ║
║  │  Last updated: Feb 14, 2026                           │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── WARMUP ─────────────────────────────────────────────┐  ║
║  │  Auto-add warmup sets: [  ] OFF                       │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── PROGRESSIVE OVERLOAD ───────────────────────────────┐  ║
║  │  Show "What to beat" hints: [✓] ON                    │  ║
║  │  Show stall warnings:       [✓] ON                    │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [REST TIMER SETTINGS →]                                     ║
║  [PLATE CALCULATOR SETUP →]                                  ║
║                                                              ║
║  [SAVE]                                                      ║
╚══════════════════════════════════════════════════════════════╝
```

---

---

## 12. INOL — Training Load Monitoring (NEW)

> **INOL** (Intensity × Number of Lifts) = расширение таблицы Прилепина.
> Предупреждает о перетренированности прямо во время тренировки.

### Формула
```
INOL per set = reps / (100 - intensity%)

Где intensity% = (ActualWeight / Estimated1RM) * 100
```

### Пороги
| Уровень | Per exercise/session | Per exercise/week | Цвет |
|---------|---------------------|-------------------|------|
| Optimal | 0.4 — 1.0 | 1.0 — 2.0 | 🟢 Green |
| High | 1.0 — 1.5 | 2.0 — 3.0 | 🟡 Yellow |
| Excessive | 1.5 — 2.0 | 3.0 — 4.0 | 🟠 Orange |
| Danger | > 2.0 | > 4.0 | 🔴 Red |

### UI: Inline INOL indicator

Во время тренировки, под прогрессом упражнения:
```
┌ Жим штанги лёжа ──── Chest ── 3/4 ───────────────────┐
│  ...                                                    │
│  INOL: 0.87 ████████░░ Optimal                          │
└─────────────────────────────────────────────────────────┘
```

Если превышает 1.5:
```
│  INOL: 1.72 ███████████████░ ⚠️ High load!             │
│  Consider reducing sets or weight                        │
```

### Implementation
```typescript
function calculateINOL(sets: CompletedSet[], estimated1RM: number): number {
    if (!estimated1RM || estimated1RM <= 0) return 0;
    return sets
        .filter(s => s.type !== 'warmup' && s.actualWeight && s.actualReps)
        .reduce((sum, s) => {
            const intensity = (s.actualWeight / estimated1RM) * 100;
            if (intensity >= 100) return sum + 10; // Cap at max
            return sum + s.actualReps / (100 - intensity);
        }, 0);
}
```

---

## 13. Smart Superset Scrolling (NEW — Hevy pattern)

При фиксации подхода в суперсете → автоматический smooth scroll к следующему упражнению.

```typescript
function onSetCompleted(exerciseId: string, setIndex: number) {
    const exercise = getExercise(exerciseId);
    
    // If this exercise is in a superset group
    if (exercise.supersetGroup !== null) {
        const supersetExercises = getExercisesInGroup(exercise.supersetGroup);
        const currentIndex = supersetExercises.findIndex(e => e.id === exerciseId);
        const nextIndex = (currentIndex + 1) % supersetExercises.length;
        const nextExercise = supersetExercises[nextIndex];
        
        // Scroll to next exercise in superset (no rest timer between!)
        smoothScrollTo(nextExercise.id);
        
        // Only start rest timer after completing ALL exercises in the round
        if (nextIndex === 0) {
            // Completed full round — start rest timer
            startRestTimer(exercise.restTimerSeconds);
        }
        // Otherwise: no rest timer, just scroll
    }
}
```

---

## 14. Separate Volume Controls (NEW)

Отдельные настройки громкости для разных звуков (Hevy pattern):

```csharp
// Добавить в WorkoutPreferences:
public SoundSettings Sounds { get; set; } = new();

public class SoundSettings
{
    public decimal TimerVolume { get; set; } = 1.0m;        // Rest timer alert
    public decimal SetCompleteVolume { get; set; } = 0.5m;  // Set logged beep
    public decimal PRVolume { get; set; } = 1.0m;           // PR celebration
    public decimal WarningVolume { get; set; } = 0.7m;      // Stall/INOL warnings
    public bool HapticFeedback { get; set; } = true;
}
```

---

## 15. Configurable "What is Previous" (NEW)

Опция: что считать "предыдущей тренировкой" для auto-fill:

```csharp
public enum PreviousWorkoutMode
{
    LastExecution = 0,   // Последнее выполнение ЭТОГО упражнения (default)
    LastInTemplate = 1   // Последнее выполнение в рамках ЭТОГО шаблона
}

// Добавить в WorkoutPreferences:
public PreviousWorkoutMode PreviousMode { get; set; } = PreviousWorkoutMode.LastExecution;
```

**Разница:**
- `LastExecution`: Делал Bench Press вчера в другом шаблоне → покажет вчерашние данные
- `LastInTemplate`: Делал Bench Press вчера, но текущий шаблон "Push Day" → покажет данные последнего Push Day

---

## Checklist для Phase 3 (Updated)

```
Backend:
  □ WorkoutPreferences entity + CRUD
  □ Per-exercise rest timer logic in CompleteSet
  □ Bodyweight fields in SessionSet
  □ Warmup exclusion from tonnage/volume calculations
  □ Plate calculator endpoint (or client-only)
  □ Superset grouping fields
  □ RPE/RIR conversion (±4% per RIR point autoregulation)
  □ Mood/Rating/Sleep fields in WorkoutSession
  □ Training density calculation
  □ AdvancedStallDetector service (4 methods incl. RPE Drift!)
  □ INOL calculation service
  □ Warmup calculator endpoint
  □ Preferences API endpoints (incl. SoundSettings, PreviousMode)

Frontend:
  □ Per-exercise timer override UI
  □ Bodyweight exercise Quick Set Logger variant
  □ Warmup set visual distinction (grey/italic)
  □ Plate calculator inline hint (not just modal!)
  □ Plate config in settings
  □ Superset visual grouping (vertical line)
  □ Smart Superset Scrolling (auto-scroll to next exercise)
  □ Superset timer logic (rest only after full round)
  □ RPE/RIR toggle in settings (with ±4% autoregulation hint)
  □ Pre-workout mood/sleep modal
  □ Post-workout rating stars
  □ Stall warning: 4 methods with color indicators (🟢🟡🔴💀)
  □ INOL indicator per exercise (inline progress bar)
  □ Separate volume controls for sounds
  □ "What is previous" toggle in settings
  □ Auto warmup set generation
  □ Settings screen (full)
```

---

## 16. Iteration-Based Auto-Progression (NEW — wger pattern)

> **Источник:** wger open-source (5.6K stars) + Boostcamp (15M downloads).
> Автоматические правила прогрессии вместо ручного "увеличь вес когда готов".

### Концепция

Каждый шаблон упражнения может иметь **правила автопрогрессии**:
- Условие (condition): что должно быть выполнено
- Действие (action): что изменить
- Requirements-gated: прогрессия ТОЛЬКО если юзер реально выполнил план

### Model

```csharp
public class ProgressionRule
{
    public Guid Id { get; set; }
    public Guid TemplateExerciseId { get; set; }  // FK to WorkoutExercise (шаблон)
    
    public ProgressionCondition Condition { get; set; }
    public decimal? ConditionValue { get; set; }    // e.g., RPE threshold, extra reps
    
    public ProgressionAction Action { get; set; }
    public decimal ActionValue { get; set; }         // e.g., +2.5 (kg), +1 (rep)
    public decimal? MaxValue { get; set; }           // Cap (e.g., don't exceed 5 sets)
    
    public bool RequiresAllSetsLogged { get; set; } = true;  // Requirements-gated
}

public enum ProgressionCondition
{
    AllSetsCompleted = 0,     // Все подходы выполнены (вес × повторения = план)
    RPEBelow = 1,             // Средний RPE ниже порога (e.g., < 8)
    RepsAboveTarget = 2,      // Повторения превысили план на N
    ConsecutiveSuccess = 3    // N тренировок подряд с выполнением плана
}

public enum ProgressionAction
{
    IncreaseWeight = 0,    // +2.5кг
    IncreaseReps = 1,      // +1 повторение
    IncreaseSets = 2,      // +1 подход
    DecreaseReps = 3       // -2 повторения (при увеличении веса: double progression)
}
```

### Примеры правил

```
Линейная прогрессия (StrongLifts 5×5):
  IF all 5×5 completed → weight += 2.5kg

Двойная прогрессия (Hypertrophy):
  IF reps > target by 2+ across all sets → weight += 2.5kg, reps reset to min range

RPE-based (Advanced):
  IF avg RPE < 7.5 for 2 consecutive sessions → weight += 2.5kg

Bodyweight progression:
  IF all sets completed at target reps → reps += 1 (max 15)
```

### UI: Progression Preview

В шаблоне, под каждым упражнением:
```
┌ Bench Press ── 4×8 @ 80kg ──────────────────┐
│                                               │
│  ⚡ Auto-progression: ON                      │
│  Rule: All sets completed → +2.5kg            │
│                                               │
│  Status: 2/3 consecutive successes            │
│  Progress bar: ██████░░░░                     │
│  Next increase: complete 1 more session       │
└───────────────────────────────────────────────┘
```

### Application Logic

```csharp
// Called when completing a workout from a template
public async Task ApplyProgressionRules(Guid sessionId)
{
    var session = await _sessions.FindById(sessionId);
    if (session.SourceDayId == null) return; // No template
    
    foreach (var exercise in session.Exercises.Where(e => e.SourceExerciseId != null))
    {
        var rules = await _rules.FindByExerciseId(exercise.SourceExerciseId.Value);
        
        foreach (var rule in rules)
        {
            if (!rule.RequiresAllSetsLogged || AllSetsLogged(exercise))
            {
                if (EvaluateCondition(rule, exercise, session))
                {
                    await ApplyAction(rule, exercise.SourceExerciseId.Value);
                    // Notify user: "Next time: Bench Press → 82.5kg (was 80kg)"
                }
            }
        }
    }
}
```

---

## 17. Built-in Program Templates (NEW — Boostcamp pattern)

Предзаполненные шаблоны популярных программ:

| Программа | Тип | Дней/нед | Описание |
|-----------|-----|----------|----------|
| StrongLifts 5×5 | Strength | 3 | A/B rotation, linear progression |
| Push/Pull/Legs | Hypertrophy | 6 (or 3) | Classic PPL split |
| PHUL | Hybrid | 4 | Power + Hypertrophy Upper/Lower |
| GZCLP | Strength | 3-4 | Tier system (T1/T2/T3) |
| Upper/Lower | General | 4 | Simple upper/lower split |
| Full Body 3× | Beginner | 3 | Full body, 3 days/week |

При первом запуске:
```
┌──────────────────────────────────────────────┐
│  CHOOSE A STARTING PROGRAM                    │
│  (or create your own)                         │
│                                               │
│  🏋️ StrongLifts 5×5                          │
│     Best for: Beginners | 3 days/week         │
│                                               │
│  💪 Push/Pull/Legs                            │
│     Best for: Intermediate | 3-6 days/week    │
│                                               │
│  ⚡ GZCLP                                     │
│     Best for: Intermediate | 3-4 days/week    │
│                                               │
│  📝 Create Custom                             │
│                                               │
└──────────────────────────────────────────────┘
```

---

*Next: [04-PHASE-GAMIFICATION.md](./04-PHASE-GAMIFICATION.md) — Streaks, milestones, export*
