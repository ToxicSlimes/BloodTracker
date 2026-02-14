# Phase 4: Gamification & Export
> BloodTracker — Workout Diary
> Estimated effort: 1-2 дня
> Dependencies: Phase 1-2 (Phase 3 optional)
> Status: 📋 Planning

---

## Что входит в Phase 4

| # | Задача | Effort | Приоритет |
|---|--------|--------|-----------|
| 1 | Workout streak tracking | 0.25 дня | P0 |
| 2 | Weekly goal + progress bar | 0.25 дня | P0 |
| 3 | Milestones / achievements | 0.5 дня | P1 |
| 4 | PR celebration animation | 0.25 дня | P1 |
| 5 | CSV export | 0.25 дня | P1 |
| 6 | JSON backup/restore | 0.25 дня | P2 |
| 7 | Share workout summary card | 0.25 дня | P2 |

---

## 1. Workout Streak

### Логика

Streak = количество дней подряд, когда была хотя бы 1 тренировка. **Допускается 1 день отдыха** между тренировочными днями (иначе стрик ломался бы каждый rest day).

```csharp
public class StreakCalculator
{
    public int Calculate(List<DateTime> completedDates)
    {
        if (!completedDates.Any()) return 0;
        
        var dates = completedDates
            .Select(d => d.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();
        
        // Проверяем что последняя тренировка — не более 2 дней назад
        if ((DateTime.UtcNow.Date - dates.First()).Days > 2)
            return 0; // Streak broken
        
        int streak = 1;
        for (int i = 1; i < dates.Count; i++)
        {
            var gap = (dates[i - 1] - dates[i]).Days;
            if (gap <= 2) // 1 rest day allowed
                streak++;
            else
                break;
        }
        return streak;
    }
}
```

### UI — Streak Badge

В хедере Workouts page:
```
┌──────────────────────────────────────────────────────────┐
│  🔥 STREAK: 12 days                                     │
│  ████████████████████████░░░░░░  12/30 (next milestone)  │
└──────────────────────────────────────────────────────────┘
```

В Workout Summary (after completing):
```
┌──────────────────────────────────────────────────────────┐
│  🔥 Streak: 12 → 13 days!  Keep it up, warrior!         │
└──────────────────────────────────────────────────────────┘
```

### Streak Shield (Enhanced — из Fito/competitor research)

> **Loss aversion**: "Если ты уже 25 дней, нужно дотянуть до 30!" мотивирует сильнее,
> чем потеря стрика из-за болезни или запланированного отдыха.

**Механика Streak Shield:**
- По умолчанию: 1 freeze в неделю (автоматически, не нужно активировать заранее)
- При болезни/отпуске: можно вручную "заморозить" стрик на N дней (макс 7)
- Визуально: замороженные дни показываются синим льдом на timeline

```csharp
public class StreakShield
{
    public int FreezesPerWeek { get; set; } = 1;
    public int FreezesUsedThisWeek { get; set; } = 0;
    public List<DateTime> ManualFreezeDates { get; set; } = new(); // Дни ручной заморозки
    public int MaxManualFreezeDays { get; set; } = 7;              // Макс подряд

    public bool CanFreeze() => FreezesUsedThisWeek < FreezesPerWeek 
                               || ManualFreezeDates.Count < MaxManualFreezeDays;
}
```

**UI — Freeze Button:**
```
┌────────────────────────────────────────┐
│  🔥 Streak: 25 days                    │
│                                        │
│  Can't make it today?                  │
│  [❄️ FREEZE DAY] (2 left this week)    │
│                                        │
│  "A warrior rests to fight another     │
│   day. Your streak is protected."      │
└────────────────────────────────────────┘
```

---

## 2. Weekly Goal

### Model

```csharp
// In WorkoutPreferences
public int WeeklyWorkoutGoal { get; set; } = 3;
```

### Query

```csharp
public class GetWeeklyProgressQuery : IRequest<WeeklyProgressDto>
{
    public string UserId { get; set; }
}

public class WeeklyProgressDto
{
    public int Goal { get; set; }           // 3
    public int Completed { get; set; }      // 2
    public decimal Percent { get; set; }    // 66.7
    public DateTime WeekStart { get; set; } // Monday
    public string NextPlanned { get; set; } // "Wednesday — Back"
    public List<DayStatus> Days { get; set; } // Mon=✓, Tue=—, Wed=✓, Thu=—, Fri=planned, ...
}
```

### UI — Weekly Quest Card

На главной Workouts page:
```
╔═══════════════════════════════════════════════════════════╗
║  ⚔️  WEEKLY QUEST: 2/3 workouts                          ║
║  ████████████████████░░░░░░░░░░  67%                     ║
║                                                           ║
║  Mon ✓  Tue —  Wed ✓  Thu —  Fri ○  Sat —  Sun —        ║
║                                                           ║
║  Next: Friday — Ноги                                      ║
╚═══════════════════════════════════════════════════════════╝
```

States: `✓` = completed, `○` = planned (program day), `—` = rest day.

---

## 3. Milestones / Achievements

### Milestone Types

```csharp
public class Milestone
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public MilestoneType Type { get; set; }
    public DateTime AchievedAt { get; set; }
    public string? Details { get; set; }
}

public enum MilestoneType
{
    // Workout count
    FirstWorkout,          // "First Blood"
    TenWorkouts,           // "Apprentice" (10)
    TwentyFiveWorkouts,    // "Warrior" (25)
    FiftyWorkouts,         // "Veteran" (50)
    HundredWorkouts,       // "Champion" (100)
    
    // Tonnage
    TonLifted,             // "Iron Born" (1,000kg total)
    TenTonsLifted,         // "Titan" (10,000kg)
    HundredTonsLifted,     // "Colossus" (100,000kg)
    
    // Streaks
    WeekStreak,            // "Consistent" (7 days)
    MonthStreak,           // "Unstoppable" (30 days)
    
    // PRs
    FirstPR,               // "Record Breaker"
    TenPRs,                // "Record Machine" (10)
    
    // Variety
    TenExercises,          // "Explorer" (10 unique exercises)
    AllMuscleGroups,       // "Complete Warrior" (all 12 groups trained)
    
    // Special
    MidnightWorkout,       // "Night Owl" (started after midnight)
    EarlyBirdWorkout,      // "Early Bird" (started before 6am)
    HourLongWorkout,       // "Marathon" (60+ min workout)
}
```

### Achievement Cards (dungeon theme)

```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║  ⚔️  ACHIEVEMENT UNLOCKED!                        ║
║                                                   ║
║  ┌─────────────────────────────────────────────┐ ║
║  │                                             │ ║
║  │         「  IRON BORN  」                    │ ║
║  │                                             │ ║
║  │    Lifted a total of 1,000 kg               │ ║
║  │                                             │ ║
║  │    "The iron has accepted you               │ ║
║  │     as one of its own."                     │ ║
║  │                                             │ ║
║  │    Achieved: Feb 14, 2026                   │ ║
║  │                                             │ ║
║  └─────────────────────────────────────────────┘ ║
║                                                   ║
║                    [NICE!]                        ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

### Milestone Check (after each session complete)

```csharp
public async Task<List<Milestone>> CheckMilestones(string userId, WorkoutSession session)
{
    var existing = _db.GetCollection<Milestone>("milestones")
        .Query().Where(m => m.UserId == userId).ToList();
    var newMilestones = new List<Milestone>();
    
    // Total workouts
    var totalWorkouts = _db.GetCollection<WorkoutSession>("workoutSessions")
        .Count(s => s.UserId == userId && s.Status == WorkoutSessionStatus.Completed);
    
    CheckAndAdd(existing, newMilestones, userId, MilestoneType.FirstWorkout, totalWorkouts >= 1);
    CheckAndAdd(existing, newMilestones, userId, MilestoneType.TenWorkouts, totalWorkouts >= 10);
    CheckAndAdd(existing, newMilestones, userId, MilestoneType.FiftyWorkouts, totalWorkouts >= 50);
    
    // Total tonnage (all time)
    var totalTonnage = _db.GetCollection<WorkoutSession>("workoutSessions")
        .Query()
        .Where(s => s.UserId == userId && s.Status == WorkoutSessionStatus.Completed)
        .Select(s => s.TotalTonnage)
        .ToList()
        .Sum();
    
    CheckAndAdd(existing, newMilestones, userId, MilestoneType.TonLifted, totalTonnage >= 1000);
    CheckAndAdd(existing, newMilestones, userId, MilestoneType.TenTonsLifted, totalTonnage >= 10000);
    
    // Streak
    var streak = CalculateStreak(userId);
    CheckAndAdd(existing, newMilestones, userId, MilestoneType.WeekStreak, streak >= 7);
    CheckAndAdd(existing, newMilestones, userId, MilestoneType.MonthStreak, streak >= 30);
    
    // Save new milestones
    foreach (var m in newMilestones)
        _db.GetCollection<Milestone>("milestones").Insert(m);
    
    return newMilestones;
}
```

### Achievements Screen

```
╔══════════════════════════════════════════════════════════════╗
║  ACHIEVEMENTS                                       [BACK]  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌── UNLOCKED (4/16) ───────────────────────────────────┐  ║
║  │                                                       │  ║
║  │  🏆 First Blood      Completed first workout   Feb 1  │  ║
║  │  🏆 Apprentice       10 workouts              Feb 10  │  ║
║  │  🏆 Iron Born        1,000kg total tonnage     Feb 14  │  ║
║  │  🏆 Record Breaker   First personal record     Feb 7   │  ║
║  │                                                       │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌── LOCKED ────────────────────────────────────────────┐  ║
║  │                                                       │  ║
║  │  🔒 Warrior           25 workouts (15/25)             │  ║
║  │  🔒 Titan             10,000kg total (4,280/10,000)   │  ║
║  │  🔒 Consistent        7-day streak (3/7)              │  ║
║  │  🔒 Record Machine    10 PRs (4/10)                   │  ║
║  │  🔒 Explorer          10 exercises (7/10)             │  ║
║  │  🔒 Complete Warrior  All muscle groups (8/12)        │  ║
║  │  🔒 Night Owl         Workout after midnight          │  ║
║  │  ...                                                   │  ║
║  │                                                       │  ║
║  └───────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 4. PR Celebration

### CSS Animation

```css
.pr-celebration {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 200;
  animation: fadeIn 0.3s ease;
}

.pr-card {
  border: 2px solid #ffd700;
  background: #1a1a2e;
  padding: 24px;
  text-align: center;
  max-width: 320px;
  animation: prPulse 2s ease infinite;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
}

@keyframes prPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.2); }
  50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.5); }
}

.pr-card h2 {
  color: #ffd700;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.pr-card .value {
  font-size: 32px;
  color: #00ff41;
  margin: 16px 0;
}

.pr-card .improvement {
  color: #ff6b35;
  font-size: 14px;
}

.pr-card .flavor-text {
  color: #666;
  font-style: italic;
  margin-top: 16px;
  font-size: 12px;
}
```

### Flavor texts (random dungeon theme)

```typescript
const prFlavorTexts = [
  "A weapon of legend has been forged in the dungeon depths.",
  "The iron bows before your might.",
  "A new chapter written in the book of strength.",
  "The dungeon trembles at your power.",
  "Your enemies grow weaker with each rep.",
  "The ancient weights recognize a true warrior.",
  "Strength flows through your veins like molten iron.",
  "The record keepers update their scrolls in awe.",
];
```

---

## 5. CSV Export

### Endpoint
```
GET /api/workout/export/csv?fromDate=2026-01-01&toDate=2026-02-14
```

### Format
```csv
Date,Time,Exercise,MuscleGroup,Set,Weight(kg),Reps,RPE,SetType,Rest(s),Tonnage,Est1RM,Notes
2026-02-14,10:15,Жим гантелей лёжа,Chest,1,30,10,7,working,90,300,40.0,
2026-02-14,10:18,Жим гантелей лёжа,Chest,2,30,10,7,working,95,300,40.0,
2026-02-14,10:21,Жим гантелей лёжа,Chest,3,32.5,10,8,working,100,325,43.3,
2026-02-14,10:24,Жим гантелей лёжа,Chest,4,35,10,9,working,,350,46.7,PR: max weight
```

### Backend

```csharp
[HttpGet("export/csv")]
public async Task<IActionResult> ExportCsv([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
{
    var sessions = GetCompletedSessions(GetCurrentUserId(), fromDate, toDate);
    
    var sb = new StringBuilder();
    sb.AppendLine("Date,Time,Exercise,MuscleGroup,Set,Weight(kg),Reps,RPE,SetType,Rest(s),Tonnage,Est1RM,Notes");
    
    foreach (var session in sessions)
    {
        foreach (var exercise in session.Exercises)
        {
            foreach (var set in exercise.Sets.Where(s => s.CompletedAt != null))
            {
                var setType = set.IsWarmup ? "warmup" : set.IsDropSet ? "dropset" : set.IsFailure ? "failure" : "working";
                sb.AppendLine($"{session.StartedAt:yyyy-MM-dd},{session.StartedAt:HH:mm},{exercise.Name},{exercise.MuscleGroup},{set.OrderIndex},{set.ActualWeight},{set.ActualRepetitions},{set.RPE},{setType},{set.RestAfterSeconds},{set.Tonnage},{set.Estimated1RM:F1},{set.Notes}");
            }
        }
    }
    
    return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"bloodtracker-workouts-{DateTime.UtcNow:yyyy-MM-dd}.csv");
}
```

---

## 6. JSON Backup/Restore

### Export
```
GET /api/workout/export/json → full dump of all workout data
```

```json
{
  "version": "1.0",
  "exportedAt": "2026-02-14T09:30:00Z",
  "userId": "...",
  "sessions": [...],
  "personalRecords": [...],
  "exerciseHistory": [...],
  "milestones": [...],
  "preferences": {...},
  "restTimerSettings": {...}
}
```

### Import
```
POST /api/workout/import/json
```
Strategy: **skip existing by Id** (don't overwrite).

---

## 7. Share Workout Summary

### Text Card Generation

```typescript
function generateShareCard(summary: WorkoutSummary): string {
  const lines = [
    '╔══════════════════════════════════════╗',
    `║  ⚔️ WORKOUT LOG — ${formatDate(summary.date)}    ║`,
    `║  ${summary.title.padEnd(36)}║`,
    '╠══════════════════════════════════════╣',
    `║  Duration: ${formatDuration(summary.duration).padEnd(25)}║`,
    `║  Tonnage:  ${summary.tonnage.toLocaleString().padEnd(20)}kg  ║`,
    `║  Volume:   ${summary.volume.toString().padEnd(18)}reps  ║`,
  ];
  
  if (summary.prs > 0) {
    lines.push(`║  PRs:      ${summary.prs} new records! 🏆${''.padEnd(10)}║`);
  }
  
  lines.push('║                                      ║');
  
  // Top exercises
  for (const ex of summary.exercises.slice(0, 3)) {
    lines.push(`║  • ${ex.name}: ${ex.bestSet}${''.padEnd(Math.max(0, 20 - ex.bestSet.length))}║`);
  }
  
  lines.push('║                                      ║');
  
  if (summary.rating) {
    const stars = '★'.repeat(summary.rating) + '☆'.repeat(5 - summary.rating);
    lines.push(`║  Rating: ${stars}${''.padEnd(18)}║`);
  }
  
  lines.push('╚══════════════════════════════════════╝');
  lines.push('  powered by BloodTracker 🩸');
  
  return lines.join('\n');
}
```

### Share Button

В Workout Summary:
```
[SAVE & CLOSE]  [📤 SHARE]
```

Тап → navigator.share() (Web Share API) или copy to clipboard:
```typescript
async function shareWorkout(summary: WorkoutSummary) {
  const text = generateShareCard(summary);
  
  if (navigator.share) {
    await navigator.share({ title: 'Workout Log', text });
  } else {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  }
}
```

---

## Checklist для Phase 4

```
Backend:
  □ StreakCalculator service
  □ Milestone entity + CheckMilestones service
  □ GetWeeklyProgressQuery
  □ CSV export endpoint
  □ JSON export endpoint
  □ JSON import endpoint
  □ Milestone check on session complete

Frontend:
  □ Streak badge (header)
  □ Weekly quest card (workouts page)
  □ Achievement unlocked modal
  □ Achievements screen (locked/unlocked list)
  □ PR celebration with golden glow animation
  □ Flavor texts (dungeon theme)
  □ CSV download button (settings/export page)
  □ JSON backup/restore buttons
  □ Share workout summary (Web Share API + clipboard)
  □ Share card generation (ASCII art)
```

---

*Next: [05-PHASE-OFFLINE.md](./05-PHASE-OFFLINE.md) — IndexedDB, sync, conflict resolution*
