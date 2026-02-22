# Phase 1: Core (MVP)

> BloodTracker — Workout Diary
> Estimated effort: 3-4 days
> Dependencies: Existing WorkoutProgram/Day/Exercise/Set models
> Status: 📋 Planning

---

## 📋 Содержание

1. [Цели фазы](#цели-фазы)
2. [Domain Models](#domain-models)
3. [Backend: CQRS Commands](#backend-cqrs-commands)
4. [Backend: CQRS Queries](#backend-cqrs-queries)
5. [Backend: API Endpoints](#backend-api-endpoints)
6. [Frontend: UI Screens](#frontend-ui-screens)
7. [Rest Timer Logic](#rest-timer-logic)
8. [Testing Checklist](#testing-checklist)

---

## Цели фазы

**Deliverable:** Минимально работоспособная система для начала тренировки, логирования подходов, rest timer, просмотра summary.

**Что пользователь может делать:**
- ✅ Начать тренировку из существующего шаблона (WorkoutDay)
- ✅ Залогировать выполненные подходы (вес, повторения, RPE)
- ✅ Использовать таймер отдыха с авто-стартом
- ✅ Завершить тренировку и увидеть итоги (tonnage, volume, duration)
- ✅ Посмотреть историю тренировок (список)

**Новые фичи (из UX research):**
- ✅ Screen Wake Lock — экран не гаснет во время тренировки
- ✅ Session Resume Banner — "У вас есть активная тренировка" при входе
- ✅ Auto-advance to next exercise после завершения всех подходов
- ✅ Auto-fill from LAST ACTUAL (не только из шаблона!)
- ✅ "Same as Last Set" — новый подход = копия предыдущего
- ✅ Undo set (5-sec toast) — отмена последнего действия
- ✅ Rest timer Web Notification (background)
- ✅ Previous workout ghost overlay (серый текст)
- ✅ Set color coding: 🟢 побил / 🟡 повторил / 🔴 ниже прошлого
- ✅ "Copy last workout" shortcut
- ✅ Workout duration estimate перед стартом
- ✅ Workout notes from last time

**Что НЕ входит в Phase 1:**
- ❌ Графики и детальная аналитика (Phase 2)
- ❌ Personal Records detection (Phase 2)
- ❌ Per-exercise rest timer overrides (Phase 3)
- ❌ Bodyweight exercises, warmup types (Phase 3)
- ❌ Gamification, streaks (Phase 4)
- ❌ Offline PWA (Phase 5)

---

## Domain Models

### 1. WorkoutSession (Сессия тренировки)

**Назначение:** Одна реальная тренировка пользователя от начала до завершения.

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using LiteDB;

namespace BloodTracker.Domain.WorkoutDiary;

public class WorkoutSession
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    
    // Связь с программой (опционально)
    public Guid? SourceProgramId { get; set; }  // WorkoutProgram.Id
    public Guid? SourceDayId { get; set; }      // WorkoutDay.Id
    
    // Метаданные
    public string Title { get; set; }           // "Понедельник — Грудь"
    public string? Notes { get; set; }
    
    // Временные метки
    public DateTime StartedAt { get; set; }     // UTC
    public DateTime? CompletedAt { get; set; }  // UTC, null = в процессе
    public int DurationSeconds { get; set; }    // Фактическая длительность
    
    // Статус
    public WorkoutSessionStatus Status { get; set; }  // InProgress, Completed, Abandoned
    
    // Метрики (денормализация для быстрых запросов)
    public decimal TotalTonnage { get; set; }        // Σ(вес × повторения)
    public int TotalVolume { get; set; }             // Σ(повторения)
    public int TotalSetsCompleted { get; set; }
    public decimal AverageIntensity { get; set; }    // Средний вес на повторение
    public int AverageRestSeconds { get; set; }      // Среднее время отдыха
    
    // Связь с упражнениями
    public List<WorkoutSessionExercise> Exercises { get; set; } = new();
    
    // Индексы для LiteDB
    [BsonIndex]
    public DateTime CreatedAt { get; set; }
    
    [BsonIndex]
    public string UserIdIndex => UserId;
}

public enum WorkoutSessionStatus
{
    InProgress = 0,   // Тренировка идёт
    Completed = 1,    // Завершена
    Abandoned = 2     // Прервана/отменена
}
```

**Пример JSON:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "userId": "user123",
  "sourceProgramId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "sourceDayId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Понедельник — Грудь",
  "notes": null,
  "startedAt": "2026-02-14T07:15:00Z",
  "completedAt": "2026-02-14T08:00:23Z",
  "durationSeconds": 2723,
  "status": 1,
  "totalTonnage": 1820.0,
  "totalVolume": 184,
  "totalSetsCompleted": 16,
  "averageIntensity": 9.89,
  "averageRestSeconds": 95,
  "exercises": [ /* ... */ ],
  "createdAt": "2026-02-14T07:15:00Z"
}
```

---

### 2. WorkoutSessionExercise (Упражнение в сессии)

```csharp
public class WorkoutSessionExercise
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }  // FK to WorkoutSession
    
    // Связь с шаблоном (опционально)
    public Guid? SourceExerciseId { get; set; }  // WorkoutExercise.Id
    
    // Данные упражнения (денормализация для offline)
    public string Name { get; set; }             // "Жим гантелей лёжа"
    public MuscleGroup MuscleGroup { get; set; }
    public string? Notes { get; set; }           // Заметки к упражнению
    
    // Порядок в сессии
    public int OrderIndex { get; set; }
    
    // Метаданные выполнения
    public DateTime? StartedAt { get; set; }     // Время начала первого подхода
    public DateTime? CompletedAt { get; set; }   // Время завершения последнего подхода
    
    // Связь с подходами
    public List<WorkoutSessionSet> Sets { get; set; } = new();
    
    // Флаг завершения (computed property)
    public bool IsCompleted => Sets.All(s => s.CompletedAt != null);
}
```

---

### 3. WorkoutSessionSet (Подход в сессии)

```csharp
public class WorkoutSessionSet
{
    public Guid Id { get; set; }
    public Guid ExerciseId { get; set; }  // FK to WorkoutSessionExercise
    
    // Связь с шаблоном (опционально)
    public Guid? SourceSetId { get; set; }  // WorkoutSet.Id (шаблон)
    
    // Порядок
    public int OrderIndex { get; set; }  // 1, 2, 3, 4...
    
    // Запланированные значения (из шаблона)
    public decimal? PlannedWeight { get; set; }
    public int? PlannedRepetitions { get; set; }
    public int? PlannedDurationSeconds { get; set; }
    
    // Фактические значения
    public decimal? ActualWeight { get; set; }         // в пользовательских единицах (кг или lb)
    public decimal? ActualWeightKg { get; set; }       // CANONICAL: всегда в кг для сравнений/статистики
    public int? ActualRepetitions { get; set; }
    public int? ActualDurationSeconds { get; set; }    // для планки, кардио
    public int? RPE { get; set; }                      // Rate of Perceived Exertion (1-10)
    public SetType Type { get; set; } = SetType.Working;  // Working, Warmup, Failure, Drop
    public string? Notes { get; set; }
    
    // Данные из предыдущей тренировки (ghost overlay)
    public decimal? PreviousWeight { get; set; }       // Вес прошлого раза (readonly, для display)
    public int? PreviousReps { get; set; }             // Повторения прошлого раза
    
    // Временные метки
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }  // null = не выполнен
    public int? RestAfterSeconds { get; set; }  // Время отдыха ПОСЛЕ этого подхода
    
    // Вспомогательные метрики (computed properties)
    public decimal Tonnage => Type == SetType.Warmup ? 0 : (ActualWeightKg ?? 0) * (ActualRepetitions ?? 0);
    public decimal Estimated1RM => CalculateEstimated1RM();
    
    // Сравнение с прошлым разом (для color coding)
    public SetComparison CompareWithPrevious()
    {
        if (PreviousWeight == null || PreviousReps == null) return SetComparison.NoPrevious;
        if (ActualWeight == null || ActualRepetitions == null) return SetComparison.NoPrevious;
        
        var prevTonnage = PreviousWeight.Value * PreviousReps.Value;
        var currentTonnage = ActualWeight.Value * ActualRepetitions.Value;
        
        if (currentTonnage > prevTonnage) return SetComparison.Better;   // 🟢
        if (currentTonnage == prevTonnage) return SetComparison.Same;    // 🟡
        return SetComparison.Worse;                                       // 🔴
    }
    
    private decimal CalculateEstimated1RM()
    {
        if (ActualWeightKg == null || ActualRepetitions == null || ActualRepetitions == 0)
            return 0;
        if (ActualRepetitions == 1) return ActualWeightKg.Value;
        if (ActualRepetitions > 12) return 0; // Low accuracy warning
        
        // Weighted average of Epley + Brzycki (most accurate for 2-10 reps)
        var reps = (decimal)ActualRepetitions.Value;
        var weight = ActualWeightKg.Value;
        
        var epley = weight * (1 + reps / 30m);
        var brzycki = weight * 36m / (37m - reps);
        
        // Epley slightly better for squats/deadlifts, Brzycki for bench
        // Simple average as default; can be exercise-type-weighted in Phase 2
        return (epley + brzycki) / 2m;
    }
}

public enum SetType
{
    Working = 0,
    Warmup = 1,
    Failure = 2,
    Drop = 3
}

public enum SetComparison
{
    NoPrevious = 0,
    Better = 1,     // 🟢 Green
    Same = 2,       // 🟡 Yellow  
    Worse = 3       // 🔴 Red
}
```

**Пример подхода:**
```json
{
  "id": "abc123",
  "exerciseId": "def456",
  "sourceSetId": "ghi789",
  "orderIndex": 1,
  "plannedWeight": 30.0,
  "plannedRepetitions": 10,
  "plannedDurationSeconds": null,
  "actualWeight": 30.0,
  "actualRepetitions": 10,
  "actualDurationSeconds": null,
  "rpe": 7,
  "notes": null,
  "startedAt": "2026-02-14T07:20:00Z",
  "completedAt": "2026-02-14T07:21:15Z",
  "restAfterSeconds": 90
}
```

---

### 4. RestTimerSettings (Настройки таймера отдыха)

**Назначение:** Персональные настройки таймера для пользователя.

```csharp
public class RestTimerSettings
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    
    // Глобальные настройки
    public int DefaultRestSeconds { get; set; } = 90;
    public bool AutoStartTimer { get; set; } = true;
    public bool PlaySound { get; set; } = true;
    public bool Vibrate { get; set; } = true;
    public int SoundAlertBeforeEndSeconds { get; set; } = 5;  // "Скоро конец отдыха"
    
    [BsonIndex]
    public string UserIdIndex => UserId;
}
```

**Примечание:** Per-exercise и per-muscle-group overrides добавляются в Phase 3.

---

## Backend: CQRS Commands

### 1. StartWorkoutSessionCommand

**Назначение:** Начать новую тренировку из шаблона или пустую.

```csharp
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using LiteDB;
using BloodTracker.Domain.WorkoutDiary;
using BloodTracker.Domain.WorkoutPrograms;

namespace BloodTracker.Application.WorkoutDiary.Commands;

// Request DTO
public class StartWorkoutSessionCommand : IRequest<WorkoutSessionDto>
{
    public string UserId { get; set; }
    public Guid? SourceDayId { get; set; }  // WorkoutDay.Id (опционально)
    public string? CustomTitle { get; set; }
    public string? Notes { get; set; }
}

// Handler
public class StartWorkoutSessionCommandHandler : IRequestHandler<StartWorkoutSessionCommand, WorkoutSessionDto>
{
    private readonly ILiteDatabase _db;
    
    public StartWorkoutSessionCommandHandler(ILiteDatabase db)
    {
        _db = db;
    }
    
    public async Task<WorkoutSessionDto> Handle(StartWorkoutSessionCommand request, CancellationToken ct)
    {
        var sessions = _db.GetCollection<WorkoutSession>("workoutSessions");
        
        // ✅ Проверка: нет ли уже активной тренировки
        var activeSession = sessions.Query()
            .Where(s => s.UserId == request.UserId && s.Status == WorkoutSessionStatus.InProgress)
            .FirstOrDefault();
        
        if (activeSession != null)
            throw new InvalidOperationException("У вас уже есть активная тренировка");
        
        // ✅ Создаём новую сессию
        var session = new WorkoutSession
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            Status = WorkoutSessionStatus.InProgress,
            Title = request.CustomTitle ?? "Тренировка",
            Notes = request.Notes
        };
        
        // ✅ Если есть шаблон — копируем упражнения и подходы
        if (request.SourceDayId.HasValue)
        {
            var day = _db.GetCollection<WorkoutDay>("workoutDays").FindById(request.SourceDayId.Value);
            if (day == null)
                throw new NotFoundException("Программа дня не найдена");
            
            session.SourceDayId = day.Id;
            session.SourceProgramId = day.ProgramId;
            session.Title = day.Title;
            
            var exercises = _db.GetCollection<WorkoutExercise>("workoutExercises")
                .Query()
                .Where(e => e.DayId == day.Id)
                .OrderBy(e => e.OrderIndex)
                .ToList();
            
            foreach (var exercise in exercises)
            {
                var sessionExercise = new WorkoutSessionExercise
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    SourceExerciseId = exercise.Id,
                    Name = exercise.Name,
                    MuscleGroup = exercise.MuscleGroup,
                    Notes = exercise.Notes,
                    OrderIndex = exercise.OrderIndex
                };
                
                var sets = _db.GetCollection<WorkoutSet>("workoutSets")
                    .Query()
                    .Where(s => s.ExerciseId == exercise.Id)
                    .OrderBy(s => s.OrderIndex)
                    .ToList();
                
                foreach (var set in sets)
                {
                    sessionExercise.Sets.Add(new WorkoutSessionSet
                    {
                        Id = Guid.NewGuid(),
                        ExerciseId = sessionExercise.Id,
                        SourceSetId = set.Id,
                        OrderIndex = set.OrderIndex,
                        PlannedWeight = set.Weight,
                        PlannedRepetitions = set.Repetitions,
                        PlannedDurationSeconds = set.Duration
                    });
                }
                
                session.Exercises.Add(sessionExercise);
            }
        }
        
        sessions.Insert(session);
        return MapToDto(session);
    }
    
    private WorkoutSessionDto MapToDto(WorkoutSession session)
    {
        // ... mapping logic ...
        return new WorkoutSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            StartedAt = session.StartedAt,
            Status = session.Status.ToString(),
            Exercises = session.Exercises.Select(e => new WorkoutSessionExerciseDto
            {
                Id = e.Id,
                Name = e.Name,
                MuscleGroup = e.MuscleGroup.ToString(),
                Sets = e.Sets.Select(s => new WorkoutSessionSetDto
                {
                    Id = s.Id,
                    OrderIndex = s.OrderIndex,
                    PlannedWeight = s.PlannedWeight,
                    PlannedRepetitions = s.PlannedRepetitions,
                    ActualWeight = s.ActualWeight,
                    ActualRepetitions = s.ActualRepetitions,
                    RPE = s.RPE,
                    CompletedAt = s.CompletedAt
                }).ToList()
            }).ToList()
        };
    }
}
```

**Validation:**
- ✅ UserId обязателен
- ✅ Только одна активная тренировка за раз
- ✅ SourceDayId должен существовать (если указан)

**Side Effects:**
- Создаётся WorkoutSession в LiteDB
- Если есть шаблон → копируются упражнения и подходы

---

### 2. CompleteSetCommand

**Назначение:** Зафиксировать выполнение подхода.

```csharp
public class CompleteSetCommand : IRequest<WorkoutSessionSetDto>
{
    public string UserId { get; set; }
    public Guid SessionId { get; set; }
    public Guid SetId { get; set; }
    
    // Фактические значения
    public decimal? Weight { get; set; }
    public int? Repetitions { get; set; }
    public int? DurationSeconds { get; set; }
    public int? RPE { get; set; }
    public string? Notes { get; set; }
}

public class CompleteSetCommandHandler : IRequestHandler<CompleteSetCommand, WorkoutSessionSetDto>
{
    private readonly ILiteDatabase _db;
    
    public CompleteSetCommandHandler(ILiteDatabase db)
    {
        _db = db;
    }
    
    public async Task<WorkoutSessionSetDto> Handle(CompleteSetCommand request, CancellationToken ct)
    {
        var sessions = _db.GetCollection<WorkoutSession>("workoutSessions");
        var session = sessions.FindById(request.SessionId);
        
        // ✅ Валидация
        if (session == null || session.UserId != request.UserId)
            throw new NotFoundException("Сессия не найдена");
        
        if (session.Status != WorkoutSessionStatus.InProgress)
            throw new InvalidOperationException("Тренировка уже завершена");
        
        // ✅ Находим подход
        var exercise = session.Exercises.FirstOrDefault(e => e.Sets.Any(s => s.Id == request.SetId));
        if (exercise == null)
            throw new NotFoundException("Подход не найден");
        
        var set = exercise.Sets.First(s => s.Id == request.SetId);
        var previousSet = exercise.Sets
            .Where(s => s.OrderIndex < set.OrderIndex && s.CompletedAt != null)
            .OrderByDescending(s => s.OrderIndex)
            .FirstOrDefault();
        
        // ✅ Фиксируем время выполнения
        var now = DateTime.UtcNow;
        set.CompletedAt = now;
        set.ActualWeight = request.Weight;
        set.ActualRepetitions = request.Repetitions;
        set.ActualDurationSeconds = request.DurationSeconds;
        set.RPE = request.RPE;
        set.Notes = request.Notes;
        
        if (!set.StartedAt.HasValue)
            set.StartedAt = now;
        
        // ✅ Рассчитываем время отдыха от предыдущего подхода
        if (previousSet?.CompletedAt != null)
        {
            var restSeconds = (int)(now - previousSet.CompletedAt.Value).TotalSeconds;
            previousSet.RestAfterSeconds = restSeconds;
        }
        
        // ✅ Обновляем метаданные упражнения
        if (!exercise.StartedAt.HasValue)
            exercise.StartedAt = now;
        
        if (exercise.Sets.All(s => s.CompletedAt != null))
            exercise.CompletedAt = now;
        
        sessions.Update(session);
        
        return MapSetToDto(set);
    }
}
```

**Validation:**
- ✅ Weight OR Repetitions OR DurationSeconds обязательны (хотя бы одно)
- ✅ RPE должен быть 1-10 (если указан)
- ✅ Session должна быть InProgress

**Side Effects:**
- Обновляется WorkoutSessionSet.CompletedAt, ActualWeight, ActualRepetitions, RPE
- Рассчитывается RestAfterSeconds для предыдущего подхода
- Обновляется Exercise.StartedAt / CompletedAt

---

### 3. CompleteWorkoutSessionCommand

**Назначение:** Завершить тренировку и рассчитать итоговые метрики.

```csharp
public class CompleteWorkoutSessionCommand : IRequest<WorkoutSessionSummaryDto>
{
    public string UserId { get; set; }
    public Guid SessionId { get; set; }
    public string? Notes { get; set; }
}

public class CompleteWorkoutSessionCommandHandler : IRequestHandler<CompleteWorkoutSessionCommand, WorkoutSessionSummaryDto>
{
    private readonly ILiteDatabase _db;
    
    public CompleteWorkoutSessionCommandHandler(ILiteDatabase db)
    {
        _db = db;
    }
    
    public async Task<WorkoutSessionSummaryDto> Handle(CompleteWorkoutSessionCommand request, CancellationToken ct)
    {
        var sessions = _db.GetCollection<WorkoutSession>("workoutSessions");
        var session = sessions.FindById(request.SessionId);
        
        if (session == null || session.UserId != request.UserId)
            throw new NotFoundException("Сессия не найдена");
        
        if (session.Status != WorkoutSessionStatus.InProgress)
            throw new InvalidOperationException("Тренировка уже завершена");
        
        var now = DateTime.UtcNow;
        session.CompletedAt = now;
        session.Status = WorkoutSessionStatus.Completed;
        session.DurationSeconds = (int)(now - session.StartedAt).TotalSeconds;
        
        if (!string.IsNullOrEmpty(request.Notes))
            session.Notes = (session.Notes ?? "") + "\n" + request.Notes;
        
        // ✅ Рассчитываем метрики
        var allSets = session.Exercises.SelectMany(e => e.Sets).Where(s => s.CompletedAt != null).ToList();
        
        session.TotalSetsCompleted = allSets.Count;
        session.TotalTonnage = allSets.Sum(s => s.Tonnage);
        session.TotalVolume = allSets.Sum(s => s.ActualRepetitions ?? 0);
        
        var totalWeightedReps = allSets
            .Where(s => s.ActualWeight.HasValue && s.ActualRepetitions.HasValue)
            .Sum(s => s.ActualWeight.Value * s.ActualRepetitions.Value);
        
        session.AverageIntensity = session.TotalVolume > 0 
            ? totalWeightedReps / session.TotalVolume 
            : 0;
        
        var restTimes = session.Exercises
            .SelectMany(e => e.Sets)
            .Where(s => s.RestAfterSeconds.HasValue)
            .Select(s => s.RestAfterSeconds.Value)
            .ToList();
        
        session.AverageRestSeconds = restTimes.Any() 
            ? (int)restTimes.Average() 
            : 0;
        
        sessions.Update(session);
        
        return new WorkoutSessionSummaryDto
        {
            Session = MapToDto(session),
            // Comparison будет в Phase 2
        };
    }
}
```

**Calculation Logic:**
```csharp
TotalTonnage = Σ(set.ActualWeight × set.ActualRepetitions)
TotalVolume  = Σ(set.ActualRepetitions)
AverageIntensity = TotalTonnage / TotalVolume  (кг на повтор)
AverageRestSeconds = AVG(set.RestAfterSeconds)
```

---

### 4. AbandonWorkoutSessionCommand

**Назначение:** Отменить/прервать тренировку.

```csharp
public class AbandonWorkoutSessionCommand : IRequest<Unit>
{
    public string UserId { get; set; }
    public Guid SessionId { get; set; }
}

public class AbandonWorkoutSessionCommandHandler : IRequestHandler<AbandonWorkoutSessionCommand, Unit>
{
    private readonly ILiteDatabase _db;
    
    public AbandonWorkoutSessionCommandHandler(ILiteDatabase db)
    {
        _db = db;
    }
    
    public async Task<Unit> Handle(AbandonWorkoutSessionCommand request, CancellationToken ct)
    {
        var sessions = _db.GetCollection<WorkoutSession>("workoutSessions");
        var session = sessions.FindById(request.SessionId);
        
        if (session == null || session.UserId != request.UserId)
            throw new NotFoundException("Сессия не найдена");
        
        session.Status = WorkoutSessionStatus.Abandoned;
        session.CompletedAt = DateTime.UtcNow;
        
        sessions.Update(session);
        return Unit.Value;
    }
}
```

---

## Backend: CQRS Queries

### 1. GetActiveWorkoutSessionQuery

**Назначение:** Получить текущую активную тренировку пользователя.

```csharp
public class GetActiveWorkoutSessionQuery : IRequest<WorkoutSessionDto?>
{
    public string UserId { get; set; }
}

public class GetActiveWorkoutSessionQueryHandler : IRequestHandler<GetActiveWorkoutSessionQuery, WorkoutSessionDto?>
{
    private readonly ILiteDatabase _db;
    
    public GetActiveWorkoutSessionQueryHandler(ILiteDatabase db)
    {
        _db = db;
    }
    
    public async Task<WorkoutSessionDto?> Handle(GetActiveWorkoutSessionQuery request, CancellationToken ct)
    {
        var sessions = _db.GetCollection<WorkoutSession>("workoutSessions");
        var session = sessions.Query()
            .Where(s => s.UserId == request.UserId && s.Status == WorkoutSessionStatus.InProgress)
            .FirstOrDefault();
        
        return session != null ? MapToDto(session) : null;
    }
}
```

**Response:**
- `null` если нет активной тренировки
- `WorkoutSessionDto` если есть активная (с упражнениями и подходами)

---

### 2. GetWorkoutSessionHistoryQuery

**Назначение:** Получить историю тренировок с пагинацией.

```csharp
public class GetWorkoutSessionHistoryQuery : IRequest<PagedResult<WorkoutSessionDto>>
{
    public string UserId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetWorkoutSessionHistoryQueryHandler : IRequestHandler<GetWorkoutSessionHistoryQuery, PagedResult<WorkoutSessionDto>>
{
    private readonly ILiteDatabase _db;
    
    public GetWorkoutSessionHistoryQueryHandler(ILiteDatabase db)
    {
        _db = db;
    }
    
    public async Task<PagedResult<WorkoutSessionDto>> Handle(GetWorkoutSessionHistoryQuery request, CancellationToken ct)
    {
        var sessions = _db.GetCollection<WorkoutSession>("workoutSessions");
        var query = sessions.Query()
            .Where(s => s.UserId == request.UserId && s.Status == WorkoutSessionStatus.Completed);
        
        if (request.FromDate.HasValue)
            query = query.Where(s => s.StartedAt >= request.FromDate.Value);
        
        if (request.ToDate.HasValue)
            query = query.Where(s => s.StartedAt <= request.ToDate.Value);
        
        var total = query.Count();
        var items = query
            .OrderByDescending(s => s.StartedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Limit(request.PageSize)
            .ToList();
        
        return new PagedResult<WorkoutSessionDto>
        {
            Items = items.Select(MapToDto).ToList(),
            Total = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
```

---

### 3. GetRestTimerSettingsQuery

**Назначение:** Получить настройки таймера отдыха.

```csharp
public class GetRestTimerSettingsQuery : IRequest<RestTimerSettingsDto>
{
    public string UserId { get; set; }
}

public class GetRestTimerSettingsQueryHandler : IRequestHandler<GetRestTimerSettingsQuery, RestTimerSettingsDto>
{
    private readonly ILiteDatabase _db;
    
    public GetRestTimerSettingsQueryHandler(ILiteDatabase db)
    {
        _db = db;
    }
    
    public async Task<RestTimerSettingsDto> Handle(GetRestTimerSettingsQuery request, CancellationToken ct)
    {
        var collection = _db.GetCollection<RestTimerSettings>("restTimerSettings");
        var settings = collection.Query().Where(s => s.UserId == request.UserId).FirstOrDefault();
        
        if (settings == null)
        {
            // Создаём дефолтные настройки
            settings = new RestTimerSettings
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId
            };
            collection.Insert(settings);
        }
        
        return new RestTimerSettingsDto
        {
            DefaultRestSeconds = settings.DefaultRestSeconds,
            AutoStartTimer = settings.AutoStartTimer,
            PlaySound = settings.PlaySound,
            Vibrate = settings.Vibrate,
            SoundAlertBeforeEndSeconds = settings.SoundAlertBeforeEndSeconds
        };
    }
}
```

---

## Backend: API Endpoints

### WorkoutSessionController

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using System;
using System.Threading.Tasks;

namespace BloodTracker.API.Controllers;

[Authorize]
[ApiController]
[Route("api/workout")]
public class WorkoutSessionController : ControllerBase
{
    private readonly IMediator _mediator;
    
    public WorkoutSessionController(IMediator mediator)
    {
        _mediator = mediator;
    }
    
    private string GetCurrentUserId() => User.FindFirst("sub")?.Value 
        ?? throw new UnauthorizedAccessException();
    
    /// <summary>
    /// Начать новую тренировку из шаблона
    /// </summary>
    /// <remarks>
    /// POST /api/workout/session/start
    /// {
    ///   "sourceDayId": "550e8400-e29b-41d4-a716-446655440000",
    ///   "customTitle": null,
    ///   "notes": null
    /// }
    /// </remarks>
    [HttpPost("session/start")]
    public async Task<ActionResult<WorkoutSessionDto>> StartWorkoutSession([FromBody] StartWorkoutSessionRequest request)
    {
        var command = new StartWorkoutSessionCommand
        {
            UserId = GetCurrentUserId(),
            SourceDayId = request.SourceDayId,
            CustomTitle = request.CustomTitle,
            Notes = request.Notes
        };
        
        var result = await _mediator.Send(command);
        return Ok(result);
    }
    
    /// <summary>
    /// Получить текущую активную тренировку
    /// </summary>
    /// <remarks>
    /// GET /api/workout/session/active
    /// Returns 200 with session DTO or 200 with null if no active session
    /// </remarks>
    [HttpGet("session/active")]
    public async Task<ActionResult<WorkoutSessionDto?>> GetActiveSession()
    {
        var query = new GetActiveWorkoutSessionQuery { UserId = GetCurrentUserId() };
        var result = await _mediator.Send(query);
        return Ok(result);
    }
    
    /// <summary>
    /// Завершить тренировку
    /// </summary>
    /// <remarks>
    /// POST /api/workout/session/{sessionId}/complete
    /// {
    ///   "notes": "Отличная тренировка!"
    /// }
    /// </remarks>
    [HttpPost("session/{sessionId}/complete")]
    public async Task<ActionResult<WorkoutSessionSummaryDto>> CompleteSession(Guid sessionId, [FromBody] CompleteSessionRequest request)
    {
        var command = new CompleteWorkoutSessionCommand
        {
            UserId = GetCurrentUserId(),
            SessionId = sessionId,
            Notes = request.Notes
        };
        
        var result = await _mediator.Send(command);
        return Ok(result);
    }
    
    /// <summary>
    /// Отменить тренировку
    /// </summary>
    /// <remarks>
    /// POST /api/workout/session/{sessionId}/abandon
    /// </remarks>
    [HttpPost("session/{sessionId}/abandon")]
    public async Task<IActionResult> AbandonSession(Guid sessionId)
    {
        var command = new AbandonWorkoutSessionCommand
        {
            UserId = GetCurrentUserId(),
            SessionId = sessionId
        };
        
        await _mediator.Send(command);
        return NoContent();
    }
    
    /// <summary>
    /// Получить историю тренировок
    /// </summary>
    /// <remarks>
    /// GET /api/workout/session/history?page=1&pageSize=20&fromDate=2026-01-01
    /// </remarks>
    [HttpGet("session/history")]
    public async Task<ActionResult<PagedResult<WorkoutSessionDto>>> GetHistory([FromQuery] GetHistoryRequest request)
    {
        var query = new GetWorkoutSessionHistoryQuery
        {
            UserId = GetCurrentUserId(),
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            Page = request.Page,
            PageSize = request.PageSize
        };
        
        var result = await _mediator.Send(query);
        return Ok(result);
    }
    
    /// <summary>
    /// Зафиксировать выполнение подхода
    /// </summary>
    /// <remarks>
    /// POST /api/workout/set/{setId}/complete
    /// {
    ///   "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    ///   "weight": 30.0,
    ///   "repetitions": 10,
    ///   "rpe": 7,
    ///   "notes": null
    /// }
    /// </remarks>
    [HttpPost("set/{setId}/complete")]
    public async Task<ActionResult<WorkoutSessionSetDto>> CompleteSet(Guid setId, [FromBody] CompleteSetRequest request)
    {
        var command = new CompleteSetCommand
        {
            UserId = GetCurrentUserId(),
            SessionId = request.SessionId,
            SetId = setId,
            Weight = request.Weight,
            Repetitions = request.Repetitions,
            DurationSeconds = request.DurationSeconds,
            RPE = request.RPE,
            Notes = request.Notes
        };
        
        var result = await _mediator.Send(command);
        return Ok(result);
    }
    
    /// <summary>
    /// Получить настройки таймера отдыха
    /// </summary>
    /// <remarks>
    /// GET /api/workout/settings/rest-timer
    /// </remarks>
    [HttpGet("settings/rest-timer")]
    public async Task<ActionResult<RestTimerSettingsDto>> GetRestTimerSettings()
    {
        var query = new GetRestTimerSettingsQuery { UserId = GetCurrentUserId() };
        var result = await _mediator.Send(query);
        return Ok(result);
    }
}
```

---

## Frontend: UI Screens

### 1. Workout Programs Screen (изменения)

**Изменения:** Добавляем кнопки `[▶ НАЧАТЬ ТРЕНИРОВКУ]` для каждого дня программы.

```
╔═══════════════════════════════════════════════════════════════╗
║  WORKOUT PROGRAMS                                    [BACK] ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ▼ Моя программа — Фитнес                                    ║
║                                                               ║
║    ┌─────────────────────────────────────────────────────┐   ║
║    │ ПОНЕДЕЛЬНИК — Грудь                                 │   ║
║    │ 4 упражнения · 16 подходов                          │   ║
║    │ [▶ НАЧАТЬ ТРЕНИРОВКУ]  [EDIT]                       │   ║
║    └─────────────────────────────────────────────────────┘   ║
║                                                               ║
║    ┌─────────────────────────────────────────────────────┐   ║
║    │ СРЕДА — Спина                                       │   ║
║    │ 5 упражнений · 18 подходов                          │   ║
║    │ [▶ НАЧАТЬ ТРЕНИРОВКУ]  [EDIT]                       │   ║
║    └─────────────────────────────────────────────────────┘   ║
║                                                               ║
║    ┌─────────────────────────────────────────────────────┐   ║
║    │ ПЯТНИЦА — Ноги                                      │   ║
║    │ 4 упражнения · 16 подходов                          │   ║
║    │ [▶ НАЧАТЬ ТРЕНИРОВКУ]  [EDIT]                       │   ║
║    └─────────────────────────────────────────────────────┘   ║
║                                                               ║
║  [+ NEW PROGRAM]                                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Interaction Flow:**

```
User taps [▶ НАЧАТЬ ТРЕНИРОВКУ]
  ↓
Check if active session exists
  GET /api/workout/session/active
  ↓
IF active session exists:
  → Show dialog:
     "У вас уже есть активная тренировка.
      Хотите продолжить её или начать новую?"
     [ПРОДОЛЖИТЬ] [НАЧАТЬ НОВУЮ] [ОТМЕНА]
     
     [ПРОДОЛЖИТЬ] → Navigate to Active Workout Screen
     [НАЧАТЬ НОВУЮ] → Abandon current session → Start new
     [ОТМЕНА] → Close dialog
ELSE:
  → POST /api/workout/session/start { sourceDayId: <dayId> }
    ↓
  → Navigate to Active Workout Screen
```

**Error States:**

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️ Ошибка                                                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Не удалось начать тренировку.                                ║
║  Проверьте подключение к интернету и повторите попытку.       ║
║                                                               ║
║  [ПОВТОРИТЬ] [ОТМЕНА]                                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Loading State:**

```
╔═══════════════════════════════════════════════════════════════╗
║  WORKOUT PROGRAMS                                    [BACK] ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ⏳ Загружаем тренировку...                                   ║
║                                                               ║
║  [████████████████░░░░░░░░] 75%                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### 2. Active Workout Screen (НОВЫЙ — главный экран)

**Назначение:** Логирование подходов в реальном времени, таймер отдыха, прогресс.

```
╔═══════════════════════════════════════════════════════════════╗
║  ПОНЕДЕЛЬНИК — Грудь                        [FINISH] [CANCEL] ║
╠═══════════════════════════════════════════════════════════════╣
║  ⏱ 00:23:14    │  Completed: 8/16 sets    │  Tonnage: 1,240kg║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ▼ Жим гантелей лёжа (Chest) — 4/4 ✓                         ║
║    ┌─────────────────────────────────────────────────────┐   ║
║    │ Set 1:  30kg × 10  ✓  RPE: 7  Rest: 90s             │   ║
║    │ Set 2:  30kg × 10  ✓  RPE: 7  Rest: 95s             │   ║
║    │ Set 3:  32.5kg × 10  ✓  RPE: 8  Rest: 100s          │   ║
║    │ Set 4:  35kg × 10  ✓  RPE: 9  Rest: —               │   ║
║    └─────────────────────────────────────────────────────┘   ║
║                                                               ║
║  ▼ Жим штанги на наклонной скамье (Chest) — 2/4              ║
║    ┌─────────────────────────────────────────────────────┐   ║
║    │ Set 1:  60kg × 12  ✓  RPE: 7  Rest: 110s            │   ║
║    │ Set 2:  60kg × 10  ✓  RPE: 8  Rest: ⏱ 00:42         │   ║
║    │ Set 3:  60kg × 10  [ LOG SET ]  ← АКТИВНЫЙ          │   ║
║    │ Set 4:  65kg × 8   [ ... ]                           │   ║
║    └─────────────────────────────────────────────────────┘   ║
║                                                               ║
║  ▶ Разведение гантелей (Chest) — 0/3                         ║
║  ▶ Отжимания на брусьях (Chest, Triceps) — 0/3               ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  REST TIMER:  🔴 00:42 / 90s                                  ║
║  [PAUSE] [SKIP] [+30s] [-15s]                                 ║
╚═══════════════════════════════════════════════════════════════╝
```

**Компоненты:**

#### Header
- Название тренировки (из WorkoutDay.Title)
- `[FINISH]` → открывает Workout Summary Screen
- `[CANCEL]` → диалог "Отменить тренировку? Данные не сохранятся" → `AbandonWorkoutSessionCommand`

#### Progress Bar
- Таймер общий (с момента старта, обновляется каждую секунду)
- Прогресс подходов `8/16`
- Текущий тоннаж (live update при каждом завершённом подходе)

#### Exercise List
- Каждое упражнение — collapsible блок
- ✓ = все подходы выполнены
- Свёрнутые упражнения показывают `▶`, развёрнутые `▼`

#### Set Logging
- Активный подход (следующий невыполненный) выделен
- Кнопка `[ LOG SET ]` → открывает **Quick Set Logger Modal**

#### Rest Timer (внизу)
- Показывается ТОЛЬКО если таймер запущен
- Красный фон (`🔴`) когда осталось < 5 сек
- Звуковой сигнал + вибрация в конце (если enabled в настройках)
- Кнопки управления:
  - `[PAUSE]` — пауза/возобновление
  - `[SKIP]` — пропустить отдых
  - `[+30s]` — добавить 30 сек
  - `[-15s]` — убрать 15 сек

**Interaction Flow: Log Set**

```
User taps [ LOG SET ]
  ↓
Open Quick Set Logger Modal
  (prefilled with PlannedWeight/PlannedRepetitions)
  ↓
User enters: Weight 60kg, Reps 10, RPE 8
  ↓
User taps [✓ COMPLETE SET]
  ↓
OPTIMISTIC UPDATE:
  - Update local state (set.actualWeight = 60, etc.)
  - UI rerenders immediately (set shows as ✓)
  - Close modal
  ↓
API CALL (background):
  POST /api/workout/set/{setId}/complete
  ↓
IF online:
  → Success: Update from server response
  → Error: Revert optimistic update, show error toast
IF offline:
  → Add to offline queue (Phase 5)
  ↓
START REST TIMER (if AutoStart = true):
  - GET /api/workout/settings/rest-timer
  - Start timer with DefaultRestSeconds (90s)
  - Show REST TIMER section
```

**Error States:**

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️ Не удалось сохранить подход                              ║
╠═══════════════════════════════════════════════════════════════╣
║  Проверьте подключение к интернету.                           ║
║  Данные будут синхронизированы позже.                         ║
║                                                               ║
║  [ОК]                                                         ║
╚═══════════════════════════════════════════════════════════════╝
```

**Empty State:** (если нет упражнений в сессии)

```
╔═══════════════════════════════════════════════════════════════╗
║  ПУСТАЯ ТРЕНИРОВКА                          [FINISH] [CANCEL] ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║             ┌───────────────────────────┐                     ║
║             │                           │                     ║
║             │    🏋️ No exercises yet    │                     ║
║             │                           │                     ║
║             │  Add exercises to your    │                     ║
║             │  program to start         │                     ║
║             │  tracking workouts!       │                     ║
║             │                           │                     ║
║             └───────────────────────────┘                     ║
║                                                               ║
║  [CANCEL WORKOUT]                                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### 3. Quick Set Logger Modal (НОВЫЙ — ключевой UX)

**Назначение:** Молниеносная фиксация подхода за 3-5 секунд.

```
╔═══════════════════════════════════════════════════════════════╗
║  LOG SET — Жим штанги на наклонной скамье                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Set 3 of 4                                                   ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  PLANNED:     60kg × 10                                 │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Weight (kg):  [   60.0   ]  [+2.5] [+5] [-2.5]         │ ║
║  │  Reps:         [    10    ]  [+1] [+2] [-1]             │ ║
║  │  RPE (1-10):   [●●●●●●●○○○]  (6)                        │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  Notes: [optional text...]                                    ║
║                                                               ║
║  [✓ COMPLETE SET]                  [CANCEL]                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Логика:**

1. **Auto-fill:** Поля заполняются PlannedWeight/PlannedRepetitions из шаблона
2. **Quick buttons:** `[+2.5]`, `[+5]`, `[+1]`, `[+2]` для быстрого изменения веса/повторений
3. **RPE slider:** Тач-френдли слайдер 1-10 (визуальный индикатор)
4. **Keyboard behavior:** Numpad остаётся открытым при переходе между Weight и Reps

**При нажатии `[✓ COMPLETE SET]`:**

```typescript
async function completeSet(setId: string, data: CompleteSetData) {
  // 1. Оптимистичное обновление UI
  updateLocalState(setId, data);
  closeModal();
  
  // 2. Отправляем запрос
  try {
    await apiClient.post(`/api/workout/set/${setId}/complete`, data);
  } catch (error) {
    // Ошибка — показать toast, но UI уже обновлён
    showToast('Не удалось сохранить подход. Будет синхронизировано позже.');
  }
  
  // 3. Запускаем таймер отдыха
  const restSeconds = await getRestSeconds(); // GET /api/workout/settings/rest-timer
  if (restSettings.autoStartTimer) {
    restTimer.start(restSeconds);
  }
}
```

**Accessibility:**

- Touch targets min 44px для кнопок `[+2.5]`, `[+1]` и т.д.
- RPE slider с step=1, aria-label="Rate of Perceived Exertion"
- Auto-focus на Weight field при открытии модалки
- Enter key на Reps field → focus на RPE slider
- Escape key → Cancel

---

### 4. Workout Summary Screen (НОВЫЙ)

**Назначение:** Показать результаты после завершения тренировки.

```
╔═══════════════════════════════════════════════════════════════╗
║  WORKOUT SUMMARY — Понедельник (Грудь)              [CLOSE]  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ⏱ Duration: 45m 23s        Started: 10:15 — Finished: 11:00 ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  TOTAL TONNAGE:       1,820 kg                          │ ║
║  │  TOTAL VOLUME:         184 reps                         │ ║
║  │  SETS COMPLETED:       16/16  (100%)                    │ ║
║  │  AVG INTENSITY:        9.9 kg/rep                       │ ║
║  │  AVG REST TIME:        95 seconds                       │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  BY EXERCISE:                                                 ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Жим гантелей лёжа:       4 sets · 680 kg · 40 reps    │ ║
║  │  Жим штанги на наклонной: 4 sets · 620 kg · 42 reps    │ ║
║  │  Разведение гантелей:     3 sets · 270 kg · 36 reps    │ ║
║  │  Отжимания на брусьях:    5 sets · 250 kg · 66 reps    │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  Notes: [Add notes about today's workout...]                  ║
║                                                               ║
║  [SAVE & CLOSE]                                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Interaction Flow:**

```
User taps [FINISH] on Active Workout Screen
  ↓
POST /api/workout/session/{sessionId}/complete
  { notes: "Отличная тренировка!" }
  ↓
Server calculates:
  - TotalTonnage, TotalVolume, DurationSeconds
  - AverageIntensity, AverageRestSeconds
  ↓
Returns WorkoutSessionSummaryDto
  ↓
Render Workout Summary Screen
  ↓
User taps [SAVE & CLOSE]
  ↓
Navigate to Workout Diary (History) Screen
```

**Metrics Display:**

- **Total Tonnage:** `Σ(set.weight × set.reps)` для всех подходов
- **Total Volume:** `Σ(set.reps)` для всех подходов
- **Sets Completed:** `<completed>/<total>  (<percent>%)`
- **Avg Intensity:** `Tonnage / Volume` (средний вес на повтор)
- **Avg Rest Time:** `AVG(set.restAfterSeconds)`

**By Exercise Breakdown:**

```
Жим гантелей лёжа:
  Sets: 4
  Tonnage: 30×10 + 30×10 + 32.5×10 + 35×10 = 1,275 kg (ошибка в примере выше, исправлю)
  Volume: 10+10+10+10 = 40 reps
```

---

### 5. Workout Diary (History) Screen (НОВЫЙ)

**Назначение:** Список всех прошлых тренировок.

```
╔═══════════════════════════════════════════════════════════════╗
║  WORKOUT DIARY                                       [BACK]  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Feb 14, 2026 · Mon · 11:00                             │ ║
║  │  ПОНЕДЕЛЬНИК — Грудь                                    │ ║
║  │  45m 23s · 1,820kg · 184 reps · 16 sets                 │ ║
║  │  [VIEW DETAILS]                                         │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Feb 12, 2026 · Sat · 10:30                             │ ║
║  │  ПЯТНИЦА — Ноги                                         │ ║
║  │  52m 10s · 2,340kg · 156 reps · 16 sets                 │ ║
║  │  [VIEW DETAILS]                                         │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Feb 10, 2026 · Thu · 19:15                             │ ║
║  │  СРЕДА — Спина                                          │ ║
║  │  48m 05s · 1,920kg · 172 reps · 18 sets                 │ ║
║  │  [VIEW DETAILS]                                         │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  [LOAD MORE]                                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Interaction Flow:**

```
GET /api/workout/session/history?page=1&pageSize=20
  ↓
Returns PagedResult<WorkoutSessionDto>
  { items: [...], total: 45, page: 1, pageSize: 20 }
  ↓
Render list
  ↓
User scrolls to bottom
  ↓
[LOAD MORE] button appears
  ↓
User taps [LOAD MORE]
  ↓
GET /api/workout/session/history?page=2&pageSize=20
  ↓
Append items to list
```

**Empty State:**

```
╔═══════════════════════════════════════════════════════════════╗
║  WORKOUT DIARY                                       [BACK]  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║             ┌───────────────────────────┐                     ║
║             │                           │                     ║
║             │    📓 No workouts yet     │                     ║
║             │                           │                     ║
║             │  Start your first         │                     ║
║             │  workout to track         │                     ║
║             │  your progress!           │                     ║
║             │                           │                     ║
║             └───────────────────────────┘                     ║
║                                                               ║
║  [GO TO PROGRAMS]                                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Rest Timer Logic

### 1. Запуск таймера

**Триггер:** Сразу после фиксации подхода (`CompleteSetCommand` завершён).

```typescript
// frontend/src/features/workout/restTimer.ts

class RestTimerManager {
  private state: RestTimerState | null = null;
  private intervalId: number | null = null;
  
  async start(durationSeconds: number) {
    // Останавливаем предыдущий таймер если был
    this.stop();
    
    this.state = {
      status: 'running',
      durationSeconds,
      remainingSeconds: durationSeconds,
      startedAt: Date.now()
    };
    
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.render();
  }
  
  tick() {
    if (!this.state || this.state.status !== 'running') return;
    
    const elapsed = Math.floor((Date.now() - this.state.startedAt) / 1000);
    this.state.remainingSeconds = Math.max(0, this.state.durationSeconds - elapsed);
    
    // Alert за 5 секунд до конца
    if (this.state.remainingSeconds === 5) {
      this.playSound('alert');
    }
    
    // Завершение таймера
    if (this.state.remainingSeconds === 0) {
      this.complete();
    }
    
    this.render();
  }
  
  complete() {
    if (!this.state) return;
    
    this.state.status = 'completed';
    clearInterval(this.intervalId!);
    this.intervalId = null;
    
    // Звук + вибрация
    this.playSound('complete');
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    
    this.render();
    
    // Скрываем таймер через 2 секунды
    setTimeout(() => this.stop(), 2000);
  }
  
  playSound(type: 'alert' | 'complete') {
    const audio = new Audio(`/sounds/timer-${type}.mp3`);
    audio.play().catch(() => {
      // Игнорируем ошибки (может быть заблокировано браузером)
    });
  }
  
  render() {
    eventBus.emit('restTimer:update', this.state);
  }
}

export const restTimer = new RestTimerManager();
```

### 2. UI Component

```typescript
// frontend/src/features/workout/components/RestTimerBar.ts

class RestTimerBar {
  constructor() {
    eventBus.on('restTimer:update', (state) => this.update(state));
  }
  
  update(state: RestTimerState | null) {
    const timerEl = document.getElementById('rest-timer');
    
    if (!state) {
      timerEl.style.display = 'none';
      return;
    }
    
    timerEl.style.display = 'block';
    
    const minutes = Math.floor(state.remainingSeconds / 60);
    const seconds = state.remainingSeconds % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Красный фон если < 5 секунд
    timerEl.classList.toggle('alert', state.remainingSeconds < 5);
    
    timerEl.querySelector('.time').textContent = timeStr;
    timerEl.querySelector('.duration').textContent = `${state.durationSeconds}s`;
    
    // Кнопки управления
    timerEl.querySelector('.pause-btn').onclick = () => restTimer.pause();
    timerEl.querySelector('.skip-btn').onclick = () => restTimer.skip();
    timerEl.querySelector('.add-30-btn').onclick = () => restTimer.addTime(30);
    timerEl.querySelector('.sub-15-btn').onclick = () => restTimer.addTime(-15);
  }
}
```

**HTML:**
```html
<div id="rest-timer" class="rest-timer" style="display: none;">
  <div class="rest-timer__header">
    REST TIMER: <span class="time">00:00</span> / <span class="duration">90s</span>
  </div>
  <div class="rest-timer__controls">
    <button class="pause-btn">PAUSE</button>
    <button class="skip-btn">SKIP</button>
    <button class="add-30-btn">+30s</button>
    <button class="sub-15-btn">-15s</button>
  </div>
</div>
```

**CSS:**
```css
.rest-timer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border-top: 2px solid #00ff00;
  padding: 12px;
  z-index: 1000;
}

.rest-timer.alert {
  background: #ff0000;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.rest-timer__header {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 8px;
  color: #00ff00;
}

.rest-timer.alert .rest-timer__header {
  color: #ffffff;
}

.rest-timer__controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.rest-timer__controls button {
  min-height: 44px;
  min-width: 70px;
  padding: 8px 12px;
  background: #2a2a2a;
  color: #00ff00;
  border: 1px solid #00ff00;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  touch-action: manipulation;
}

.rest-timer__controls button:hover {
  background: #00ff00;
  color: #000000;
}
```

---

## Testing Checklist

### Backend Tests

**StartWorkoutSessionCommandHandler:**
- [ ] ✅ Создаёт WorkoutSession с корректными полями
- [ ] ✅ Копирует упражнения из WorkoutDay (если SourceDayId указан)
- [ ] ✅ Копирует подходы из WorkoutSet для каждого упражнения
- [ ] ✅ Проверка: нельзя создать вторую активную тренировку
- [ ] ✅ Проверка: NotFoundException если SourceDayId не найден

**CompleteSetCommandHandler:**
- [ ] ✅ Обновляет ActualWeight, ActualRepetitions, RPE, CompletedAt
- [ ] ✅ Рассчитывает RestAfterSeconds для предыдущего подхода
- [ ] ✅ Обновляет Exercise.StartedAt при первом подходе
- [ ] ✅ Обновляет Exercise.CompletedAt когда все подходы выполнены
- [ ] ✅ Проверка: нельзя залогировать подход для завершённой сессии
- [ ] ✅ Проверка: NotFoundException если Session/Set не найдены

**CompleteWorkoutSessionCommandHandler:**
- [ ] ✅ Устанавливает CompletedAt, DurationSeconds, Status = Completed
- [ ] ✅ Рассчитывает TotalTonnage, TotalVolume, TotalSetsCompleted
- [ ] ✅ Рассчитывает AverageIntensity, AverageRestSeconds
- [ ] ✅ Проверка: нельзя завершить уже завершённую сессию

**AbandonWorkoutSessionCommandHandler:**
- [ ] ✅ Устанавливает Status = Abandoned, CompletedAt

**GetActiveWorkoutSessionQuery:**
- [ ] ✅ Возвращает активную сессию если есть
- [ ] ✅ Возвращает null если нет активной сессии
- [ ] ✅ Возвращает только сессии UserId пользователя

**GetWorkoutSessionHistoryQuery:**
- [ ] ✅ Возвращает только Completed сессии
- [ ] ✅ Пагинация работает корректно (Page, PageSize, Total)
- [ ] ✅ Фильтрация по FromDate, ToDate работает
- [ ] ✅ Сортировка по StartedAt DESC

---

### Frontend Tests

**Active Workout Screen:**
- [ ] ✅ Отображает список упражнений и подходов
- [ ] ✅ Кнопка [LOG SET] открывает Quick Set Logger Modal
- [ ] ✅ Завершённые подходы показывают ✓ и фактические значения
- [ ] ✅ Progress bar обновляется при логировании подходов
- [ ] ✅ Tonnage обновляется в реальном времени
- [ ] ✅ Кнопка [FINISH] вызывает CompleteWorkoutSessionCommand
- [ ] ✅ Кнопка [CANCEL] показывает confirmation dialog

**Quick Set Logger Modal:**
- [ ] ✅ Автозаполнение PlannedWeight/PlannedRepetitions
- [ ] ✅ Quick buttons [+2.5], [+5], [+1], [+2] работают
- [ ] ✅ RPE slider работает (1-10)
- [ ] ✅ Кнопка [✓ COMPLETE SET] вызывает CompleteSetCommand
- [ ] ✅ Optimistic UI update (UI обновляется до ответа сервера)
- [ ] ✅ Keyboard остаётся открытым при переходе Weight → Reps
- [ ] ✅ Escape key закрывает модалку

**Rest Timer:**
- [ ] ✅ Запускается автоматически после логирования подхода (если AutoStart = true)
- [ ] ✅ Обратный отсчёт работает корректно (тик каждую секунду)
- [ ] ✅ Красный фон когда < 5 сек
- [ ] ✅ Звук + вибрация при завершении (если enabled)
- [ ] ✅ Кнопки PAUSE, SKIP, +30s, -15s работают
- [ ] ✅ Timer скрывается через 2 сек после завершения

**Workout Summary Screen:**
- [ ] ✅ Отображает все метрики (Tonnage, Volume, Sets, Intensity, Rest)
- [ ] ✅ Breakdown по упражнениям корректен
- [ ] ✅ Кнопка [SAVE & CLOSE] закрывает экран и переходит к History

**Workout Diary (History) Screen:**
- [ ] ✅ Отображает список тренировок
- [ ] ✅ Пагинация работает ([LOAD MORE])
- [ ] ✅ Empty state показывается если нет тренировок

---

### Integration Tests

- [ ] ✅ Полный флоу: Start → Log sets → Rest timer → Finish → View history
- [ ] ✅ Optimistic updates работают корректно (сетевые задержки)
- [ ] ✅ Error handling: сеть пропала во время логирования подхода
- [ ] ✅ Двойное нажатие на [✓ COMPLETE SET] не создаёт дубликаты

---

---

## Предрассчитанные агрегаты (Summary Tables)

> **Источник:** Market research — при 1000+ тренировках прямые расчёты из raw sets тормозят.
> Закладываем с Phase 1 чтобы не переписывать потом.

### DailyExerciseStats (обновляется при CompleteWorkoutSession)

```csharp
public class DailyExerciseStats
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string ExerciseName { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public DateTime Date { get; set; }              // Date only (UTC)
    
    // Агрегаты
    public decimal BestE1RM { get; set; }           // Лучший estimated 1RM за день
    public decimal MaxWeight { get; set; }           // Максимальный вес
    public int MaxReps { get; set; }                 // Максимальные повторения (для данного веса)
    public decimal TotalVolume { get; set; }         // Σ(weight × reps) за день
    public int TotalSets { get; set; }               // Количество рабочих подходов
    public int TotalReps { get; set; }               // Σ(reps)
    public decimal? AverageRPE { get; set; }         // Средний RPE за день
    
    [BsonIndex] public string UserExerciseDateKey => $"{UserId}_{ExerciseName}_{Date:yyyy-MM-dd}";
}
```

### WeeklyUserStats (обновляется при CompleteWorkoutSession)

```csharp
public class WeeklyUserStats
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public int Year { get; set; }
    public int WeekNumber { get; set; }             // ISO 8601 week
    
    public int SessionsCount { get; set; }
    public int TotalDurationSeconds { get; set; }
    public decimal TotalVolume { get; set; }         // Σ всех tonnage за неделю
    public int TotalSets { get; set; }
    public decimal AverageSessionDurationMin { get; set; }
    
    [BsonIndex] public string UserWeekKey => $"{UserId}_{Year}_{WeekNumber}";
}
```

### WeeklyMuscleVolume (обновляется при CompleteWorkoutSession)

```csharp
public class WeeklyMuscleVolume
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public int Year { get; set; }
    public int WeekNumber { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    
    public int TotalSets { get; set; }              // Рабочие подходы
    public decimal TotalVolume { get; set; }         // Σ(weight × reps)
    
    [BsonIndex] public string UserWeekMuscleKey => $"{UserId}_{Year}_{WeekNumber}_{(int)MuscleGroup}";
}
```

### UserExercisePR (обновляется ТОЛЬКО при новом рекорде)

```csharp
public class UserExercisePR
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string ExerciseName { get; set; }
    
    // Виды PR
    public decimal? BestWeight { get; set; }         // Максимальный вес (любые reps)
    public DateTime? BestWeightDate { get; set; }
    public decimal? BestE1RM { get; set; }           // Лучший estimated 1RM
    public DateTime? BestE1RMDate { get; set; }
    public decimal? BestVolumeSingleSession { get; set; }  // Макс tonnage за тренировку
    public DateTime? BestVolumeDate { get; set; }
    
    // Rep PRs per weight bracket (e.g., "80kg: best = 10 reps")
    // Stored as JSON dict: { "80.0": { "reps": 10, "date": "2026-02-14" } }
    public Dictionary<string, RepPREntry> RepPRsByWeight { get; set; } = new();
    
    [BsonIndex] public string UserExerciseKey => $"{UserId}_{ExerciseName}";
}

public class RepPREntry
{
    public int Reps { get; set; }
    public DateTime Date { get; set; }
}
```

**Логика обновления** (в CompleteWorkoutSessionCommandHandler):
```csharp
// После завершения тренировки:
// 1. Upsert DailyExerciseStats для каждого упражнения
// 2. Upsert WeeklyUserStats для текущей недели
// 3. Upsert WeeklyMuscleVolume для каждой мышечной группы
// 4. Check & update UserExercisePR (только если новый рекорд)
```

---

## Screen Wake Lock (критично для gym use)

```typescript
// ---- Wake Lock Manager ----
// Экран НЕ ДОЛЖЕН гаснуть во время активной тренировки!

class WakeLockManager {
    private wakeLock: WakeLockSentinel | null = null;
    
    async acquire(): Promise<void> {
        if (!('wakeLock' in navigator)) return;
        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => {
                console.log('[WakeLock] Released');
            });
        } catch (err) {
            console.warn('[WakeLock] Failed:', err);
        }
    }
    
    release(): void {
        this.wakeLock?.release();
        this.wakeLock = null;
    }
    
    // Wake lock отпускается при сворачивании app
    // При возврате — re-acquire
    setupVisibilityHandler(hasActiveWorkout: () => boolean): void {
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && hasActiveWorkout()) {
                await this.acquire();
            }
        });
    }
}

// Использование:
// startWorkout() → wakeLockManager.acquire()
// finishWorkout() → wakeLockManager.release()
```

---

## Session Resume Banner

При входе на страницу тренировок, если есть InProgress сессия:

```
┌─────────────────────────────────────────────────┐
│  ⚡ Active workout: "Monday - Chest" (23 min)   │
│  [RESUME]                        [ABANDON]       │
└─────────────────────────────────────────────────┘
```

**Логика:**
```typescript
// При загрузке workouts page
const active = await api.getActiveWorkoutSession();
if (active) {
    showResumeBanner(active);
}
```

---

## "Copy Last Workout" Quick Start

Помимо "Start from Template", добавить кнопку:

```
┌──────────────────────────────────────┐
│  QUICK START                          │
│                                       │
│  [📋 From Template]   [🔄 Repeat Last] │
│                                       │
│  [✏️ Empty Workout]                    │
└──────────────────────────────────────┘
```

**"Repeat Last"** = копирует упражнения и подходы из последней завершённой тренировки.
Подставляет ФАКТИЧЕСКИЕ значения (не плановые из шаблона).

---

## Rest Timer: Web Notification API

```typescript
// При завершении таймера, если app в background:
async function notifyTimerComplete(exerciseName: string): Promise<void> {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
    
    if (Notification.permission === 'granted') {
        new Notification('Rest Complete', {
            body: `Time to do ${exerciseName}!`,
            icon: '/icons/timer-192.png',
            tag: 'rest-timer',    // Replace previous notification
            requireInteraction: false,
            silent: false
        });
    }
}
```

---

## Undo Set Toast

```
┌─────────────────────────────────────────┐
│  ✓ Set logged: 80kg × 10 @ RPE 8       │
│                              [UNDO]  5s │
└─────────────────────────────────────────┘
```

5 секунд. Если UNDO нажат → откатить (удалить подход из сессии, вернуть UI).
Если 5 сек прошло → финализировать.

---

## Estimated Effort Breakdown (Updated)

| Задача | Время |
|--------|-------|
| Domain models (C# + summary tables) | 3 часа |
| CQRS Commands handlers | 4 часа |
| CQRS Queries handlers + aggregates | 3 часа |
| API Controllers | 2 часа |
| Frontend: Active Workout Screen + ghost overlay + set colors | 8 часов |
| Frontend: Quick Set Logger (+ Same as Last Set, Undo) | 5 часов |
| Frontend: Rest Timer logic + Web Notification | 5 часов |
| Frontend: Workout Summary Screen | 3 часа |
| Frontend: History Screen + Resume Banner | 4 часа |
| Frontend: Screen Wake Lock | 1 час |
| Frontend: Copy Last Workout + Duration Estimate | 2 часа |
| UI changes: Programs screen (Start button) | 1 час |
| Backend tests | 4 часа |
| Frontend tests | 4 часа |
| Integration testing | 3 часа |
| Bug fixes & polish | 4 часа |
| **TOTAL** | **56 часов** ≈ **4-5 дней** при 12ч/день |

---

## Готово!

После завершения Phase 1 пользователь сможет:

✅ Начать тренировку из шаблона, повторить последнюю или создать пустую  
✅ Видеть предыдущие результаты серым (ghost overlay)  
✅ Залогировать подход за 1-3 тапа (Same as Last Set)  
✅ Видеть цветовое сравнение (🟢/🟡/🔴) с прошлым разом  
✅ Отменить случайный лог (undo toast, 5 сек)  
✅ Использовать таймер отдыха с авто-стартом + notification в background  
✅ Экран не гаснет во время тренировки (Wake Lock)  
✅ Вернуться к активной тренировке после прерывания (Resume Banner)  
✅ Завершить тренировку и увидеть итоги (с авто-обновлением агрегатов)  
✅ Посмотреть историю всех тренировок  

**Следующая фаза:** [02-PHASE-ANALYTICS.md](./02-PHASE-ANALYTICS.md) — графики, PR detection, "What to beat" hints, сравнения.

---

**Автор:** BloodTracker Team  
**Дата:** 2026-02-14  
**Версия:** 2.0 (Updated with UX Research insights)
