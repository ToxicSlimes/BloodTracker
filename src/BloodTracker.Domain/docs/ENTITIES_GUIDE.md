# ENTITIES GUIDE — BloodTracker.Domain

## Архитектура доменной модели

Проект использует **Anemic Domain Model** — сущности содержат только данные, вся логика в Application слое. Хранилище — **LiteDB** (embedded NoSQL), изоляция данных — **per-user database** (`user_{userId}.db`).

## Базовый класс Entity

```csharp
public abstract class Entity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
```

Все пользовательские сущности наследуют от `Entity`. Id генерируется автоматически.

---

## Карта сущностей и связей

```
┌─────────────────────────────────────────────────────────┐
│                    PER-USER DB (user_{id}.db)           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Course ◄──── Drug ◄──── IntakeLog                     │
│    │            │            │                           │
│    │            └──── Purchase ◄─┘                      │
│    │                                                    │
│  Analysis (standalone)                                  │
│                                                         │
│  WorkoutProgram ◄── WorkoutDay ◄── WorkoutExercise     │
│                                        │                │
│                                    WorkoutSet           │
│                                                         │
│  ExerciseCatalogEntry (кэш API)                        │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│     AUTH DB (auth.db)    │  │  CATALOG DB (catalog.db) │
├──────────────────────────┤  ├──────────────────────────┤
│  AppUser                 │  │  DrugCatalogItem         │
│  AuthCode                │  │  Manufacturer            │
└──────────────────────────┘  └──────────────────────────┘
```

---

## Пользовательские сущности (наследуют Entity)

### Analysis — Результаты анализа крови
```csharp
public sealed class Analysis : Entity
{
    public required DateTime Date { get; set; }
    public required string Label { get; set; }        // Название анализа
    public string? Laboratory { get; set; }            // Лаборатория
    public string? Notes { get; set; }
    public Dictionary<string, double> Values { get; set; }  // Ключ → значение
}
```

- **Связи:** standalone, не связан с другими сущностями
- **Ключи Values:** строковые идентификаторы (`"testosterone"`, `"hdl"`, `"alt"`) — маппятся на `ReferenceRange`
- **Особенности:** поддерживает импорт из PDF через Gemini Vision API / OCR

### Course — Курс препаратов
```csharp
public sealed class Course : Entity
{
    public required string Title { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}
```

- **Связи:** `Drug.CourseId → Course.Id`
- **Бизнес-правило:** только один курс может быть `IsActive = true` (реализовано в `CourseRepository.CreateAsync`)
- **Вычисляемые поля:** `CurrentDay` и `TotalDays` рассчитываются в хэндлере, не хранятся

### Drug — Препарат
```csharp
public sealed class Drug : Entity
{
    public required string Name { get; set; }
    public required DrugType Type { get; set; }        // Oral, Injectable, Subcutaneous, Transdermal, Nasal
    public string? Dosage { get; set; }
    public string? Amount { get; set; }
    public string? Schedule { get; set; }
    public string? Notes { get; set; }
    public Guid? CourseId { get; set; }                // FK → Course
    public string? CatalogItemId { get; set; }         // FK → DrugCatalogItem (string!)
    public string? ManufacturerId { get; set; }        // FK → Manufacturer (string!)
}
```

- **Связи:** принадлежит `Course`, ссылается на `DrugCatalogItem` и `Manufacturer`
- **Каскадное удаление:** при удалении Drug удаляются связанные IntakeLog и Purchase (в хэндлере)
- **Смешанные FK:** `CourseId` — Guid, `CatalogItemId`/`ManufacturerId` — string (каталожные)

### IntakeLog — Запись о приёме
```csharp
public sealed class IntakeLog : Entity
{
    public required DateTime Date { get; set; }
    public required Guid DrugId { get; set; }          // FK → Drug
    public required string DrugName { get; set; }      // Денормализация для скорости
    public string? Dose { get; set; }
    public string? Note { get; set; }
    public Guid? PurchaseId { get; set; }              // FK → Purchase (опционально)
}
```

- **Связи:** привязан к `Drug`, опционально к `Purchase`
- **Денормализация:** `DrugName` хранится прямо в записи
- **Бизнес-правило:** нельзя превысить `Purchase.Quantity` (проверка в хэндлере)

### Purchase — Покупка препарата
```csharp
public sealed class Purchase : Entity
{
    public required Guid DrugId { get; set; }
    public required string DrugName { get; set; }      // Денормализация
    public required DateTime PurchaseDate { get; set; }
    public required int Quantity { get; set; }
    public decimal Price { get; set; }
    public string? Vendor { get; set; }
    public string? Notes { get; set; }
    public string? ManufacturerId { get; set; }
    public string? ManufacturerName { get; set; }      // Денормализация
}
```

- **Связи:** привязан к `Drug`
- **Инвентаризация:** `Quantity` vs. количество `IntakeLog` с `PurchaseId` = остаток на складе

### WorkoutProgram → WorkoutDay → WorkoutExercise → WorkoutSet

Иерархия тренировок:

```
WorkoutProgram (Title, Notes)
  └── WorkoutDay (ProgramId, DayOfWeek, Title)
        └── WorkoutExercise (ProgramId, DayId, Name, MuscleGroup)
              └── WorkoutSet (ExerciseId, Repetitions, Weight, Duration)
```

- Каждый уровень ссылается на родителя через FK
- `WorkoutExercise` хранит `ProgramId` И `DayId` (для удобства запросов)
- `MuscleGroup` enum: FullBody, Chest, Back, Shoulders, Biceps, Triceps и т.д.

---

## Каталожные сущности (без Entity, string Id)

### DrugCatalogItem — Справочник препаратов
Хранится в `catalog.db` (shared, singleton). ~80 субстанций с описаниями, дозировками, рейтингами.

Ключевые поля: `Category` (DrugCategory), `Subcategory` (DrugSubcategory), `DrugType`, `AnabolicRating`, `AndrogenicRating`, `HalfLife`, `CommonDosages`.

### Manufacturer — Производители
Хранится в `catalog.db`. Фарм и UGL производители с типом `ManufacturerType` (Pharmaceutical/UGL).

### ExerciseCatalogEntry — Каталог упражнений
Кэш внешнего API (ExerciseDB), хранится в per-user DB. Поля: `Name`, `BodyPart`, `Target`, `Equipment`, `MuscleGroup`.

---

## Сущности авторизации (auth.db)

### AppUser — Пользователь
```csharp
public sealed class AppUser
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Email { get; init; } = "";
    public string? DisplayName { get; set; }
    public string? GoogleId { get; set; }
    public bool IsAdmin { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}
```

**Не наследует Entity** — отдельная структура для auth.db.

### AuthCode — Код авторизации по email
```csharp
public sealed class AuthCode
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Email { get; init; } = "";
    public string Code { get; init; } = "";       // 6-значный код
    public DateTime ExpiresAt { get; init; }       // +10 минут
    public bool Used { get; set; }
}
```

---

## Enums

| Enum | Значения | Использование |
|------|----------|---------------|
| `DrugType` | Oral, Injectable, Subcutaneous, Transdermal, Nasal | `Drug.Type` |
| `DrugCategory` | AAS, Peptide, SARM, PCT, FatBurner, GrowthHormone, AntiEstrogen, Insulin, Prohormone, DopamineAgonist, Other | `DrugCatalogItem.Category` |
| `DrugSubcategory` | Testosterone, Nandrolone, Trenbolone, GHRP, GHRH, SERM, AromataseInhibitor и др. | `DrugCatalogItem.Subcategory` |
| `ManufacturerType` | Pharmaceutical, UGL | `Manufacturer.Type` |
| `MuscleGroup` | FullBody, Chest, Back, Shoulders, Biceps, Triceps, Forearms, Abs, Glutes, Quadriceps, Hamstrings, Calves | `WorkoutExercise.MuscleGroup` |
| `ValueStatus` | Normal, Low, SlightlyHigh, High, Pending | Результат `ReferenceRangeService.GetStatus()` |

---

## Value Objects

### ReferenceRange
```csharp
public sealed record ReferenceRange
{
    public required string Key { get; init; }     // "testosterone", "hdl"
    public required string Name { get; init; }    // "Тестостерон общий"
    public required double Min { get; init; }
    public required double Max { get; init; }
    public required string Unit { get; init; }    // "нмоль/л"
    public string? Category { get; init; }        // "Гормоны", "Липиды"
    public string? Description { get; init; }
}
```

Не хранится в БД — определяется в `ReferenceRangeService` (in-memory словарь, ~40 показателей).
